import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as crypto from 'crypto';

@Processor('webhooks')
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  async process(job: Job<{ targetUrl: string; secret: string; payload: any }, any, string>): Promise<any> {
    const { targetUrl, secret, payload } = job.data;
    
    this.logger.log(`Dispatching webhook to ${targetUrl}`);

    const payloadString = JSON.stringify(payload);
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-feeder-signature': signature,
        },
        body: payloadString,
      });

      if (!response.ok) {
        this.logger.warn(`Webhook to ${targetUrl} responded with status: ${response.status}`);
      } else {
        this.logger.log(`Webhook to ${targetUrl} successfully delivered.`);
      }

      return { status: response.status };
    } catch (error) {
      this.logger.error(`Failed to dispatch webhook to ${targetUrl}`, error);
      throw error; 
    }
  }
}
