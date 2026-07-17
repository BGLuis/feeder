import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksProcessor } from './webhooks.processor';
import { Job } from 'bullmq';
import * as crypto from 'crypto';

describe('WebhooksProcessor', () => {
  let processor: WebhooksProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksProcessor],
    }).compile();

    processor = module.get<WebhooksProcessor>(WebhooksProcessor);

    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate correct HMAC signature based on payload and send fetch request', async () => {
    // Intention: Verify that the webhook payload is signed with the user's secret to prove authenticity to the receiver.
    const secret = 'my-secret';
    const payload = { article: 'Hello' };
    const targetUrl = 'https://webhook.site/test';

    const job = {
      data: { targetUrl, secret, payload },
    } as unknown as Job;

    await processor.process(job);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    expect(global.fetch).toHaveBeenCalledWith(
      targetUrl,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-feeder-signature': expectedSignature,
        },
      }),
    );
  });
});
