import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('test:e2e:migrate safety', () => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'stockflow-migration-safety-'),
  );
  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

  afterAll(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  const runMigration = (testEnvironmentFile: string) => {
    const result = spawnSync(pnpmCommand, ['test:e2e:migrate'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL:
          'postgresql://unsafe:unsafe@127.0.0.1:1/stockflow_db?schema=public',
        TEST_ENV_FILE: testEnvironmentFile,
      },
    });

    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
    };
  };

  it('overrides an exported URL with the isolated test URL', () => {
    const testEnvironmentFile = join(temporaryDirectory, 'safe.env');
    writeFileSync(
      testEnvironmentFile,
      'DATABASE_URL=postgresql://test:test@127.0.0.1:1/stockflow_test?schema=public\n',
    );

    const result = runMigration(testEnvironmentFile);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('stockflow_test');
    expect(result.output).not.toContain('stockflow_db');
  });

  it('refuses a non-test database before Prisma starts', () => {
    const testEnvironmentFile = join(temporaryDirectory, 'unsafe.env');
    writeFileSync(
      testEnvironmentFile,
      'DATABASE_URL=postgresql://prod:prod@127.0.0.1:1/production?schema=public\n',
    );

    const result = runMigration(testEnvironmentFile);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain(
      'Refusing to run database tests against "production"',
    );
    expect(result.output).not.toContain('Prisma schema loaded');
  });
});
