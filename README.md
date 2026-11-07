# Ember Web

Distinctive websites, useful apps and practical AI automation for South African businesses — **emberweb.co.za**.

## Repository layout

| Path | What it is |
| --- | --- |
| `apps/emberweb-live/` | **Live marketing site** — static site builders + assets served at `https://emberweb.co.za` (Vercel project `ember-web`) |
| `apps/client-workspace/` | **Live client workspace / portal** — Next.js app served at `https://portal.emberweb.co.za` (Vercel project `emberweb-workspace`), backed by Supabase project `EmberWeb` |
| `archive/chatgpt-era/` | The original ChatGPT/OpenAI-Sites era project (vinext + D1 + PayFast + WhatsApp). Archived for history; see its own `AI HANDOVER.md` |
| Root docs | `AI HANDOVER.md`, `BUILD-CHECKLIST.md`, `PRACTICE-FRONT-DOOR-BLUEPRINT.md`, `JOHANNESBURG-PRACTICE-OUTREACH.md` |

## Live services

- **Public site:** https://emberweb.co.za
- **Client workspace:** https://portal.emberweb.co.za
- **Database:** Supabase org `Ember Web` → project `EmberWeb`
- **Payments:** PayFast (ZAR) · **Email:** Resend · **Places:** Google Places API

## Database migrations

The canonical migration history for the live database lives in
`apps/client-workspace/supabase/migrations/` (applied against the `EmberWeb`
Supabase project).

## Development

Each app is independent:

```powershell
# marketing site (static, node 22+; can also be run standalone)
cd apps/emberweb-live
npm ci
npm run build   # see package.json for lint/preview scripts

# From the repository root, install and run the Next.js client workspace
cd ../..
npm exec --yes --package=pnpm@10.18.3 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@10.18.3 -- pnpm --filter ember-web-client-workspace dev
```

Environment variables are managed in Vercel project settings — never commit secrets.
