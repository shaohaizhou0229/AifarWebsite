# Aifar Website

Next.js product launch website for Aifar.

## Run locally

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Validate

```powershell
npm run test
npm run validate
npm run build
```

`npm run test` is a lightweight pre-release safety net for locale key shape,
admin permission checks, notification preferences, collaboration task rules, and
profile input normalization. It uses Node's built-in test runner and does not
need a database connection.

## Environment

Copy `.env.example` to `.env.local` and configure:

- `SUPABASE_DB_POOL_URL` for server-side Postgres access.
- `NEXT_PUBLIC_SUPABASE_URL` for Supabase Auth.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase Auth REST requests.

## Google sign-in

Google sign-in uses Supabase Auth. In the Supabase dashboard, enable the Google provider and configure the Google Cloud OAuth client. For local testing, allow:

- Origin: `http://127.0.0.1:3000`
- App callback: `http://127.0.0.1:3000/api/auth/callback/`
- Supabase provider callback: `https://<project-ref>.supabase.co/auth/v1/callback`

## Database migrations

Migration files live in `supabase/migrations/`. To apply a specific migration after confirming the target database environment:

```powershell
node tools/apply-migration.js supabase/migrations/20260513010000_add_auth_profiles_and_ticket_replies.sql
```

## Structure

- `app/` - Next.js App Router pages and global layout
- `components/` - shared site components
- `public/` - public styles, scripts, images, robots, and sitemap
- `data/` - structured content placeholders for future CMS or Aifar integration
