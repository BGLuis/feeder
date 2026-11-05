import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
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

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
  generateRegistrationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let credentialRepository: { save: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userRepository = { findOne: jest.fn(), save: jest.fn() };
    credentialRepository = { save: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(UserCredential),
          useValue: credentialRepository,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisMock.get.mockReset();
  });

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

  describe('generatePasskeyOptions', () => {
    beforeEach(() => {
      (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
        challenge: 'login-challenge',
      });
    });

    it('offers only sign-in options for an existing account, never registration', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'victim@b.com',
        credentials: [{ credentialID: 'victim-cred' }],
      });

      await service.generatePasskeyOptions('victim@b.com');

      expect(generateRegistrationOptions).not.toHaveBeenCalled();
      expect(generateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          allowCredentials: [{ id: 'victim-cred' }],
        }),
      );
    });

    it('does not create an account for an unknown email', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      await service.generatePasskeyOptions('nobody@b.com');

      expect(userRepository.save).not.toHaveBeenCalled();
      expect(generateRegistrationOptions).not.toHaveBeenCalled();
      expect(generateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ allowCredentials: [] }),
      );
    });
  });

  describe('generatePasskeyRegistrationOptions', () => {
    beforeEach(() => {
      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: 'registration-challenge',
      });
    });

    it('builds options for the session user and excludes their existing passkeys', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: 'user-1',
        email: 'a@b.com',
        credentials: [{ credentialID: 'existing-cred' }],
      });

      await service.generatePasskeyRegistrationOptions('user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(generateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'a@b.com',
          excludeCredentials: [{ id: 'existing-cred' }],
        }),
      );
    });

    it('stores the challenge apart from sign-in challenges, keyed by user id', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: 'user-1',
        email: 'a@b.com',
        credentials: [],
      });

      await service.generatePasskeyRegistrationOptions('user-1');

      expect(redisMock.set).toHaveBeenCalledWith(
        'webauthn_registration_challenge:user-1',
        'registration-challenge',
        'EX',
        300,
      );
    });

    it('rejects a token whose user no longer exists', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.generatePasskeyRegistrationOptions('gone'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyPasskeyRegistration', () => {
    const user = { id: 'user-1', email: 'a@b.com', credentials: [] };

    it('attaches a verified passkey to the session user without issuing a token', async () => {
      userRepository.findOne.mockResolvedValueOnce(user);
      redisMock.get.mockResolvedValueOnce('registration-challenge');
      (verifyRegistrationResponse as jest.Mock).mockResolvedValueOnce({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'new-cred',
            publicKey: new Uint8Array([1, 2]),
            counter: 0,
          },
        },
      });

      const result = await service.verifyPasskeyRegistration('user-1', {
        response: { attestationObject: 'x' },
      });

      expect(redisMock.get).toHaveBeenCalledWith(
        'webauthn_registration_challenge:user-1',
      );
      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ user, credentialID: 'new-cred' }),
      );
      expect(result).toEqual({ verified: true });
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('stores nothing when the attestation does not verify, and consumes the challenge', async () => {
      userRepository.findOne.mockResolvedValueOnce(user);
      redisMock.get.mockResolvedValueOnce('registration-challenge');
      (verifyRegistrationResponse as jest.Mock).mockResolvedValueOnce({
        verified: false,
      });

      await expect(
        service.verifyPasskeyRegistration('user-1', {}),
      ).rejects.toThrow(BadRequestException);

      expect(credentialRepository.save).not.toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalledWith(
        'webauthn_registration_challenge:user-1',
      );
    });

    it('answers a malformed attestation with 400, so the session is not dropped by a 401', async () => {
      userRepository.findOne.mockResolvedValueOnce(user);
      redisMock.get.mockResolvedValueOnce('registration-challenge');
      (verifyRegistrationResponse as jest.Mock).mockRejectedValueOnce(
        new Error('bad attestation'),
      );

      await expect(
        service.verifyPasskeyRegistration('user-1', {}),
      ).rejects.toThrow(BadRequestException);

      expect(credentialRepository.save).not.toHaveBeenCalled();
    });

    it('rejects when there is no stored registration challenge', async () => {
      userRepository.findOne.mockResolvedValueOnce(user);
      redisMock.get.mockResolvedValueOnce(null);

      await expect(
        service.verifyPasskeyRegistration('user-1', {}),
      ).rejects.toThrow(BadRequestException);

      expect(verifyRegistrationResponse).not.toHaveBeenCalled();
    });
  });

  describe('verifyPasskey', () => {
    it('never registers a credential or issues a token from an attestation response', async () => {
      userRepository.findOne.mockResolvedValueOnce({
        id: '1',
        email: 'victim@b.com',
        credentials: [{ credentialID: 'victim-cred' }],
      });
      redisMock.get.mockResolvedValueOnce('challenge-abc');
      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'attacker-cred',
            publicKey: new Uint8Array([1]),
            counter: 0,
          },
        },
      });

      await expect(
        service.verifyPasskey('victim@b.com', {
          id: 'attacker-cred',
          response: { attestationObject: 'x' },
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(verifyRegistrationResponse).not.toHaveBeenCalled();
      expect(credentialRepository.save).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

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

  describe('updateProfile', () => {
    it('throws BadRequestException when user not found', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateProfile('u-missing', 'New Name'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when email is already in use by another user', async () => {
      userRepository.findOne
        .mockResolvedValueOnce({ id: 'u-1', email: 'current@example.com' })
        .mockResolvedValueOnce({ id: 'u-2', email: 'taken@example.com' });

      await expect(
        service.updateProfile('u-1', 'Name', 'taken@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates name and email, saves and returns access_token', async () => {
      const user = { id: 'u-1', name: 'Old', email: 'old@example.com' };
      userRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null); // email not taken
      userRepository.save.mockResolvedValueOnce(user);

      const result = await service.updateProfile(
        'u-1',
        'New',
        'new@example.com',
      );

      expect(user.name).toBe('New');
      expect(user.email).toBe('new@example.com');
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(result.message).toBe('Profile updated successfully');
      expect(result.access_token).toBe('token');
    });
  });
});
