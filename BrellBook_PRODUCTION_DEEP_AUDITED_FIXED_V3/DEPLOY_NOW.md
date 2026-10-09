# BrellBook — launch checklist

## 1. PostgreSQL
Set `DATABASE_URL` to a production PostgreSQL database.

Run once against the production database:

```bash
npx prisma db push
npx prisma generate
```

`db push` is used for this launch build because the schema is the source of truth and the project does not ship a hand-written migration history yet. Before a long-lived enterprise rollout, convert this to reviewed Prisma migrations.

## 2. Required Vercel environment variables
- DATABASE_URL
- AUTH_SECRET
- AUTH_TRUST_HOST=true
- NEXT_PUBLIC_APP_URL=https://your-domain
- NEXTAUTH_URL=https://your-domain

For email:
- RESEND_API_KEY
- EMAIL_FROM

For subscription billing:
- PESAPAL_ENVIRONMENT=sandbox (first), then live
- PESAPAL_CONSUMER_KEY
- PESAPAL_CONSUMER_SECRET
- PESAPAL_CALLBACK_URL=https://your-domain/api/pesapal/callback
- PESAPAL_IPN_ID=<registered Pesapal IPN id>
CRON_SECRET=<strong random secret>

## 3. Pesapal
Register the IPN URL in Pesapal before submitting orders. Pesapal API 3.0 requires the returned IPN id in the submit order request. The app verifies transaction status server-side before activating a subscription.

## 4. Launch flow to test
1. Sign up.
2. Complete business onboarding.
3. Confirm 7 working-hour rows were created.
4. Add/verify service.
5. Open `/{businessSlug}`.
6. Book publicly as a new customer.
7. Confirm booking appears in dashboard/calendar/customers.
8. Test same slot twice — second booking must be rejected.
9. Test Free plan at 20 bookings.
10. Test Pesapal sandbox subscription before enabling live payments.

## Important
Do not put database, Pesapal, Resend or R2 secrets in `NEXT_PUBLIC_*` variables.

## Subscription lifecycle
See `SUBSCRIPTION_LIFECYCLE.md`. Vercel runs `/api/cron/subscriptions` hourly. The server computes the effective plan from subscription status and dates; expired premium access falls back to Free even before the next page refresh.
