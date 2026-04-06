# seed.ts
## Admin Bootstrap Seed Script — Prisma / NestJS

> Place this file at `apps/api/prisma/seed.ts`. Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `apps/api/package.json`.
>
> **Idempotent** — safe to run on every deploy. Skips creation if admin email already exists.

**Required env vars:** `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`

**Dev dependencies needed:** `ts-node`, `bcrypt`, `@types/bcrypt`

```typescript
// prisma/seed.ts
// Initial Admin user bootstrap — runs automatically on first deploy

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'Missing required environment variables: SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD',
    );
  }

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
```
