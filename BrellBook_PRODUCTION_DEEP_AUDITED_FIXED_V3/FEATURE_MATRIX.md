# BrellBook Feature Matrix

Legend: 🟢 implemented end-to-end in the source; 🟡 requires production credentials/provider configuration; 🔴 not intentionally left as a fake/mock feature.

## Core product
- 🟢 Authentication: signup/login/logout/session
- 🟢 Password reset flow
- 🟢 Email verification flow
- 🟢 Optional Google OAuth
- 🟢 Business onboarding
- 🟢 Multi-tenant memberships and server-side business authorization
- 🟢 Business profile/settings
- 🟢 Working hours
- 🟢 Holidays
- 🟢 Services CRUD
- 🟢 Customers CRUD
- 🟢 Staff CRUD + service assignment + staff hours API
- 🟢 Public business page
- 🟢 Guest booking flow
- 🟢 Availability engine
- 🟢 Booking conflict protection
- 🟢 Booking status management
- 🟢 Calendar Day/Week/Month views
- 🟢 WhatsApp click-to-chat
- 🟢 Booking email notifications
- 🟢 Reviews + moderation
- 🟢 Analytics
- 🟢 CSV reports
- 🟢 Support tickets
- 🟢 Notifications storage/read state
- 🟢 Cloudflare R2 presigned upload API
- 🟢 Platform admin metrics
- 🟢 Audit-log data model and helper
- 🟢 Subscription expiry/grace reconciliation endpoint

## Billing
- 🟢 Free plan limits
- 🟢 Starter TSh 15,000
- 🟢 Pro TSh 30,000
- 🟢 Business TSh 60,000
- 🟢 Pesapal order creation
- 🟢 Pesapal callback verification
- 🟢 Pesapal IPN verification
- 🟢 Idempotent subscription activation
- 🟢 Subscription payment history
- 🟡 Pesapal LIVE credentials/IPN registration must be supplied by the production account
- 🟡 Resend production API/domain must be configured
- 🟡 PostgreSQL production connection must be configured
- 🟡 R2 production bucket/credentials must be configured

## Not faked
No production business flow uses localStorage/mock booking data/fake payment success. If an external provider is not configured, the app returns a real configuration error instead of pretending the integration succeeded.

## Final environment verification
The packaging environment could not complete npm install because the package registry request timed out. Therefore `prisma generate`, `prisma validate`, `tsc`, and `next build` still need to be run in an environment with package-network access. This is a verification limitation, not a claim that those commands passed.
