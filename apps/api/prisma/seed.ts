// prisma/seed.ts
// Initial Admin user bootstrap — runs automatically on first deploy.
// Idempotent: safe to run on every deploy. Skips if admin email already exists.

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '../src/common/transforms/normalize-email';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME;
  const rawEmail = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!name || !rawEmail || !password) {
    throw new Error(
      'Missing required env vars: SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD',
    );
  }

  // Normalize email: stored lowercased, so all lookups must match.
  // Without this, a re-seed with a differently-cased env var would miss
  // the existing row and attempt an insert that collides with the unique index.
  const email = normalizeEmail(rawEmail);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`Seed skipped — admin account already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  console.log(`Admin account created: ${admin.email} (id: ${admin.id})`);
  console.log('IMPORTANT: Change the seed password immediately after first login.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
