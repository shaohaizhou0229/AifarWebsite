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
npm run validate
npm run build
```

## Environment

Copy `.env.example` to `.env.local` and configure:

- `SUPABASE_DB_POOL_URL` for server-side Postgres access.
- `NEXT_PUBLIC_SUPABASE_URL` for Supabase Auth.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase Auth REST requests.

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
