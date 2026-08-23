# ---------------------------------------------------------
# CloudFront CDN with AWS WAF Protection
# ---------------------------------------------------------

# --- CloudFront Function to Inject Edge Security Headers ---
resource "aws_cloudfront_function" "security_headers" {
  name    = "${var.project_name}-security-headers"
  runtime = "cloudfront-js-1.0"
  comment = "Injects HSTS, CSP, and security headers at the edge"
  publish = true
  code    = <<EOF
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    // Strict Transport Security (HSTS)
    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubDomains; preload' };
    
    // XSS Protection
    headers['x-xss-protection'] = { value: '1; mode=block' };
    
    // Prevent Clickjacking
    headers['x-frame-options'] = { value: 'SAMEORIGIN' };
    
    // Content Type Options
    headers['x-content-type-options'] = { value: 'nosniff' };
    
    // Referrer Policy
    headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };

    headers['content-security-policy'] = {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; img-src 'self' data: https://*.cloudfront.net https://*.s3.ap-south-2.amazonaws.com https://*.s3.amazonaws.com https://*.amazonaws.com https://*.googleusercontent.com; connect-src 'self' https: wss: https://*.execute-api.ap-south-2.amazonaws.com https://*.amazonaws.com https://api.openai.com https://checkout.razorpay.com https://*.razorpay.com https://www.google-analytics.com https://accounts.google.com https://*.googleapis.com; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://accounts.google.com; media-src 'self' https://*.s3.ap-south-2.amazonaws.com https://*.s3.amazonaws.com https://*.amazonaws.com https://*.cloudfront.net; object-src 'none';"
    };

    return response;
}
EOF
}

# --- AWS WAFv2 WebACL to Protect CDN Edge ---
resource "aws_wafv2_web_acl" "cdn" {
  count       = var.enable_waf ? 1 : 0
  name        = "${var.project_name}-cdn-waf"
  description = "Edge protection for CloudFront distribution"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 1: IP Rate Limiting (max 300 requests per 5 minutes per IP)
  rule {
    name     = "IPRateLimit"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 300
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "IPRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: SQL Injection Protection (AWS Managed Rule)
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Common Attacks (AWS Managed Rule Set)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "AnjaliAlankaramCdnWaf"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

# --- CloudFront Distribution ---
resource "aws_cloudfront_distribution" "cdn" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Anjali Alankaram Global E-commerce CDN"
  web_acl_id      = var.enable_waf ? aws_wafv2_web_acl.cdn[0].arn : null
  price_class     = "PriceClass_100" # ap-south-2/ap-south-1 Edge Nodes only — optimized for cost

  # Origin 1: Direct Fargate Task / HTTP API Gateway (Option B - $0 ALB Charge)
  origin {
    domain_name = var.enable_alb ? module.alb[0].alb_dns_name : "ec2-16-112-226-0.ap-south-2.compute.amazonaws.com"
    origin_id   = "ALB-Origin"

    custom_origin_config {
      http_port                = var.enable_alb ? 80 : 4000
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }
  }

  # Origin 2: S3 Assets Bucket (Direct path)
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-Assets-Origin"
  }

  # Origin 3: ALB Origin
  origin {
    domain_name = module.alb[0].alb_dns_name
    origin_id   = "API-Gateway-Origin"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }
  }

  # Default Cache Behavior: Route to Application Load Balancer / Frontend
  default_cache_behavior {
    target_origin_id       = "ALB-Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    # Forward headers/cookies to ALB for auth & session persistence
    forwarded_values {
      query_string = true
      headers      = ["Host", "Origin", "Authorization"]

      cookies {
        forward = "all"
      }
    }

    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # Cache Behavior: API Endpoints (/api/*) -> Route directly to ALB or API Gateway
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = var.enable_alb ? "ALB-Origin" : "API-Gateway-Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      headers      = var.enable_alb ? ["Host", "Origin", "Authorization", "Content-Type", "Accept"] : ["Origin", "Authorization", "Content-Type", "Accept"]

      cookies {
        forward = "all"
      }
    }
  }

  # Cache Behavior: S3 Saree Images (/products/*.*)
  ordered_cache_behavior {
    path_pattern           = "/products/*.*"
    target_origin_id       = "S3-Assets-Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    # Cache aggressively at edge (1 Year TTL, Brotli/Gzip)
    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 31536000 # 1 year

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }
  }

  # Cache Behavior: Temp AI Images (/temp-ai-images/*)
  ordered_cache_behavior {
    path_pattern           = "/temp-ai-images/*"
    target_origin_id       = "S3-Assets-Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    # Cache for 24 hours only (since they expire fast)
    min_ttl     = 0
    default_ttl = 43200 # 12 hours
    max_ttl     = 86400 # 24 hours

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }
  }

  # Cache Behavior: S3 Videos (/videos/*)
  ordered_cache_behavior {
    path_pattern           = "/videos/*"
    target_origin_id       = "S3-Assets-Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 31536000 # 1 year

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }
  }

  aliases = var.domain_name != "" ? [var.domain_name, "www.${var.domain_name}", "api.${var.domain_name}"] : []

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.domain_name != "" ? aws_acm_certificate.cloudfront[0].arn : null
    ssl_support_method             = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version       = var.domain_name != "" ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.domain_name == "" ? true : false
  }

  tags = local.common_tags
}

# --- ACM SSL Certificate for CloudFront CDN (Must be in us-east-1) ---
resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["*.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cloudfront_cert_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.cloudfront[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  count                   = var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.cloudfront[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation : record.fqdn]
}

output "cloudfront_distribution_url" {
  value = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}
