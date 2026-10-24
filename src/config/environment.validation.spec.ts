import { validateEnvironment } from './environment.validation.js';

describe('validateEnvironment', () => {
  it('accepts a PostgreSQL URL and applies the default port', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/stockflow_test',
      }),
    ).toMatchObject({ PORT: 3000 });
  });

  it.each([
    [{}, 'missing database URL'],
    [{ DATABASE_URL: 'https://example.com/database' }, 'invalid URL scheme'],
    [
      {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/stockflow_test',
        PORT: 70_000,
      },
      'invalid port',
    ],
  ])('rejects %s (%s)', (value, reason) => {
    expect(reason).toBeTruthy();
    expect(() => validateEnvironment(value)).toThrow(
      'Environment validation failed',
    );
  });
});
