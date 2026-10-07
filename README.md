# BrellBook

BrellBook — “Book it. Don't miss it.”

This repository is a fresh production-oriented foundation for the BrellBook SaaS.

## Stack
- Next.js + TypeScript
- PostgreSQL + Prisma
- NextAuth credentials authentication foundation
- Zod validation
- Vercel deployment target
- Resend, Pesapal and Cloudflare R2 environment slots

## Run locally
1. Copy `.env.example` to `.env.local`.
2. Set a real PostgreSQL `DATABASE_URL`.
3. `npm install`
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run dev`

## Important
This build intentionally does not fake integrations. Payment, email, R2, OAuth and production email verification require real credentials and provider configuration before being enabled.

The database schema includes the major production entities, tenant membership, subscription records, audit logs, reviews and support records. UI routes are the starting shell; critical production flows must be connected to server actions/API and provider credentials before launch.

## Security
Never commit `.env.local`. Never expose Pesapal, R2, database, Resend or auth secrets through `NEXT_PUBLIC_*`.
