# AGENTS.md

## Project Overview

StockFlow API is an inventory management API built with:

- Node.js 24.21.0
- TypeScript and NestJS 11
- Prisma ORM 7 with PostgreSQL 17
- pnpm
- ESM modules

## Main Commands

```bash
pnpm install
pnpm prisma:generate
pnpm build
pnpm lint
pnpm test --runInBand
pnpm test:e2e
pnpm start:dev
```

## Use Docker for the local database:
```bash
docker compose up -d
pnpm exec prisma migrate deploy
```
## Code Rules
- Write all code, comments, documentation, and commit messages in English.
- Keep controllers small. Put business logic in services.
- Use DTOs with class-validator for request validation.
- Use .js extensions in relative TypeScript imports because the project uses ESM.
- Use typed ConfigService instead of reading process.env directly.
- Do not edit files inside src/generated/prisma.
- Run pnpm prisma:generate after changing prisma/schema.prisma.

## Prisma and Database Rules
- Keep PrismaModule non-global. Import it only in modules that need database access.
- Use PrismaService for database operations.
- Create a new migration for schema changes.
- Never edit an applied migration without explicit approval.
- Consider existing data and relationships when writing migrations.
- Map Prisma errors to clear NestJS HTTP exceptions when appropriate.

## Working Rules
- Ask for permission before adding or installing a new dependency.
- For bug fixes, first add a failing test that reproduces the bug.
- Show a plan and wait for approval when a change affects more than a few files.
- Do not change unrelated files or overwrite existing user changes.
- Before finishing, run the relevant tests, lint, and build.
- Report the files changed and the validation commands executed.