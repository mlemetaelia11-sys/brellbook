# BrellBook database sync (preserves existing data)

The current project is aligned to the existing BrellBook database structure. The only new application column required by this build is `User.imageKey` for profile photos.

**Do not run `prisma db push --force-reset`.**

After `npm install`, run the included safe sync script:

```bash
npm run db:safe-sync
```

This executes only the nullable `User.imageKey` addition and does not reset, drop, or rewrite existing business data.

For a direct non-destructive SQL fallback, run this in Neon/PostgreSQL:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "imageKey" TEXT;
```

Then run:

```bash
npx prisma generate
npm run build
```
