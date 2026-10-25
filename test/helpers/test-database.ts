import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { assertTestDatabaseUrl } from './test-database-url.mjs';

export { assertTestDatabaseUrl } from './test-database-url.mjs';

export async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);

  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
  ]);
}
