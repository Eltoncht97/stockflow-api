import { config } from 'dotenv';
import { assertTestDatabaseUrl } from './helpers/test-database.js';

config({ path: '.env.test.local', quiet: true });

process.env.NODE_ENV = 'test';
assertTestDatabaseUrl(process.env.DATABASE_URL);
