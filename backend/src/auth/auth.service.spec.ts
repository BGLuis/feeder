import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';

const redisMock = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};
jest.mock('ioredis', () => jest.fn().mockImplementation(() => redisMock));

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    userRepository = { findOne: jest.fn(), save: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(UserCredential), useValue: {} },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('rejects a duplicate email', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.com',
      });
      await expect(
        service.register('a@b.com', 'longpassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes the password with cost 12 and normalizes the email', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed');

      await service.register('  User@Example.COM ', 'longpassword1');

      expect(bcrypt.hash).toHaveBeenCalledWith('longpassword1', 12);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          password: 'hashed',
        }),
      );
    });
  });

  describe('login', () => {
    it('rejects an account that has no password (passkey-only) even with a matching dummy compare', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'p@b.com',
        password: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('p@b.com', 'whatever')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('runs a bcrypt comparison even when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('missing@b.com', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.com',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      await expect(service.login('a@b.com', 'nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('issues a token with sub/email/name/role on success', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.com',
        password: 'hash',
        name: 'A',
        role: 'user',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login('A@B.com', 'right');

      expect(result.access_token).toBe('token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'a@b.com',
        name: 'A',
        role: 'user',
      });
    });
  });

  describe('verifyPasskey', () => {
    it('consumes the challenge even when verification is not possible', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.com',
        credentials: [],
      });
      redisMock.get.mockResolvedValueOnce('challenge-abc');

      await expect(
        service.verifyPasskey('a@b.com', { id: 'unknown-cred' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisMock.del).toHaveBeenCalledWith('webauthn_challenge:a@b.com');
    });

    it('rejects when there is no stored challenge', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.com',
        credentials: [],
      });
      redisMock.get.mockResolvedValueOnce(null);

      await expect(service.verifyPasskey('a@b.com', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
