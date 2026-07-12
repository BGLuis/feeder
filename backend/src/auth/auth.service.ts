import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
  verifyRegistrationResponse 
} from '@simplewebauthn/server';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';

@Injectable()
export class AuthService {
  private redisClient: Redis;
  private rpName = 'Feeder App';
  private rpID = 'localhost'; // In production, get this from env
  private origin = 'http://localhost:4200'; // In production, get this from env

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserCredential) private credentialRepository: Repository<UserCredential>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  async register(email: string, password?: string) {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) throw new BadRequestException('User already exists');

    const user = new User();
    user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await this.userRepository.save(user);

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return { 
      message: 'User registered successfully',
      access_token: this.jwtService.sign(payload)
    };
  }

  async login(email: string, password?: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (password && user.password) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async generatePasskeyOptions(email: string, action: 'register' | 'authenticate' = 'authenticate') {
    let user = await this.userRepository.findOne({ where: { email }, relations: { credentials: true } });
    let options;

    if (!user || action === 'register') {
      // Happy Path Registration or Add Passkey to existing user
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
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      });
    } else {
      // Authentication (or adding a passkey if they don't have one? For simplicity, assume auth if user exists)
      options = await generateAuthenticationOptions({
        rpID: this.rpID,
        allowCredentials: user.credentials?.map(cred => ({
          id: cred.credentialID,
        })) || [],
        userVerification: 'preferred',
      });
    }

    // Save challenge in Redis for 5 minutes
    await this.redisClient.set(`webauthn_challenge:${email}`, options.challenge, 'EX', 300);
    return options;
  }

  async verifyPasskey(email: string, clientResponse: any) {
    const user = await this.userRepository.findOne({ where: { email }, relations: { credentials: true } });
    if (!user) throw new UnauthorizedException('User not found');

    const expectedChallenge = await this.redisClient.get(`webauthn_challenge:${email}`);
    if (!expectedChallenge) throw new BadRequestException('Challenge expired or not found');

    let verification;
    
    // Check if response is for registration or authentication by checking for 'attestationObject'
    // This is a simplified check for the Happy Path
    if (clientResponse.response && clientResponse.response.attestationObject) {
       // Registration
       verification = await verifyRegistrationResponse({
         response: clientResponse,
         expectedChallenge,
         expectedOrigin: this.origin,
         expectedRPID: this.rpID,
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
       // Authentication
       const credential = user.credentials?.find(c => c.credentialID === clientResponse.id);
       if (!credential) throw new UnauthorizedException('Credential not found');

       verification = await verifyAuthenticationResponse({
         response: clientResponse,
         expectedChallenge,
         expectedOrigin: this.origin,
         expectedRPID: this.rpID,
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
      await this.redisClient.del(`webauthn_challenge:${email}`);
      const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
      return { access_token: this.jwtService.sign(payload) };
    }

    throw new UnauthorizedException('Verification failed');
  }

  async updateProfile(userId: string, name?: string, email?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (name !== undefined) user.name = name;
    if (email !== undefined && email !== user.email) {
      const exists = await this.userRepository.findOne({ where: { email } });
      if (exists) throw new BadRequestException('Email already in use');
      user.email = email;
    }

    await this.userRepository.save(user);

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return {
      message: 'Profile updated successfully',
      access_token: this.jwtService.sign(payload)
    };
  }
}
