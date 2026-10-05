# BrellBook

Production-oriented SaaS foundation for BrellBook — booking and appointment management by Brell.

## Stack

- Next.js + TypeScript + React
- PostgreSQL / Neon
- Prisma ORM
- Tailwind CSS
- Secure HTTP-only JWT session cookie
- Pesapal provider architecture
- Resend email provider
- Google OAuth configuration path
- Vercel-ready deployment

## Requirements

- Node.js 20+
- PostgreSQL / Neon database
- npm

## Install

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Demo seed

- Email: `demo@brellbook.local`
- Password: `ChangeMe123!`
- Demo business: `bella-beauty-spa`

Change the password before any real deployment.

## Environment

See `.env.example`. Required for real database-backed use: `DATABASE_URL` and `AUTH_SECRET`.

Paid subscriptions require real Pesapal credentials. Email notifications require Resend credentials. Google OAuth requires a configured Google OAuth client. The app intentionally reports these integrations as not configured rather than pretending they are live.

## Database

Prisma schema is in `prisma/schema.prisma`. Use `npx prisma migrate dev` locally and deploy migrations through your normal CI/CD process.

## Vercel

1. Create a Vercel project from this repository.
2. Create a Neon PostgreSQL database.
3. Add environment variables from `.env.example`.
4. Set `NEXT_PUBLIC_APP_URL` to the production URL.
5. Run `npx prisma migrate deploy` during your deployment pipeline, or use the Prisma/Vercel database workflow you prefer.
6. Configure Pesapal IPN/callback and Resend domain settings only after credentials are available.

## Product architecture

Brell is the parent ecosystem. BrellBook is the active product. The database and UI include a product-switcher architecture for future BrellFlow, BrellPay, BrellChat, BrellAI, BrellAds and BrellStudio products without faking their functionality.

## Security notes

Tenant context is derived from the authenticated membership rather than a client-provided `business_id`. Business-owned queries are scoped server-side. Passwords are hashed with bcrypt. Session cookies are HTTP-only. Production deployment should add a durable rate-limit service and a production OAuth provider before launch.

## Tests

```bash
npm test
```

The included tests cover core plan rules. Expand integration/E2E tests against a disposable PostgreSQL database before public launch.

## BrellBook V2 upgrade

This version extends the original foundation with conversion and growth features:

- booking funnel tracking and analytics
- richer public booking pages
- customer booking lookup
- reviews
- no-show management
- waitlist
- discount codes
- booking price snapshots after discounts
- growth/share center
- referral codes
- configurable booking/rescheduling/cancellation/deposit/review settings
- improved mobile navigation and dashboard

### Local setup

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma db push
npm run dev
```

For production, configure `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and the provider credentials required by the integrations you intend to activate.
