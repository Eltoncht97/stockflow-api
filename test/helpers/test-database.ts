import type { PrismaService } from '../../src/prisma/prisma.service.js';

const EXPECTED_TEST_DATABASE = 'stockflow_test';

export function assertTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Copy .env.test.example to .env.test.local.',
    );
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.slice(1);

  if (databaseName !== EXPECTED_TEST_DATABASE) {
    throw new Error(
      `Refusing to run database tests against "${databaseName}". Expected "${EXPECTED_TEST_DATABASE}".`,
    );
  }

  return databaseUrl;
}

export async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);

  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
  ]);
}
