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

- Node.js 20.19 or later
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

## Environment variable configuration

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
| `PORT`              | HTTP port used by the API                   | `3000`                                                                       |

`DATABASE_URL` is required and must use the `postgres` or `postgresql` protocol. The application also checks that `PORT` is a valid port.

## Dependency installation

Install the project dependencies:

```bash
pnpm install
```

## PostgreSQL configuration

Start PostgreSQL 17 with Docker Compose:

```bash
docker compose up -d
```

Port `5433` on the local machine connects to port `5432` in the container.

Check the service status:

```bash
docker compose ps
```

To view the PostgreSQL logs:

```bash
docker compose logs -f postgres
```

To stop the services without deleting the data:

```bash
docker compose down
```

## Prisma migrations

To create and apply a new migration during development:

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

To apply existing migrations in a production environment:

```bash
pnpm exec prisma migrate deploy
```

## Starting the server

Start the API in development mode with automatic reload:

```bash
pnpm start:dev
```

The API will be available at:

```text
http://localhost:3000
```

To build and run the production version:

```bash
pnpm build
pnpm start:prod
```
