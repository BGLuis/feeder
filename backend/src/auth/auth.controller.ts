import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import {
  LoginDto,
  PasskeyOptionsDto,
  PasskeyVerifyDto,
  RegisterDto,
  UpdateProfileDto,
} from './dto/auth.dto';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('passkey/options')
  async generatePasskeyOptions(@Body() body: PasskeyOptionsDto) {
    return this.authService.generatePasskeyOptions(body.email, body.action);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('passkey/verify')
  async verifyPasskey(@Body() body: PasskeyVerifyDto) {
    return this.authService.verifyPasskey(body.email, body.clientResponse);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, body.name, body.email);
  }
}
