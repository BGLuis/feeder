import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  }));
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(UserCredential), useValue: {} },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw BadRequestException if user already exists', async () => {
      userRepository.findOne.mockResolvedValueOnce({ id: '1', email: 'test@test.com' });
      await expect(service.register('test@test.com', 'pass')).rejects.toThrow(BadRequestException);
    });

    it('should save new user with hashed password', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_pass');
      
      const result = await service.register('test@test.com', 'pass');
      
      expect(result).toEqual({ message: 'User registered successfully' });
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@test.com', password: 'hashed_pass' }));
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.login('test@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      userRepository.findOne.mockResolvedValueOnce({ id: '1', email: 'test@test.com', password: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      
      await expect(service.login('test@test.com', 'wrong_pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should return token if login is successful', async () => {
      userRepository.findOne.mockResolvedValueOnce({ id: '1', email: 'test@test.com', password: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      
      const result = await service.login('test@test.com', 'pass');
      expect(result.access_token).toBe('token');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: '1', email: 'test@test.com' });
    });
  });
});

