import { Test, TestingModule } from '@nestjs/testing';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import { ParseUUIDPipe, ValidationPipe } from '@nestjs/common';

describe('FeedsController', () => {
  let controller: FeedsController;
  let service: any;

  beforeEach(async () => {
    service = {
      subscribe: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      findAll: jest.fn().mockResolvedValue([]),
      getArticles: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      updateSubscription: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      refreshSubscription: jest.fn().mockResolvedValue({ success: true }),
      deleteSubscription: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedsController],
      providers: [{ provide: FeedsService, useValue: service }],
    }).compile();

    controller = module.get<FeedsController>(FeedsController);
  });

  it('rejects invalid UUID parameter with ParseUUIDPipe', async () => {
    const pipe = new ParseUUIDPipe();
    await expect(pipe.transform('not-a-uuid', { type: 'param' })).rejects.toThrow();
  });

  it('accepts valid UUID parameter with ParseUUIDPipe', async () => {
    const pipe = new ParseUUIDPipe();
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    await expect(pipe.transform(validUuid, { type: 'param' })).resolves.toBe(validUuid);
  });

  it('delegates updateSubscription to service', async () => {
    const req = { user: { id: 'u1' } };
    await controller.updateSubscription(req, 'uuid-1', { customName: 'Test' });
    expect(service.updateSubscription).toHaveBeenCalledWith('u1', 'uuid-1', {
      customName: 'Test',
    });
  });

  it('delegates refreshSubscription to service', async () => {
    const req = { user: { id: 'u1' } };
    await controller.refreshSubscription(req, 'uuid-1');
    expect(service.refreshSubscription).toHaveBeenCalledWith('u1', 'uuid-1');
  });

  it('delegates deleteSubscription to service', async () => {
    const req = { user: { id: 'u1' } };
    await controller.deleteSubscription(req, 'uuid-1');
    expect(service.deleteSubscription).toHaveBeenCalledWith('u1', 'uuid-1');
  });
});
