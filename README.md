# StockFlow API

An API for managing inventory, products, categories, and stock movements. StockFlow records incoming and outgoing products and keeps the available stock level of each item up to date.

## Technology stack

- Node.js 24.21.0
- TypeScript
- NestJS 11
- Prisma ORM 7
- PostgreSQL 17
- Docker and Docker Compose
- pnpm
- `@nestjs/config` and Joi for configuration and environment variable validation

## Prerequisites

Before you begin, install:

- Node.js 24.21.0
- pnpm
- Docker Desktop or Docker Engine with Docker Compose

You can check the installed versions with:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

If you use NVM, select the project version with:

```bash
nvm use
```

## Install dependencies

Install the project dependencies:

```bash
pnpm install
```

## Configure environment variables

Copy the example file to create your local configuration:

```bash
cp .env.example .env
```

Available variables:

| Variable            | Description                                 | Example value                                                                |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `POSTGRES_USER`     | PostgreSQL user                             | `stockflow`                                                                  |
| `POSTGRES_PASSWORD` | PostgreSQL password                         | `stockflow`                                                                  |
| `POSTGRES_DB`       | Database name                               | `stockflow_db`                                                               |
| `POSTGRES_PORT`     | PostgreSQL port on the local machine        | `5433`                                                                       |
| `DATABASE_URL`      | URL used by Prisma to connect to PostgreSQL | `postgresql://stockflow:stockflow@localhost:5433/stockflow_db?schema=public` |
| `PORT`              | API HTTP port                               | `3000`                                                                       |

`DATABASE_URL` is required and must use the `postgres` or `postgresql` scheme. The application also validates that `PORT` is a valid port.

## Configure PostgreSQL

Start PostgreSQL 17 with Docker Compose:

```bash
docker compose up -d
```

Local port `5433` maps to port `5432` inside the container.

Check the service status:

```bash
docker compose ps
```

View the PostgreSQL logs:

```bash
docker compose logs -f postgres
```

Stop the services without deleting their data:

```bash
docker compose down
```

## Prisma migrations

Create and apply a new migration during development:

```bash
pnpm prisma:migrate --name migration_name
```

For example:

```bash
pnpm prisma:migrate --name init
```

After changing the schema or running a migration, generate Prisma Client:

```bash
pnpm prisma:generate
```

Apply existing migrations in production:

```bash
pnpm exec prisma migrate deploy
```

## Start the server

Start the API in development mode with automatic reload:

```bash
pnpm start:dev
```

The API will be available at:

```text
http://localhost:3000
```

Build and run the production version:

```bash
pnpm build
pnpm start:prod
```
