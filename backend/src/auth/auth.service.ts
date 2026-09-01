import {
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';

// Pre-computed bcrypt hash of a random string; used to keep response timing
// roughly constant when the account does not exist / has no password.
const DUMMY_HASH =
  '$2b$12$BTcfTcviFAZIFWiSveYs0eJR0FFoNQQxs5Nw2lmLbX97/xIHgwI8G';

@Injectable()
export class AuthService implements OnModuleDestroy {
  private redisClient: Redis;
  private rpName: string;
  private rpID: string;
  private origin: string;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserCredential)
    private credentialRepository: Repository<UserCredential>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    this.rpName = this.configService.get<string>('RP_NAME', 'Feeder App');
    this.rpID = this.configService.get<string>('RP_ID', 'localhost');
    this.origin = this.configService.get<string>(
      'ORIGIN',
      'http://localhost:4200',
    );
  }

  async onModuleDestroy() {
    await this.redisClient.quit().catch(() => undefined);
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  async register(email: string, password?: string) {
    email = this.normalizeEmail(email);
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) throw new BadRequestException('User already exists');

    const user = new User();
    user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }
    await this.userRepository.save(user);

    return {
      message: 'User registered successfully',
      access_token: this.jwtService.sign(this.buildPayload(user)),
    };
  }

  async login(email: string, password?: string) {
    email = this.normalizeEmail(email);
    const user = await this.userRepository.findOne({ where: { email } });

    // Always run a bcrypt comparison so timing does not reveal whether the
    // account exists or has a password set.
    const hash = user?.password ?? DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(password ?? '', hash);

    if (!user || !user.password || !password || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign(this.buildPayload(user)),
    };
  }

  async generatePasskeyOptions(
    email: string,
    action: 'register' | 'authenticate' = 'authenticate',
  ) {
    email = this.normalizeEmail(email);
    let user = await this.userRepository.findOne({
      where: { email },
      relations: { credentials: true },
    });
    let options;

    if (!user || action === 'register') {
      if (!user) {
        user = new User();
        user.email = email;
        await this.userRepository.save(user);
      }

      options = await generateRegistrationOptions({
        rpName: this.rpName,
        rpID: this.rpID,
        userName: email,
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
      });
    } else {
      options = await generateAuthenticationOptions({
        rpID: this.rpID,
        allowCredentials:
          user.credentials?.map((cred) => ({
            id: cred.credentialID,
          })) || [],
        userVerification: 'required',
      });
    }

    await this.redisClient.set(
      `webauthn_challenge:${email}`,
      options.challenge,
      'EX',
      300,
    );
    return options;
  }

  async verifyPasskey(email: string, clientResponse: any) {
    email = this.normalizeEmail(email);
    const user = await this.userRepository.findOne({
      where: { email },
      relations: { credentials: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const challengeKey = `webauthn_challenge:${email}`;
    const expectedChallenge = await this.redisClient.get(challengeKey);
    if (!expectedChallenge)
      throw new BadRequestException('Challenge expired or not found');

    // A challenge is single-use: consume it now, regardless of the outcome,
    // so a failed attempt cannot be replayed within the TTL.
    await this.redisClient.del(challengeKey);

    let verification;

    if (clientResponse.response && clientResponse.response.attestationObject) {
      verification = await verifyRegistrationResponse({
        response: clientResponse,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const newCred = new UserCredential();
        newCred.user = user;
        newCred.credentialID = credential.id;
        newCred.credentialPublicKey = Buffer.from(credential.publicKey);
        newCred.counter = credential.counter;
        await this.credentialRepository.save(newCred);
      }
    } else {
      const credential = user.credentials?.find(
        (c) => c.credentialID === clientResponse.id,
      );
      if (!credential) throw new UnauthorizedException('Credential not found');

      verification = await verifyAuthenticationResponse({
        response: clientResponse,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true,
        credential: {
          id: credential.credentialID,
          publicKey: new Uint8Array(credential.credentialPublicKey),
          counter: credential.counter,
        },
      });

      if (verification.verified && verification.authenticationInfo) {
        credential.counter = verification.authenticationInfo.newCounter;
        await this.credentialRepository.save(credential);
      }
    }

    if (verification.verified) {
      return { access_token: this.jwtService.sign(this.buildPayload(user)) };
    }

    throw new UnauthorizedException('Verification failed');
  }

  async updateProfile(userId: string, name?: string, email?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      const normalized = this.normalizeEmail(email);
      if (normalized !== user.email) {
        const exists = await this.userRepository.findOne({
          where: { email: normalized },
        });
        if (exists) throw new BadRequestException('Email already in use');
        user.email = normalized;
      }
    }

    await this.userRepository.save(user);

    return {
      message: 'Profile updated successfully',
      access_token: this.jwtService.sign(this.buildPayload(user)),
    };
  }

  private buildPayload(user: User) {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
