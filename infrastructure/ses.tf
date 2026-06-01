# ---------------------------------------------------------
# AWS SES Domain Identity & Route53 Records
# ---------------------------------------------------------

resource "aws_ses_domain_identity" "main" {
  count  = var.domain_name != "" ? 1 : 0
  domain = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = module.alb.route53_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.main[0].verification_token]
}

resource "aws_ses_domain_dkim" "main" {
  count  = var.domain_name != "" ? 1 : 0
  domain = aws_ses_domain_identity.main[0].domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = var.domain_name != "" ? 3 : 0
  zone_id = module.alb.route53_zone_id
  name    = "${element(aws_ses_domain_dkim.main[0].dkim_tokens, count.index)}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = "600"
  records = ["${element(aws_ses_domain_dkim.main[0].dkim_tokens, count.index)}.dkim.amazonses.com"]
}

# -- SPF: Authorize AWS SES to send email on behalf of the domain --
resource "aws_route53_record" "spf" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = module.alb.route53_zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = "600"
  records = ["v=spf1 include:amazonses.com ~all"]
}

# -- DMARC: Policy for email authentication failures --
resource "aws_route53_record" "dmarc" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = module.alb.route53_zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = "600"
  records = ["v=DMARC1; p=none; rua=mailto:jagadishvarma99@gmail.com; ruf=mailto:jagadishvarma99@gmail.com; fo=1"]
}
