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

    // Content Security Policy (CSP)
    headers['content-security-policy'] = {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.cloudfront.net https://*.amazonaws.com; connect-src 'self' https://api.openai.com https://checkout.razorpay.com https://www.google-analytics.com; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com;"
    };

    return response;
}
EOF
}

# --- AWS WAFv2 WebACL to Protect CDN Edge ---
resource "aws_wafv2_web_acl" "cdn" {
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
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Anjali Alankaram Global E-commerce CDN"
  web_acl_id          = aws_wafv2_web_acl.cdn.arn
  price_class         = "PriceClass_100" # ap-south-2/ap-south-1 Edge Nodes only — optimized for cost

  # Origin 1: Application Load Balancer (for Web app and REST API)
  origin {
    domain_name = module.alb.alb_dns_name
    origin_id   = "ALB-Origin"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = var.domain_name != "" ? "https-only" : "http-only"
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

  # Default Cache Behavior: Route to Application Load Balancer
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

  # Cache Behavior: S3 Saree Images (/products/*)
  ordered_cache_behavior {
    path_pattern           = "/products/*"
    target_origin_id       = "S3-Assets-Origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    # Cache aggressively at edge (1 Year TTL, Brotli/Gzip)
    min_ttl                = 0
    default_ttl            = 86400    # 1 day
    max_ttl                = 31536000 # 1 year

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
    min_ttl                = 0
    default_ttl            = 43200    # 12 hours
    max_ttl                = 86400    # 24 hours

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

output "cloudfront_distribution_url" {
  value = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}
