/**
 * One-time owner account setup.
 *
 * Usage:
 *   npm run setup:owner
 *
 * Reads OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD from .env. If no password is
 * supplied a strong one is generated and printed once — it is never stored in
 * plain text anywhere. No default credentials are shipped with this project.
 */
import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { assertPasswordStrength, hashPassword } from '../services/auth.js';
import { ensureBootstrap } from '../services/bootstrap.js';

async function main() {
  const email = (env.owner.email || '').trim().toLowerCase();
  if (!email) {
    console.error('\n✖ OWNER_EMAIL is not set. Add it to .env and try again.\n');
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  const generated = !env.owner.password;
  const password = generated ? generatePassword() : env.owner.password;

  if (!generated) {
    assertPasswordStrength(password);
  }

  const passwordHash = await hashPassword(password);

  const user = existing
    ? await prisma.adminUser.update({
        where: { email },
        data: { passwordHash, name: env.owner.name || existing.name, failedLogins: 0, lockedUntil: null },
      })
    : await prisma.adminUser.create({
        data: { email, name: env.owner.name || 'Site Owner', passwordHash, role: 'OWNER' },
      });

  const bootstrap = await ensureBootstrap();

  console.log('\n✔ Owner account ready');
  console.log(`  email:    ${user.email}`);
  console.log(`  name:     ${user.name}`);
  console.log(`  role:     ${user.role}`);
  if (generated) {
    console.log(`\n  ── GENERATED PASSWORD (shown once, store it safely) ──\n  ${password}\n`);
  } else {
    console.log('  password: (from OWNER_PASSWORD in .env)');
  }
  if (bootstrap.created.length) {
    console.log(`  bootstrapped: ${bootstrap.created.join(', ')}`);
  }
  console.log('\n  Sign in at /admin/login and change the password from Account & Security.\n');

  await prisma.$disconnect();
}

function generatePassword(): string {
  const base = randomBytes(18).toString('base64url');
  return `${base}Aa1!`;
}

main().catch(async (error) => {
  console.error('\n✖ Setup failed:', error instanceof Error ? error.message : error, '\n');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
