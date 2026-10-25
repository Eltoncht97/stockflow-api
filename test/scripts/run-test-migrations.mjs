import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { config } from 'dotenv';
import { assertTestDatabaseUrl } from '../helpers/test-database-url.mjs';

const testEnvironmentFile = process.env.TEST_ENV_FILE ?? '.env.test.local';

config({ path: testEnvironmentFile, override: true, quiet: true });

try {
  const databaseUrl = assertTestDatabaseUrl(process.env.DATABASE_URL);
  const require = createRequire(import.meta.url);
  const prismaCliPath = require.resolve('prisma/build/index.js');
  const result = spawnSync(
    process.execPath,
    [prismaCliPath, 'migrate', 'deploy'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  );

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
