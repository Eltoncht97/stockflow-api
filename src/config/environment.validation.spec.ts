import { validateEnvironment } from './environment.validation.js';

describe('validateEnvironment', () => {
  it('accepts a PostgreSQL URL and applies the default port', () => {
    expect(
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/stockflow_test',
      }),
    ).toMatchObject({
      PORT: 3000,
      THROTTLE_TTL: 60_000,
      THROTTLE_LIMIT: 60,
    });
  });

  it.each([
    ['THROTTLE_TTL', 0, 'zero'],
    ['THROTTLE_TTL', -1, 'negative'],
    ['THROTTLE_TTL', 1.5, 'non-integer'],
    ['THROTTLE_TTL', 'invalid', 'non-numeric'],
    ['THROTTLE_LIMIT', 0, 'zero'],
    ['THROTTLE_LIMIT', -1, 'negative'],
    ['THROTTLE_LIMIT', 1.5, 'non-integer'],
    ['THROTTLE_LIMIT', 'invalid', 'non-numeric'],
  ])('rejects %s when it is %s (%s)', (name, value, reason) => {
    expect(reason).toBeTruthy();
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/stockflow_test',
        [name]: value,
      }),
    ).toThrow('Environment validation failed');
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
