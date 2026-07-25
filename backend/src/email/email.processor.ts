import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Job } from 'bull';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private ses: SESClient;
  private fromEmail: string;
  private fromName: string;

  constructor(private config: ConfigService) {
    const sesRegion = this.config.get('SES_AWS_REGION') || this.config.get('AWS_REGION', 'ap-south-2');
    const accessKeyId = this.config.get('SES_AWS_ACCESS_KEY_ID') || this.config.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get('SES_AWS_SECRET_ACCESS_KEY') || this.config.get('AWS_SECRET_ACCESS_KEY');

    this.ses = new SESClient({
      region: sesRegion,
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          }
        : {}),
    });
    this.fromEmail = this.config.get('SES_FROM_EMAIL', 'noreply@anjalialankaram.com');
    this.fromName = this.config.get('SES_FROM_NAME', 'Anjali Alankaram');
  }

  @Process('sendMail')
  async handleSendMail(job: Job<{ to: string; subject: string; html: string }>) {
    const { to, subject, html } = job.data;
    if (!to) return;

    this.logger.log(`[Worker: Email] Processing email send for: "${subject}" to ${to}`);

    try {
      const result = await this.ses.send(
        new SendEmailCommand({
          Source: `${this.fromName} <${this.fromEmail}>`,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
          },
        })
      );
      this.logger.log(
        `[Worker: Email] Email sent successfully via SES to ${to} | MessageId: ${result.MessageId}`
      );
    } catch (err: any) {
      if (err.message && err.message.includes('not verified') && this.fromEmail !== 'anjalialankaram@gmail.com') {
        this.logger.warn(
          `[Worker: Email] Primary sender ${this.fromEmail} unverified; falling back to verified identity anjalialankaram@gmail.com...`
        );
        try {
          const fallbackResult = await this.ses.send(
            new SendEmailCommand({
              Source: `${this.fromName} <anjalialankaram@gmail.com>`,
              Destination: { ToAddresses: [to] },
              Message: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: { Html: { Data: html, Charset: 'UTF-8' } },
              },
            })
          );
          this.logger.log(
            `[Worker: Email] Email sent successfully via fallback identity to ${to} | MessageId: ${fallbackResult.MessageId}`
          );
          return;
        } catch (fallbackErr: any) {
          this.logger.error(`[Worker: Email] Fallback send failed: ${fallbackErr.message}`);
        }
      }
      this.logger.error(
        `[Worker: Email] FAILED to send email to ${to}: "${subject}" | Message: ${err.message}`
      );
      throw err; // Throw to trigger Bull's retry mechanism
    }
  }
}
