# BrellBook v8 final production audit

## Changes made in this review

- Removed the Prisma-incompatible `pesapalOrderId` write; Pesapal tracking is stored in the existing `Payment.trackingId` field.
- Serialized Pesapal callback/IPN subscription activation with a PostgreSQL advisory transaction lock so duplicate callbacks cannot extend a subscription twice.
- Made analytics available to Starter and Pro, matching the product plan requirements; reports remain Pro.
- Hardened dashboard booking rescheduling: changed times/staff are revalidated against business hours, breaks, holidays, staff schedules and conflicts inside a serializable transaction.
- Enforced Starter/Pro server-side gating for business visual customization and business R2 uploads. Profile uploads remain available independently.
- Free public pages retain BrellBook branding; Starter/Pro pages remove the powered-by branding.
- Added an installable PWA manifest with standalone display mode and the existing BrellBook icon.

## Verification

The ZIP archive is valid and all source/config files were inspected. The local environment available for this audit did not have the project npm dependencies installed. `npm install --no-audit --no-fund` could not complete because the package registry request timed out, and offline installation failed because packages were not cached. Therefore this audit does **not** falsely claim that ESLint, TypeScript, Prisma generate, or Next production build have passed in this environment.

Run in the project directory before deployment:

```bash
npm install
npx prisma format
npx prisma generate
npm run typecheck
npm run lint
npm run build
```

Do not use `prisma db push --force-reset`. Preserve the existing database and use the project's safe sync/migration procedure.
