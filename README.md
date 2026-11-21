# Dukaan Board: Google Business Profile agent

React + Vite single page app on Cloudflare Workers (static assets). Backend is Supabase project `ciltylivtagewgqeoyoc`:
Postgres with RLS, `gbp-photos` storage bucket, `gmb` edge function (Google OAuth, Business Profile APIs, Claude writing), and a
`pg_cron` job that calls `/cron/tick` every 15 minutes.

## Features and where they live

| Feature | Screen | Edge function route |
| --- | --- | --- |
| SEO profile rewrite | Profile SEO | `/api/seo/generate`, `/api/seo/apply` |
| Get more reviews (rating based review link, QR) | Review link, `/r/:slug` | `/public/review/:slug/generate` |
| Replies to all reviews | Reviews | `/api/reviews/*` |
| Daily SEO posts | Daily posts | `/api/posts/*` |
| AI photo scheduler | Photos | `/api/photos/*` |
| Performance analytics | Overview | `/api/analytics/sync` |

## Run locally

```bash
npm install
npm run dev
```

`.env` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (safe for the browser).

## Deploy to Cloudflare

```bash
npx wrangler login          # or set CLOUDFLARE_API_TOKEN
npm run build
npx wrangler deploy
```

### Deploy from GitHub (Workers Builds)

Cloudflare dashboard, Workers & Pages, Create, import this repo. Build command `npm run build`, deploy command `npx wrangler deploy`.
`.env` is not in git, so add these as **Build variables** (not runtime secrets):

- `VITE_SUPABASE_URL` = `https://ciltylivtagewgqeoyoc.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_...` key from Supabase API settings

## One-time backend setup (Supabase secrets)

Set these Edge Function secrets in the Supabase dashboard (Edge Functions, Secrets):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth web client with the Business Profile APIs enabled.
  Authorized redirect URI: `https://ciltylivtagewgqeoyoc.supabase.co/functions/v1/gmb/oauth/callback`
- `ANTHROPIC_API_KEY`: used for all writing.
- `APP_URL`: the deployed Workers URL, no trailing slash. Google sign-in returns here.
- `CRON_SECRET`: any long random string.

Then store the same string in Vault so the 15 minute job can send it:

```sql
select vault.create_secret('<same CRON_SECRET value>', 'cron_secret');
```

## Continue with Google

Login uses Supabase Google auth with the `business.manage` scope. After login the app sends Google's tokens to the `gmb-link`
edge function, which saves them, then calls `/api/locations/sync` on `gmb` to fetch every account and location on that Google account.

- Supabase, Authentication, URL Configuration: add the deployed URL and `http://localhost:5173` to Redirect URLs.
- The `gmb` function refreshes tokens with its own `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets. Use the same client as the Supabase Google provider.

## Notes

- Business Profile APIs need Google's access approval for your Cloud project before replies, posts and stats work.
- Review links work without Google access once a location exists, but locations come from the Google sync.
