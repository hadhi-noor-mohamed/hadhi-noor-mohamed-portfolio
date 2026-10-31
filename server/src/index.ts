import { createApp } from './app.js';
import { env } from './env.js';
import { prisma } from './db.js';
import { pruneExpiredSessions } from './services/auth.js';

async function main() {
  // Verify the database connection early so misconfiguration is obvious.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '\n[server] Could not connect to PostgreSQL.\n' +
        `[server] DATABASE_URL = ${env.databaseUrl.replace(/:[^:@/]*@/, ':***@')}\n` +
        '[server] Is the database running and have you run `npm run db:migrate`?\n',
    );
    throw error;
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `\n  Portfolio API ready\n` +
        `  → http://localhost:${env.port}/api/health\n` +
        `  → environment: ${env.nodeEnv}\n` +
        `  → storage driver: ${env.storageDriver}\n`,
    );
  });

  // Periodically prune expired sessions (in addition to lazy deletion).
  const interval = setInterval(() => {
    pruneExpiredSessions().catch(() => undefined);
  }, 60 * 60 * 1000);
  interval.unref?.();

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received, shutting down…`);
    clearInterval(interval);
    server.close(async () => {
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[server] Fatal startup error:', error);
  process.exit(1);
});
