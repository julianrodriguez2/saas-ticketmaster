# Ticketing Platform Monorepo

## Prerequisites
- Node.js 20+
- pnpm 10+
- PostgreSQL

## Quick Start
1. Create env files from the examples:
   - `.env` from `.env.example`
   - `apps/api/.env` from `apps/api/.env.example`
   - `packages/db/.env` from `packages/db/.env.example`
   - `apps/web/.env.local` from `apps/web/.env.example`
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run Prisma migration:
   ```bash
   pnpm db:migrate
   ```
4. Start web + api:
   ```bash
   pnpm dev
   ```

## Admin Setup
- Register a user from `/register`.
- Promote that user to admin in PostgreSQL:
  ```sql
  UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'admin@example.com';
  ```
- Open `/admin` in the web app to create venues and events.

## Apps
- `apps/web`: Next.js 14 frontend
- `apps/api`: Express API
- `packages/db`: Prisma schema + database client package
