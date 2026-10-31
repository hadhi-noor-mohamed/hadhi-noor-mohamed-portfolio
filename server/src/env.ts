import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the nearest .env files. The server runs from
// different layouts in development (`server/src`), production (`server/dist`),
// Docker (`/app`) and serverless runtimes, so try the common locations.
// dotenv never overwrites variables that are already set, which means values
// injected by the hosting platform (for example Vercel) always take priority.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];
for (const candidate of envCandidates) {
  dotenv.config({ path: candidate });
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  isDevelopment: !isProduction && !isTest,
  port: int('PORT', 4000),
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  siteUrl: process.env.SITE_URL ?? process.env.APP_ORIGIN ?? 'http://localhost:5173',
  corsExtraOrigins: (process.env.CORS_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  databaseUrl: required('DATABASE_URL', isTest ? 'postgresql://portfolio:portfolio@localhost:5432/portfolio_test?schema=public' : undefined),

  sessionSecret: required('SESSION_SECRET', isTest ? 'test-secret-test-secret-test-secret-1234' : undefined),
  sessionTtlHours: int('SESSION_TTL_HOURS', 12),
  trustProxy: bool('TRUST_PROXY', false),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  // Always secure cookies in production unless explicitly disabled (e.g. local docker http).
  cookieSecure: isProduction ? bool('COOKIE_SECURE', true) : bool('COOKIE_SECURE', false),

  storageDriver: (process.env.STORAGE_DRIVER ?? 'local').toLowerCase() as 'local' | 's3',
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? 'storage',
  localStoragePublicUrl: process.env.LOCAL_STORAGE_PUBLIC_URL ?? `http://localhost:${int('PORT', 4000)}`,
  uploadMaxMb: int('UPLOAD_MAX_MB', 25),

  s3: {
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
    forcePathStyle: bool('S3_FORCE_PATH_STYLE', false),
    signedUrlTtl: int('S3_SIGNED_URL_TTL', 900),
  },

  github: {
    token: process.env.GITHUB_TOKEN ?? '',
    username: process.env.GITHUB_USERNAME ?? '',
  },

  contactRateLimitPerHour: int('CONTACT_RATE_LIMIT_PER_HOUR', 5),
  analyticsEnabled: bool('ANALYTICS_ENABLED', true),

  owner: {
    email: process.env.OWNER_EMAIL ?? '',
    name: process.env.OWNER_NAME ?? 'Site Owner',
    password: process.env.OWNER_PASSWORD ?? '',
  },
};

export type Env = typeof env;

export function assertS3Configured(): void {
  const missing: string[] = [];
  if (!env.s3.bucket) missing.push('S3_BUCKET');
  if (!env.s3.accessKeyId) missing.push('S3_ACCESS_KEY_ID');
  if (!env.s3.secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY');
  if (missing.length) {
    throw new Error(
      `STORAGE_DRIVER=s3 requires the following environment variables: ${missing.join(', ')}. ` +
        'Set them in .env or switch STORAGE_DRIVER back to "local".',
    );
  }
}
