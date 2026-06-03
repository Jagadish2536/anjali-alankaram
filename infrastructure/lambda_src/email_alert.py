"""
AWS Lambda — HTML Email Alert via AWS SES
Triggered by SNS → sends a clean HTML email to jagadishvarma99@gmail.com

Requirements:
  - Lambda execution role must have: ses:SendEmail permission
  - Sender domain (anjalialankaram.com) must be SES-verified (already done via ses.tf)
"""

import json
import os
import boto3
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SES_CLIENT      = boto3.client("ses", region_name="ap-south-2")
FROM_EMAIL      = "alerts@anjalialankaram.com"
TO_EMAIL        = "jagadishvarma99@gmail.com"
SITE_NAME       = "Anjali Alankaram"
SITE_URL        = "https://anjalialankaram.com"
AWS_CONSOLE_URL = "https://ap-south-2.console.aws.amazon.com/cloudwatch/home?region=ap-south-2#alarmsV2:"

# ── Alarm metadata: maps alarm name fragment → human-readable info ────────────
ALARM_META = {
    "TIER2-URGENT-cpu-critical": {
        "title":  "🔴 URGENT: CPU Critical",
        "color":  "#DC2626",
        "bg":     "#FEF2F2",
        "badge":  "CRITICAL",
        "badge_color": "#DC2626",
        "what":   "Backend CPU exceeded <strong>80%</strong> for 5 consecutive minutes.",
        "action": "Upgrade to Tier 2 immediately. Go to ECS → backend-service → Update service → increase task count to 4.",
    },
    "TIER2-WARNING-cpu-high": {
        "title":  "🟡 Warning: CPU High",
        "color":  "#D97706",
        "bg":     "#FFFBEB",
        "badge":  "WARNING",
        "badge_color": "#D97706",
        "what":   "Backend CPU exceeded <strong>60%</strong> for 10 consecutive minutes.",
        "action": "Monitor closely. If traffic continues rising, consider upgrading to Tier 2 (2,000 users/month plan).",
    },
    "db-connections-high": {
        "title":  "🔴 DB Connections High",
        "color":  "#DC2626",
        "bg":     "#FEF2F2",
        "badge":  "CRITICAL",
        "badge_color": "#DC2626",
        "what":   "Database connections exceeded <strong>150 out of ~200 max</strong>.",
        "action": "Check for connection leaks in ECS logs. Consider upgrading DB instance or adding pgBouncer pooling.",
    },
    "db-storage-low": {
        "title":  "⚠️ DB Storage Nearly Full",
        "color":  "#D97706",
        "bg":     "#FFFBEB",
        "badge":  "WARNING",
        "badge_color": "#D97706",
        "what":   "Database free storage dropped below <strong>6 GB</strong> (80% of 30 GB used).",
        "action": "Go to RDS → Modify → increase storage. AWS will auto-scale but verify it worked.",
    },
    "alb-5xx-errors": {
        "title":  "🔴 Website Errors Detected",
        "color":  "#DC2626",
        "bg":     "#FEF2F2",
        "badge":  "CRITICAL",
        "badge_color": "#DC2626",
        "what":   "More than <strong>10 HTTP 5XX errors</strong> in 5 minutes — customers are seeing errors.",
        "action": "Go to ECS → backend-service → Logs → check for crashes. Restart service if needed.",
    },
    "ecs-tasks-below-minimum": {
        "title":  "🔴 Site May Be Down",
        "color":  "#DC2626",
        "bg":     "#FEF2F2",
        "badge":  "CRITICAL",
        "badge_color": "#DC2626",
        "what":   "Running backend tasks dropped below <strong>2</strong>. The site may be slow or unreachable.",
        "action": "Go to ECS → anjali-alankaram-cluster → backend-service → check task status and deployment events.",
    },
    "memory-high": {
        "title":  "🟡 Memory Pressure",
        "color":  "#D97706",
        "bg":     "#FFFBEB",
        "badge":  "WARNING",
        "badge_color": "#D97706",
        "what":   "Backend memory exceeded <strong>80%</strong> for 5 consecutive minutes.",
        "action": "Auto-scaling may already be adding tasks. Check ECS service events. If persistent, consider upgrading task size.",
    },
}

DEFAULT_META = {
    "title":  "ℹ️ Infrastructure Alert",
    "color":  "#6B7280",
    "bg":     "#F9FAFB",
    "badge":  "INFO",
    "badge_color": "#6B7280",
    "what":   "An infrastructure alert was triggered.",
    "action": "Check the AWS CloudWatch console for details.",
}


def get_meta(alarm_name: str) -> dict:
    for key, meta in ALARM_META.items():
        if key in alarm_name:
            return meta
    return DEFAULT_META


def format_time(raw: str) -> str:
    """Convert ISO time to IST readable format."""
    try:
        dt = datetime.strptime(raw[:19], "%Y-%m-%dT%H:%M:%S")
        # UTC+5:30
        from datetime import timedelta
        dt_ist = dt + timedelta(hours=5, minutes=30)
        return dt_ist.strftime("%d %b %Y, %I:%M %p IST")
    except Exception:
        return raw


def build_html(alarm_name: str, state: str, reason: str, time_str: str, meta: dict) -> str:
    is_ok = state == "OK"
    if is_ok:
        title       = "✅ Alert Resolved"
        header_bg   = "#16A34A"
        badge_text  = "RESOLVED"
        badge_color = "#16A34A"
        what_text   = f"The alarm <strong>{alarm_name}</strong> has returned to normal."
        action_text = "No action needed. Everything is back to normal 🎉"
    else:
        title       = meta["title"]
        header_bg   = meta["color"]
        badge_text  = meta["badge"]
        badge_color = meta["badge_color"]
        what_text   = meta["what"]
        action_text = meta["action"]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:{header_bg};padding:28px 32px;">
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">{SITE_NAME} · AWS Infrastructure</p>
            <h1 style="margin:8px 0 0;color:#FFFFFF;font-size:24px;font-weight:700;">{title}</h1>
          </td>
        </tr>

        <!-- Badge + Time row -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="display:inline-block;background:{badge_color};color:#FFF;font-size:11px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:100px;">{badge_text}</span>
                </td>
                <td align="right">
                  <span style="color:#6B7280;font-size:12px;">{time_str}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:16px 32px 0;"><hr style="border:none;border-top:1px solid #E5E7EB;margin:0;"/></td></tr>

        <!-- What happened -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;">WHAT HAPPENED</p>
            <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;">{what_text}</p>
          </td>
        </tr>

        <!-- Alarm details card -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table cellpadding="0" cellspacing="8" width="100%">
                    <tr>
                      <td style="font-size:12px;color:#6B7280;font-weight:600;white-space:nowrap;padding-bottom:10px;">ALARM</td>
                      <td style="font-size:13px;color:#111827;font-family:monospace;padding-bottom:10px;">{alarm_name}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6B7280;font-weight:600;white-space:nowrap;padding-bottom:10px;">STATUS</td>
                      <td style="font-size:13px;color:#111827;font-weight:700;padding-bottom:10px;">{state}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6B7280;font-weight:600;white-space:nowrap;vertical-align:top;">REASON</td>
                      <td style="font-size:13px;color:#374151;line-height:1.5;">{reason}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What to do -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1D4ED8;">WHAT TO DO</p>
                  <p style="margin:0;font-size:14px;color:#1E40AF;line-height:1.6;">{action_text}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding:24px 32px;">
            <a href="{AWS_CONSOLE_URL}" style="display:inline-block;background:#1D4ED8;color:#FFFFFF;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">
              Open CloudWatch Console →
            </a>
            &nbsp;
            <a href="{SITE_URL}" style="display:inline-block;background:#F3F4F6;color:#374151;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;border:1px solid #D1D5DB;">
              Check Website
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              Sent by AWS CloudWatch · {SITE_NAME} · Region: ap-south-2 (Hyderabad)<br/>
              <a href="{SITE_URL}" style="color:#6B7280;">{SITE_URL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""


def handler(event, context):
    for record in event.get("Records", []):
        try:
            sns_message = json.loads(record["Sns"]["Message"])
            alarm_name  = sns_message.get("AlarmName", "Unknown Alarm")
            state       = sns_message.get("NewStateValue", "UNKNOWN")
            reason      = sns_message.get("NewStateReason", "No reason provided.")
            raw_time    = sns_message.get("StateChangeTime", "")
            time_str    = format_time(raw_time)
            meta        = get_meta(alarm_name)

            subject = f"[{'RESOLVED' if state == 'OK' else meta['badge']}] {meta['title'] if state != 'OK' else 'Alert Resolved'} — {SITE_NAME}"
            html    = build_html(alarm_name, state, reason, time_str, meta)

            SES_CLIENT.send_email(
                Source      = FROM_EMAIL,
                Destination = {"ToAddresses": [TO_EMAIL]},
                Message     = {
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body":    {"Html": {"Data": html, "Charset": "UTF-8"}},
                },
            )
            logger.info(f"Email sent for alarm: {alarm_name} | state: {state}")

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    return {"statusCode": 200, "body": "Email alerts sent"}
