const EXPECTED_TEST_DATABASE = 'stockflow_test';

export function assertTestDatabaseUrl(databaseUrl) {
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
