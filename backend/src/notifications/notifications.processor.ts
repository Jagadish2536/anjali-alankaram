import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Job } from 'bull';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  @Process('sendPush')
  async handleSendPush(
    job: Job<{ token: string; title: string; body: string; data?: Record<string, string> }>,
  ) {
    const { token, title, body, data } = job.data;
    if (!token) return;

    this.logger.log(`[Worker: Notifications] Sending push notification to token ending in ...${token.slice(-6)}`);

    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data: data || {},
      });
      this.logger.log(`[Worker: Notifications] Push notification sent successfully | Title: "${title}"`);
    } catch (err: any) {
      this.logger.error(
        `[Worker: Notifications] FAILED to send push notification | Title: "${title}" | Message: ${err.message}`
      );
      throw err; // retry job
    }
  }
}
