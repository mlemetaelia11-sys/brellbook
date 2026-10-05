# BrellBook V2 implementation status

## Included in this build

- Brell/BrellBook brand system aligned to supplied UI/UX references
- Locked Brell palette: #6C2BFF, #FF5A4E, #FFC838, #21D0C3, #1B1B3A, #F7F8FC
- Premium responsive SaaS shell with intentional desktop/mobile navigation
- Sidebar hamburger behavior: hidden while sidebar is open, shown only when collapsed
- Existing auth, multi-tenant architecture, booking engine, services, customers, staff, subscriptions, admin and support preserved
- Free / Starter / Pro pricing foundation
- Public business page with cover/logo, services, WhatsApp, reviews and booking CTA
- Booking funnel event tracking
- Booking funnel analytics on dashboard and Pro analytics page
- Customer self-service booking lookup
- Review model + verified completed-booking review flow
- No-show booking status + dashboard/booking actions
- Waitlist model + public waitlist form when no slots are available
- Discount code model + secure server-side discount validation/application during booking
- Booking price snapshots with discount amount and final price
- Business booking settings for cancellation, rescheduling, deposits, reviews and branding
- Growth/Marketing Center with booking link sharing and referral program
- Referral code generation and invite workflow
- Mobile-first dashboard improvements and richer quick actions
- Real booking actions: confirm, complete, no-show, cancel
- Real settings PATCH API
- Booking lookup API
- Marketing events API
- Reviews API
- Referrals API
- Waitlist API
- Discount validation API
- Seeded WELCOME10 demo discount and referral code

## Existing integrations preserved

- PostgreSQL + Prisma
- Pesapal boundary
- Resend boundary
- Cloudflare R2 boundary
- Sentry boundary
- Vercel configuration

## Production notes

Run `npm install`, then `npx prisma generate`, then `npx prisma db push` against the intended PostgreSQL database. Run the test suite with `npm test` and a production build with `npm run build` after dependencies and environment variables are configured.

Do not claim Pesapal multi-merchant booking deposits are live until each business has a supported merchant configuration and the official provider flow has been verified.
