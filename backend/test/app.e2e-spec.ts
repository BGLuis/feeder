import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { EventEmitter } from 'events';

jest.mock('bullmq', () => {
  const actual = jest.requireActual('bullmq');
  return {
    ...actual,
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      emit: jest.fn(),
      waitUntilReady: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    })),
  };
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const ee: any = new EventEmitter();
    ee.ping = jest.fn().mockResolvedValue('PONG');
    ee.quit = jest.fn().mockResolvedValue('OK');
    ee.disconnect = jest.fn();
    ee.get = jest.fn().mockResolvedValue(null);
    ee.set = jest.fn().mockResolvedValue('OK');
    ee.del = jest.fn().mockResolvedValue(1);
    return ee;
  });
});

import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    jest
      .spyOn(DataSource.prototype, 'initialize')
      .mockImplementation(async function (this: DataSource) {
        return this;
      });
    jest
      .spyOn(DataSource.prototype, 'destroy')
      .mockImplementation(async function () {});
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    jwtService = app.get(JwtService);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/feeds (GET) without token returns 401 Unauthorized', () => {
    return request(app.getHttpServer()).get('/feeds').expect(401);
  });

  it('/feeds/subscribe (POST) with extra/unknown field returns 400 Bad Request', () => {
    const token = jwtService.sign({
      sub: 'test-user-id',
      email: 'test@example.com',
    });

    return request(app.getHttpServer())
      .post('/feeds/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'https://example.com/feed.xml',
        name: 'Valid Name',
        unknownField: 'malicious-or-unexpected-payload',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('unknownField')]),
        );
      });
  });

  afterAll(async () => {
    await app?.close();
  });
});
