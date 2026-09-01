import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsSafeUrl } from '../../common/net/ssrf-guard';

export class CreateWebhookDto {
  @IsSafeUrl()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;

  @IsOptional()
  @IsIn(['ALL', 'TAG', 'SOURCE'])
  triggerType?: 'ALL' | 'TAG' | 'SOURCE';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  triggerValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  payloadTemplate?: string;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsSafeUrl()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;

  @IsOptional()
  @IsIn(['ALL', 'TAG', 'SOURCE'])
  triggerType?: 'ALL' | 'TAG' | 'SOURCE';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  triggerValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  payloadTemplate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
