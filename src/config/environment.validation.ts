import Joi from 'joi';

export type EnvironmentVariables = {
  DATABASE_URL: string;
  PORT: number;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  CORS_ORIGINS: string;
};

const environmentSchema = Joi.object<EnvironmentVariables>({
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  PORT: Joi.number().port().default(3000),
  THROTTLE_TTL: Joi.number().integer().positive().default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(60),
  CORS_ORIGINS: Joi.string().trim().required(),
}).unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = environmentSchema.validate(config, {
    abortEarly: false,
  });

  if (result.error) {
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }

  return result.value;
}
