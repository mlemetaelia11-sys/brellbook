# BrellBook — deploy checklist

## 1. Install and generate

```bash
npm install
npx prisma format
npx prisma generate
```

## 2. Preserve the existing database

Do **not** run `npx prisma db push --force-reset`.

This build is aligned with the existing BrellBook database model. The profile photo feature adds one nullable `User.imageKey` field. Apply it safely with:

```bash
npx prisma db push
```

If you are using the existing BrellBook database, use the included safe sync command instead:

```bash
npm run db:safe-sync
```

## 3. Verify locally

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## 4. Vercel environment

Set the production values for:
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY` / `EMAIL_FROM`
- `PESAPAL_ENVIRONMENT=live`
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_CALLBACK_URL`
- `PESAPAL_IPN_ID`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT` (optional; if omitted, BrellBook derives `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`)
- `R2_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`
- `CRON_SECRET`

Never expose R2 secrets, Pesapal secrets, `AUTH_SECRET`, or `CRON_SECRET` as public variables.

## 5. Public business page

A business with slug `brell-spa` is available at:

`https://YOUR_DOMAIN.com/brell-spa`

The page includes cinematic cover treatment, logo, contact information, services, pricing, opening hours, reviews, WhatsApp CTA and a high-conversion booking flow.
