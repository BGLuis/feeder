import { Test, TestingModule } from '@nestjs/testing';
import { ScraperProcessor } from './scraper.processor';
import { chromium } from 'playwright';
import { Job } from 'bullmq';

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

describe('ScraperProcessor', () => {
  let processor: ScraperProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperProcessor],
    }).compile();

    processor = module.get<ScraperProcessor>(ScraperProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should inject storageState if provided and process successfully', async () => {
    // Intention: Confirm that the worker properly deserializes and injects the user's session state into the browser context.
    const mockPage = {
      goto: jest.fn(),
      title: jest.fn().mockResolvedValue('Mock Title'),
    };
    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };
    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn(),
    };

    (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const job = {
      id: 'job-1',
      data: {
        url: 'http://private.com',
        authStorageState: '{"cookies":[{"name":"session","value":"123"}]}',
      },
    } as unknown as Job;

    const result = await processor.process(job);

    expect(chromium.launch).toHaveBeenCalled();
    expect(mockBrowser.newContext).toHaveBeenCalledWith({
      storageState: { cookies: [{ name: 'session', value: '123' }] },
    });
    expect(mockPage.goto).toHaveBeenCalledWith('http://private.com', {
      waitUntil: 'domcontentloaded',
    });
    expect(mockContext.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
    expect(result).toBe('Mock Title');
  });
});
