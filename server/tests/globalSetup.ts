import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Vitest global setup.
 *
 * Ensures the dedicated test database (`portfolio_test`) exists and has the
 * latest schema applied before the suite runs. `--force-reset` drops and
 * recreates the schema, guaranteeing a clean slate. This never touches the
 * development database because the URL is overridden here.
 */
export default function globalSetup(): void {
  const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/portfolio_test?schema=public';

  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
}
