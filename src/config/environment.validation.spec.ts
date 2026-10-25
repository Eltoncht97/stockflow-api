import { validateEnvironment } from './environment.validation.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/stockflow_test',
  CORS_ORIGINS: 'http://localhost:3000',
};

describe('validateEnvironment', () => {
  it('accepts a PostgreSQL URL and applies the default port', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      PORT: 3000,
      THROTTLE_TTL: 60_000,
      THROTTLE_LIMIT: 60,
      CORS_ORIGINS: 'http://localhost:3000',
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
        ...validEnvironment,
        [name]: value,
      }),
    ).toThrow('Environment validation failed');
  });

  it.each([
    [{ CORS_ORIGINS: validEnvironment.CORS_ORIGINS }, 'missing database URL'],
    [
      { ...validEnvironment, DATABASE_URL: 'https://example.com/database' },
      'invalid URL scheme',
    ],
    [
      {
        ...validEnvironment,
        PORT: 70_000,
      },
      'invalid port',
    ],
    [{ DATABASE_URL: validEnvironment.DATABASE_URL }, 'missing CORS origins'],
    [{ ...validEnvironment, CORS_ORIGINS: '   ' }, 'blank CORS origins'],
  ])('rejects %s (%s)', (value, reason) => {
    expect(reason).toBeTruthy();
    expect(() => validateEnvironment(value)).toThrow(
      'Environment validation failed',
    );
  });
});
