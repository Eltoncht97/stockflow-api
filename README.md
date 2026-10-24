# StockFlow API

API for managing inventory, products, categories, and stock movements. StockFlow allows you to record incoming and outgoing products and keep the available stock level of each item updated.

## Technology stack

- Node.js
- TypeScript
- NestJS 11
- Prisma ORM 7
- PostgreSQL 17
- Docker and Docker Compose
- pnpm
- `@nestjs/config` and Joi for environment variable configuration and validation

## Prerequisites

Before you begin, you must have the following tools installed:

- Node.js 24
- pnpm
- Docker Desktop or Docker Engine with Docker Compose

You can check the installed versions with:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

## Clean project launch

Use the following steps after cloning the project or when setting it up in a clean environment:

```bash
# 1. Configure environment variables
cp .env.example .env

# 2. Install dependencies and generate Prisma Client
pnpm install
pnpm prisma:generate

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply existing migrations
pnpm exec prisma migrate deploy

# 5. Start the application
pnpm start:dev
```

The application will be available at `http://localhost:3000`.

To build and run the production version:

```bash
pnpm build
pnpm start:prod
```

## Automated tests

Unit tests do not require PostgreSQL:

```bash
pnpm test --runInBand
pnpm test:cov --runInBand
```

The E2E tests use a separate PostgreSQL database. The safety check refuses to
run them unless the database name is exactly `stockflow_test`.

Create the local test environment and start the isolated database:

```bash
cp .env.test.example .env.test.local
pnpm test:e2e:db:up
pnpm test:e2e:migrate
pnpm test:e2e
```

The test container uses port `5434` by default and stores its data in temporary
memory. It does not use the development database volume.

Stop the test database when it is no longer needed:

```bash
pnpm test:e2e:db:down
```
