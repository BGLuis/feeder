import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Simple dependency-light email shape gate. `@IsEmail()` would also work, but a
// plain regex keeps this off the `validator` package and is enough here — real
// verification is a magic-link / passkey flow. Email case/whitespace is
// normalized in AuthService rather than via a class-transformer `@Transform`
// (stacking `@Transform` above validators trips an SWC decorator-metadata bug).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MSG = { message: 'email must be a valid email address' };

export class RegisterDto {
  @Matches(EMAIL_RE, EMAIL_MSG)
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password?: string;
}

export class LoginDto {
  @Matches(EMAIL_RE, EMAIL_MSG)
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}

export class PasskeyOptionsDto {
  @Matches(EMAIL_RE, EMAIL_MSG)
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsIn(['register', 'authenticate'])
  action?: 'register' | 'authenticate';
}

export class PasskeyVerifyDto {
  @Matches(EMAIL_RE, EMAIL_MSG)
  @MaxLength(254)
  email: string;

  @IsObject()
  clientResponse: Record<string, any>;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Matches(EMAIL_RE, EMAIL_MSG)
  @MaxLength(254)
  email?: string;
}
