import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let mockDataSource: { query: jest.Mock };
  let mockRedis: { ping: jest.Mock; quit: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    const mockConfigService = {
      get: jest.fn().mockImplementation((k: string, d?: any) => d),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'REDIS_HEALTH_CLIENT', useValue: mockRedis },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return ok when DB and Redis are healthy', async () => {
      const res = await appController.health();
      expect(res.status).toBe('ok');
      expect(res.db).toBe('up');
      expect(res.redis).toBe('up');
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should throw 503 when DB query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection lost'));
      await expect(appController.health()).rejects.toThrow(HttpException);
      try {
        await appController.health();
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should throw 503 when Redis ping fails', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection refused'));
      await expect(appController.health()).rejects.toThrow(HttpException);
      try {
        await appController.health();
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });
});
