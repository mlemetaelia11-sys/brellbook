# BrellBook Subscription Lifecycle — fixed

## Plans
- Free — TSh 0/month: 20 bookings/month, 3 active services.
- Starter — TSh 15,000/month: unlimited bookings/services/customers, analytics and business customization.
- Pro — TSh 30,000/month: Starter + staff, staff schedules, advanced analytics and reports.

There is no Business plan.

## Activation
1. Owner/manager chooses Starter or Pro.
2. Server creates a PENDING SubscriptionPayment.
3. Pesapal receives the order.
4. Callback/IPN calls Pesapal GetTransactionStatus on the server.
5. Only status code 1 (COMPLETED) activates the subscription.
6. A completed renewal starts at the current period end when that date is still in the future; otherwise it starts now.
7. The payment stores billingStart and billingEnd.

## Expiry
- ACTIVE + period end in the past => hourly Vercel Cron reconciliation checks it.
- If a recent PENDING renewal exists => GRACE_PERIOD for 3 days; premium access remains during grace.
- Otherwise => EXPIRED + plan FREE.
- Grace expiration => EXPIRED + plan FREE.
- Business data is never deleted.

## Entitlements
All server-side premium checks use `getEffectivePlan()` / `requirePlan()` and therefore consider both plan and dates/status. Client-side UI is only presentation and is not trusted.

Pro server gates include staff creation/update and staff hours, analytics, and reports.
Free booking/service limits use the effective plan, so an expired premium subscription cannot bypass Free limits.

## Deployment
Set `CRON_SECRET` in Vercel. The Vercel cron is configured for `/api/cron/subscriptions` every hour.
Run `npx prisma db push` against the production database after pulling this build because the project currently uses schema-as-source-of-truth rather than a migration history. Existing `BUSINESS` enum values must not remain; if an older database contains them, convert those subscriptions to `PRO` before applying the enum change.

## Important production test
Use Pesapal sandbox first. Confirm: PENDING does not activate; COMPLETED activates; FAILED/CANCELLED do not activate; renewal extends one month; expired Pro becomes Free after reconciliation; grace ends after 3 days; expired premium cannot call Pro APIs.
