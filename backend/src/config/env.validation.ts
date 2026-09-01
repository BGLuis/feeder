import * as Joi from 'joi';

/**
 * Lean environment schema for Feeder itself (do NOT confuse with the vendored
 * `app-config.schema.ts`, which belongs to another project and does not match
 * this app's `.env`). Wired into `ConfigModule.forRoot` in `app.module.ts`:
 * the process refuses to boot when a required secret is missing or too weak.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // No default on purpose: a missing/short secret must abort startup.
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('1d'),

  // 32-byte key, hex-encoded (64 chars), used to encrypt Subscription.authStorageState at rest.
  ENCRYPTION_KEY: Joi.string()
    .length(64)
    .hex()
    .required()
    .description('AES-256-GCM key for data-at-rest encryption (64 hex chars)'),

  RP_NAME: Joi.string().default('Feeder App'),
  RP_ID: Joi.string().default('localhost'),
  ORIGIN: Joi.string().uri().default('http://localhost:4200'),

  // CSV of browser origins allowed by CORS.
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:4200'),

  // CSV of hostnames that bypass the SSRF guard (dev convenience, e.g. "localhost,mysql").
  SSRF_ALLOWED_HOSTS: Joi.string().allow('').default(''),

  ENABLE_SWAGGER: Joi.boolean().default(true),
}).unknown(true);
