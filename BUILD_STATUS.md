# BrellBook — v8 production hardening build

This build aligns Prisma with the existing BrellBook database model instead of requiring a destructive reset.

Included in this pass:
- Existing database-compatible booking fields and APIs
- Tenant membership compound-key fix
- Real availability + conflict checking using business hours/breaks/holidays/staff hours
- Subscription payments use the existing Payment table; only Free/Starter/Pro are allowed
- Server-side effective-plan enforcement and subscription reconciliation endpoint
- Premium staff/analytics/reports protection
- Cinematic public business page at `/{businessSlug}` with service cards, reviews, hours, contact and WhatsApp CTA
- Uploaded BrellBook icon at `/brellbook-icon.png`, Next App Router `app/icon.png`, and metadata/favicon usage
- Profile photo upload through Cloudflare R2 presigned upload flow
- Security headers and LAN dev origin configuration
- Mobile-first public booking UX
- Installable PWA manifest with standalone app mode
- Starter+ server-side business customization gating; Free keeps BrellBook public branding
- Pesapal callback/IPN activation serialized with a transaction lock to prevent double extension
- Existing data is preserved; no `force-reset` is used
- ESLint configuration ignores generated build output and removes non-production lint noise from validated runtime-shaped API payloads
- No fake dashboard/marketing metrics are shipped; product UI renders real database state or explicit empty states
- R2 upload endpoint derives the standard Cloudflare R2 endpoint from `R2_ACCOUNT_ID` when `R2_ENDPOINT` is omitted
- Booking availability uses the business timezone, working hours, breaks, holidays, staff schedules and staff days off
- Critical mutation buttons use immediate loading/disabled states
- Pesapal callback activation is idempotent so callback + IPN cannot extend a paid period twice

## Required database sync

The existing database needs the nullable `User.imageKey` column for profile photos. Run `npm run db:safe-sync` to add the nullable `User.imageKey` column without resetting or changing existing business data.

## Verification commands

```bash
npm install
npx prisma format
npx prisma generate
npm run typecheck
npm run lint
npm run build
```

The build can only be runtime-certified against the exact configured PostgreSQL database and environment variables. Pesapal/R2/Resend live behavior still requires their real credentials and callback configuration.
