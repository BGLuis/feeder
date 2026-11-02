import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: { getOrThrow: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret-min-32-characters-long'),
    };
    strategy = new JwtStrategy(mockConfigService as unknown as ConfigService);
  });

  it('should be defined and initialized with secret from ConfigService', () => {
    expect(strategy).toBeDefined();
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('should validate and return mapped user payload when sub is provided', async () => {
    const payload = {
      sub: 'user-uuid-1234',
      email: 'user@example.com',
      role: 'admin',
      name: 'Test User',
    };

    const result = await strategy.validate(payload);
    expect(result).toEqual({
      id: 'user-uuid-1234',
      email: 'user@example.com',
      role: 'admin',
      name: 'Test User',
    });
  });

  it('should throw UnauthorizedException when sub is missing', async () => {
    const invalidPayload = {
      email: 'user@example.com',
    };

    await expect(strategy.validate(invalidPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
