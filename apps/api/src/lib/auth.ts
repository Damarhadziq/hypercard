import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '../db/index.js';
import { env } from '../env.js';
import * as schema from '../db/schema.js';

const trustedOrigins = Array.from(new Set([
  ...env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]));

export const auth = (betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'admin',
        input: true,
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
        input: true,
      },
      lastLogin: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // update session every 24 hours
  },

  plugins: [admin()],

  trustedOrigins,
}) as unknown) as ReturnType<typeof betterAuth> & {
  api: ReturnType<typeof betterAuth>['api'] & Record<string, unknown>;
};

export type Auth = typeof auth;
