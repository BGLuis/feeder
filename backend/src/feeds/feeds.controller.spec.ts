import { INestApplication, ParseUUIDPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';

describe('FeedsController', () => {
  let app: INestApplication;
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = { id: 'u1' };
          return true;
        },
      })
      .compile();

    controller = module.get<FeedsController>(FeedsController);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects invalid UUID route parameters with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .patch('/feeds/not-a-uuid')
      .send({ customName: 'Test' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/feeds/not-a-uuid/refresh')
      .expect(400);

    await request(app.getHttpServer()).delete('/feeds/not-a-uuid').expect(400);
  });

  it('accepts valid UUID route parameters', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    await request(app.getHttpServer())
      .patch(`/feeds/${validUuid}`)
      .send({ customName: 'Test' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/feeds/${validUuid}/refresh`)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/feeds/${validUuid}`)
      .expect(200);
  });

  it('delegates updateSubscription to service', async () => {
    const req = { user: { id: 'u1' } };
    await controller.updateSubscription(req, 'uuid-1', {
      customName: 'Test',
    });
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
