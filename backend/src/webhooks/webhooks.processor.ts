import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
import { safeFetch, SsrfBlockedError } from '../common/net/ssrf-guard';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

@Processor('webhooks', {
  concurrency: 10,
  limiter: { max: 50, duration: 1000 },
})
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(
    job: Job<{ targetUrl: string; secret: string; payload: any }, any, string>,
  ): Promise<any> {
    const { targetUrl, secret, payload } = job.data;

    if (!secret) {
      // Unsignable — do not silently deliver an unauthenticated request.
      throw new Error(`Webhook job ${job.id} has no signing secret`);
    }

    const payloadString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    this.logger.log(`Dispatching webhook ${job.id} to ${targetUrl}`);

    let response: Response;
    try {
      response = await safeFetch(
        targetUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-feeder-timestamp': timestamp,
            'x-feeder-signature': `t=${timestamp},v1=${signature}`,
          },
          body: payloadString,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
        this.config.get<string>('SSRF_ALLOWED_HOSTS'),
      );
    } catch (error) {
      if (error instanceof SsrfBlockedError) {
        // Not retryable: the target is fundamentally disallowed.
        this.logger.warn(
          `Webhook ${job.id} blocked: ${error.message}. Discarding.`,
        );
        return { blocked: true, reason: error.message };
      }
      this.logger.error(`Failed to dispatch webhook ${job.id}`, error as Error);
      throw error;
    }

    // Drain a bounded amount of the body so the socket is released.
    await this.drain(response);

    if (!response.ok) {
      // Treat as a failure so BullMQ retries with backoff.
      throw new Error(
        `Webhook ${job.id} -> ${targetUrl} responded ${response.status}`,
      );
    }

    this.logger.log(`Webhook ${job.id} delivered (${response.status})`);
    return { status: response.status };
  }

  private async drain(response: Response): Promise<void> {
    try {
      const reader = response.body?.getReader();
      if (!reader) return;
      let read = 0;
      while (read < MAX_RESPONSE_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        read += value?.byteLength ?? 0;
      }
      await reader.cancel().catch(() => undefined);
    } catch {
      /* best-effort */
    }
  }
}
