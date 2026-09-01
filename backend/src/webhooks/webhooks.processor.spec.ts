import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { WebhooksProcessor } from './webhooks.processor';
import { safeFetch, SsrfBlockedError } from '../common/net/ssrf-guard';

jest.mock('../common/net/ssrf-guard', () => {
  const actual = jest.requireActual('../common/net/ssrf-guard');
  return { ...actual, safeFetch: jest.fn() };
});

const mockedSafeFetch = safeFetch as jest.MockedFunction<typeof safeFetch>;

function makeJob(
  data: Partial<{ targetUrl: string; secret: string; payload: any }>,
) {
  return {
    id: 'job-1',
    data: {
      targetUrl: 'https://hooks.example.com/x',
      secret: 'a-signing-secret-1234',
      payload: { hello: 'world' },
      ...data,
    },
  } as unknown as Job<any, any, string>;
}

describe('WebhooksProcessor', () => {
  let processor: WebhooksProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksProcessor,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    processor = module.get(WebhooksProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  it('delivers on 2xx with a timestamped HMAC signature', async () => {
    mockedSafeFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    } as unknown as Response);

    const result = await processor.process(makeJob({}));

    expect(result).toEqual({ status: 200 });
    const [, init] = mockedSafeFetch.mock.calls[0];
    const headers = (init as any).headers;
    expect(headers['x-feeder-timestamp']).toMatch(/^\d+$/);
    expect(headers['x-feeder-signature']).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it('throws on a non-2xx response so BullMQ retries', async () => {
    mockedSafeFetch.mockResolvedValue({
      ok: false,
      status: 502,
      body: null,
    } as unknown as Response);

    await expect(processor.process(makeJob({}))).rejects.toThrow(/502/);
  });

  it('discards (does not retry) a job blocked by the SSRF guard', async () => {
    mockedSafeFetch.mockRejectedValue(new SsrfBlockedError('blocked address'));

    const result = await processor.process(
      makeJob({ targetUrl: 'http://169.254.169.254/' }),
    );
    expect(result).toEqual(expect.objectContaining({ blocked: true }));
  });

  it('refuses a job with no signing secret', async () => {
    await expect(processor.process(makeJob({ secret: '' }))).rejects.toThrow(
      /signing secret/,
    );
    expect(mockedSafeFetch).not.toHaveBeenCalled();
  });
});
