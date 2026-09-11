const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const ses = new SESClient({ region: process.env.TARGET_REGION || process.env.AWS_REGION || 'ap-south-2' });


exports.handler = async (event) => {
  console.log('Received SNS event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const snsMessage = record.Sns.Message;
    let alarmData;

    try {
      alarmData = JSON.parse(snsMessage);
    } catch (e) {
      console.log('Message is not JSON, sending as plain text.');
      alarmData = { AlarmName: record.Sns.Subject || 'System Alert', NewStateValue: 'ALERT', NewStateReason: snsMessage };
    }

    const alarmName = alarmData.AlarmName || 'System Alert';
    const newState = alarmData.NewStateValue || 'UNKNOWN';
    const reason = alarmData.NewStateReason || 'No detailed reason provided.';
    const isOK = newState === 'OK';

    const subject = isOK
      ? `✅ RECOVERED: ${alarmName} (Site Healthy)`
      : `🚨 ALERT: ${alarmName} (Action Required)`;

    const badgeBg = isOK ? '#dcfce7' : '#fee2e2';
    const badgeColor = isOK ? '#15803d' : '#b91c1c';
    const badgeText = isOK ? 'ONLINE / HEALTHY' : 'DOWN / CRITICAL';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; }
          .brand { font-size: 20px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; margin-top: 10px; }
          .title { font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 15px; }
          .info-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
          .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .label { color: #64748b; font-weight: 600; width: 120px; }
          .value { color: #1e293b; }
          .reason-box { background: #f1f5f9; border-left: 4px solid ${isOK ? '#22c55e' : '#ef4444'}; padding: 12px 16px; margin-top: 20px; border-radius: 6px; font-size: 13px; color: #334155; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="brand">🌸 Anjali Alankaram Monitoring</div>
            <div class="badge">${badgeText}</div>
          </div>
          <div class="title">${alarmName}</div>
          <div class="reason-box">${reason}</div>
          <table class="info-table">
            <tr>
              <td class="label">Status:</td>
              <td class="value"><strong>${newState}</strong></td>
            </tr>
            <tr>
              <td class="label">Website:</td>
              <td class="value"><a href="https://anjalialankaram.com" style="color: #2563eb;">https://anjalialankaram.com</a></td>
            </tr>
            <tr>
              <td class="label">Time (IST):</td>
              <td class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>
          <div style="text-align: center;">
            <a href="https://anjalialankaram.com/admin" class="btn">Open Admin Dashboard</a>
          </div>
          <div class="footer">
            Anjali Alankaram Automated Health & Outage Alert System
          </div>
        </div>
      </body>
      </html>
    `;

    const params = {
      Source: `"Anjali Alankaram Alerts" <${process.env.SES_FROM_EMAIL || 'noreply@anjalialankaram.com'}>`,
      Destination: { ToAddresses: [process.env.ALERT_EMAIL || 'jagadishvarma99@gmail.com'] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: htmlBody } },
      },
    };

    try {
      await ses.send(new SendEmailCommand(params));
      console.log(`Successfully sent alert email to ${process.env.ALERT_EMAIL}`);
    } catch (err) {
      console.error('Error sending SES email:', err);
    }
  }
};
