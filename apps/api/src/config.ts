import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  UPLOADS_DIR: z.string().default('./uploads'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
