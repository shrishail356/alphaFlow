import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  DECIBEL_BASE_URL: z
    .string()
    .url()
    .default('https://api.testnet.aptoslabs.com/decibel'),
  DECIBEL_API_KEY: z.string().optional(),

  PHOTON_BASE_URL: z
    .string()
    .url()
    .default('https://stage-api.getstan.app/identity-service/api/v1'),
  PHOTON_API_KEY: z.string().min(1, 'PHOTON_API_KEY is required'),

  AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  APTOS_NODE_API_KEY: z.string().optional(),

  // Backend wallet for delegated trading
  BACKEND_WALLET_PRIVATE_KEY: z.string().optional(),

  FRONTEND_ORIGIN: z.string().default('http://localhost:3000')
});

export const env = EnvSchema.parse(process.env);


