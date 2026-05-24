"""
AWS Lambda — WhatsApp Alert via CallMeBot API
Triggered by SNS → sends WhatsApp message to +91 7032492775

One-time setup required by user (see README in this file):
  1. Save +34 644 59 88 44 in your WhatsApp contacts as "CallMeBot"
  2. Send this message to that number: "I allow callmebot to send me messages"
  3. You'll receive your APIKEY in reply
  4. Set CALLMEBOT_APIKEY in Lambda environment variables (or Secrets Manager)
"""

import json
import os
import urllib.request
import urllib.parse
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

WHATSAPP_NUMBER = "917032492775"  # Jagadish Varma — country code 91 + number
CALLMEBOT_API   = "https://api.callmebot.com/whatsapp.php"


def handler(event, context):
    """
    Receives SNS notification from CloudWatch Alarm and
    forwards it as a WhatsApp message via CallMeBot API.
    """
    api_key = os.environ.get("CALLMEBOT_APIKEY", "")
    if not api_key:
        logger.error("CALLMEBOT_APIKEY environment variable not set")
        return {"statusCode": 500, "body": "API key missing"}

    for record in event.get("Records", []):
        try:
            sns_message = json.loads(record["Sns"]["Message"])
            alarm_name  = sns_message.get("AlarmName", "Unknown Alarm")
            state       = sns_message.get("NewStateValue", "UNKNOWN")
            reason      = sns_message.get("NewStateReason", "No reason provided")
            region      = sns_message.get("Region", "ap-south-2")

            # Build clean WhatsApp message
            emoji = "🔴" if state == "ALARM" else "✅"
            message = (
                f"{emoji} ANJALI ALANKARAM ALERT\n"
                f"Alarm: {alarm_name}\n"
                f"Status: {state}\n"
                f"Reason: {reason}\n"
                f"Region: {region}\n"
                f"Time: {sns_message.get('StateChangeTime', 'N/A')}"
            )

            # Send WhatsApp via CallMeBot
            params = urllib.parse.urlencode({
                "phone":   WHATSAPP_NUMBER,
                "text":    message,
                "apikey":  api_key,
            })
            url = f"{CALLMEBOT_API}?{params}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read().decode()
                logger.info(f"CallMeBot response: {response.status} {body}")

        except Exception as e:
            logger.error(f"Error processing SNS record: {e}")
            # Don't raise — let other records process even if one fails

    return {"statusCode": 200, "body": "Alerts sent"}
