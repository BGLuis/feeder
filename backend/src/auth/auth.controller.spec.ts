import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';

const JWT_SECRET = 'test-secret-with-at-least-32-characters';

describe('AuthController passkey routes', () => {
  let app: INestApplication;
  let token: string;
  const authService = {
    generatePasskeyOptions: jest.fn().mockResolvedValue({ challenge: 'c' }),
    verifyPasskey: jest.fn().mockResolvedValue({ access_token: 't' }),
    generatePasskeyRegistrationOptions: jest
      .fn()
      .mockResolvedValue({ challenge: 'c' }),
    verifyPasskeyRegistration: jest.fn().mockResolvedValue({ verified: true }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: JWT_SECRET })],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => JWT_SECRET, get: () => JWT_SECRET },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same options as main.ts: an unknown body field is a 400.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    token = moduleRef
      .get(JwtService)
      .sign({ sub: 'session-user', email: 'session@b.com' });
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  it('refuses an anonymous request for registration options', async () => {
    await request(app.getHttpServer())
      .post('/auth/passkey/register/options')
      .expect(401);
    expect(
      authService.generatePasskeyRegistrationOptions,
    ).not.toHaveBeenCalled();
  });

  it('refuses an anonymous registration verification', async () => {
    await request(app.getHttpServer())
      .post('/auth/passkey/register/verify')
      .send({ clientResponse: { id: 'x' } })
      .expect(401);
    expect(authService.verifyPasskeyRegistration).not.toHaveBeenCalled();
  });

  it('takes the user from the token on both registration routes', async () => {
    const server = app.getHttpServer();
    const auth = { Authorization: `Bearer ${token}` };

    await request(server)
      .post('/auth/passkey/register/options')
      .set(auth)
      .expect(201);
    await request(server)
      .post('/auth/passkey/register/verify')
      .set(auth)
      .send({ clientResponse: { id: 'x' } })
      .expect(201);

    expect(authService.generatePasskeyRegistrationOptions).toHaveBeenCalledWith(
      'session-user',
    );
    expect(authService.verifyPasskeyRegistration).toHaveBeenCalledWith(
      'session-user',
      { id: 'x' },
    );
  });

  it('refuses to let the request body choose the registration target', async () => {
    await request(app.getHttpServer())
      .post('/auth/passkey/register/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'victim@b.com', clientResponse: { id: 'x' } })
      .expect(400);
    expect(authService.verifyPasskeyRegistration).not.toHaveBeenCalled();
  });

  it('rejects the old public registration action', async () => {
    await request(app.getHttpServer())
      .post('/auth/passkey/options')
      .send({ email: 'victim@b.com', action: 'register' })
      .expect(400);
    expect(authService.generatePasskeyOptions).not.toHaveBeenCalled();
  });

  it('keeps passkey sign-in public', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/auth/passkey/options')
      .send({ email: 'a@b.com' })
      .expect(201);
    await request(server)
      .post('/auth/passkey/verify')
      .send({ email: 'a@b.com', clientResponse: { id: 'x' } })
      .expect(201);

    expect(authService.generatePasskeyOptions).toHaveBeenCalledWith('a@b.com');
    expect(authService.verifyPasskey).toHaveBeenCalledWith('a@b.com', {
      id: 'x',
    });
  });
});
