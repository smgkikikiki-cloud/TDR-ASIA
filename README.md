# TDR Asia starter

Standalone English-language technology, manufacturing and investment news skeleton.

## Public product

- News
- Investment
- Companies
- Tracker

The public site is deliberately conventional: fast news, top stories, topic pages and business-style sections.

## Locked geographic mix

Thailand: 60–70% of editorial output.
Remaining 30–40%: primarily China, Japan, Taiwan and Singapore combined.
Other ASEAN coverage: selective.

## Hidden infrastructure

RSS, JSON feeds, structured metadata, topic pages and open records remain available for search/indexing and downstream reuse, but are not the public-facing identity.

## Run

```bash
npm install
npm run dev
```

## v0.4 — Company Tracker prototype

- `/companies` is now a public company directory with track controls.
- `/data/company/[slug]` combines public investment history, tags, aliases and a Track Company action.
- `/tracker` is the paid-workflow prototype: My Companies, tracked-event feed, alert frequency and searchable company directory.
- The prototype persists tracked companies in browser `localStorage`; production will replace this with authenticated server-side watchlists and delivery jobs.

## v0.5 visual direction
Public shell and Tracker restyled into a dense Thai business-newsroom aesthetic: masthead, dark category bar, breaking strip, hard section rules, compact headline lists, and Tracker presented as a premium editorial desk rather than a SaaS dashboard.

## v0.7 — Paywall
Tracker is now explicitly gated: public news/company/project pages remain open; company/tag monitoring, saved radars, alerts, history and exports sit behind a newspaper-style subscription wall. Prototype pricing is ฿990/month individual and ฿4,900/month team.

## v0.9 backend status

The admin code now maps directly to the normalized **TDR ASIA** Supabase tables instead of a single JSON state blob. The live schema holds tags, sources, discovery runs, candidates, articles, article sources, article tags, jobs, notifications, companies and company events.

Production server variables required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_TOKEN`, `CRON_SECRET`, `OPENAI_API_KEY`, and optionally the LINE variables shown in `.env.example`. The public project URL and publishable key are already documented in `.env.example`; never expose the service-role key client-side.

`GET /api/admin/health` verifies which backend the deployed app is actually using and returns live counts.

## Super Newsroom rollout

`/newsroom` is the internal TDR Group control room being added in small chunks. The current branch supports:

- live read-only Radar from the existing candidate pool;
- a minimal `stories` table in Supabase;
- `Make Story` to promote one candidate into one idempotent newsroom Story;
- duplicate clicks/concurrent requests resolve to the same Story;
- no Facebook/X generation or publishing yet.

The write endpoint is protected by the existing `ADMIN_TOKEN` mechanism and the `stories` table is service-role only.

## Production deployment gate

Keep this repository linked to its own Vercel project, `tdr-asia`; do not link it to the existing `tdr` project. Required production secrets:

- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) from the dedicated **TDR ASIA** Supabase project
- `OPENAI_API_KEY`
- `ADMIN_TOKEN` (long random value)
- `CRON_SECRET` (long random value)
- `SITE_URL`

Optional LINE push:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_USER_ID`

The Supabase URL and publishable key in `.env.example` are public-client identifiers, not service secrets.
