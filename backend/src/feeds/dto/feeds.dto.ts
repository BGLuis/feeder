import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsSafeUrl } from '../../common/net/ssrf-guard';

const CONTENT_MAX = 20_000;

export class SelectorsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  item?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  image?: string;

  /**
   * Arbitrary JS executed in the scraping browser. Kept as a product feature but
   * sandboxed at runtime (timeout + no injected session). Length-capped here.
   */
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  script?: string;
}

export class SubscribeDto {
  @IsSafeUrl()
  @MaxLength(2048)
  url: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectorsDto)
  selectors?: SelectorsDto;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  authStorageState?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  tags?: string[];
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  tags?: string[];

  @IsOptional()
  @IsSafeUrl()
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectorsDto)
  selectors?: SelectorsDto | null;
}

export class ListArticlesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export { CONTENT_MAX };
