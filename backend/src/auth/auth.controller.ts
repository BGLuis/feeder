import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('passkey/options')
  async generatePasskeyOptions(@Body() body: any) {
    return this.authService.generatePasskeyOptions(body.email, body.action);
  }

  @Post('passkey/verify')
  async verifyPasskey(@Body() body: any) {
    return this.authService.verifyPasskey(body.email, body.clientResponse);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: any) {
    return this.authService.updateProfile(req.user.id, body.name, body.email);
  }
}
