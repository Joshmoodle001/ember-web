# EmberWeb Current Handover

Last verified: 7 November 2026. This is the current project map; the historical
OpenAI Sites handover is preserved in `archive/chatgpt-era/AI HANDOVER.md`.

## Production services

| Service | Production URL | Vercel project | Source path |
| --- | --- | --- | --- |
| Public marketing site | `https://emberweb.co.za` | `ember-web` | `apps/emberweb-live` |
| Client workspace / portal | `https://portal.emberweb.co.za` | `emberweb-workspace` | `apps/client-workspace` |
| Workspace database | Supabase project `EmberWeb` (`hbdxhbwufgkrwqxpieds`) | Ember Web organization | `apps/client-workspace/supabase/migrations/` |

Both Vercel projects are linked to `Joshmoodle001/ember-web`. The marketing
deployment was verified on branch `codex/live-site-copy`; the latest portal
production deployment was uploaded from source rather than tied to a Git commit.
The source recovered from those production deployments is now in this repository.

## Repository layout

- `apps/emberweb-live/`: static marketing-site builders, assets, tests and Vercel
  configuration. It proxies portal routes to `portal.emberweb.co.za`.
- `apps/client-workspace/`: Next.js workspace with admin, client account, finance,
  proposals, PayFast, outreach and scheduled research features.
- `apps/client-workspace/supabase/migrations/`: 14 SQL migrations recovered with
  the deployed application source. The Supabase migration-history API returned
  no recorded migrations during the 7 Nov 2026 inspection, although the live
  project has the workspace schema. Do not apply migrations to production just
  to make the history appear populated; inspect live schema and migration state
  first.
- `archive/chatgpt-era/`: original vinext + Cloudflare D1 + OpenAI Sites app and
  its deployment artifacts. It is historical and is not the current production
  source.

## Local development

Requirements: Node.js 22.13+ and pnpm. The repository uses a pnpm workspace.

```powershell
npm exec --yes --package=pnpm@10.18.3 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@10.18.3 -- pnpm --filter emberweb-live-site build
npm exec --yes --package=pnpm@10.18.3 -- pnpm --filter ember-web-client-workspace dev
```

The marketing app also exposes `lint`, `preview`, and Node tests in its
`package.json`. The workspace app exposes `lint`, `build`, and focused PayFast
and auth tests. Read each app's README before changing auth, payment, outreach,
or database behavior.

## Configuration and safety

Production environment variables live in the Vercel project settings. Do not
copy them into this repository, logs, screenshots, or chat. The portal uses
Supabase, PayFast, Resend, Google Places and cron configuration; see
`apps/client-workspace/README.md` for setup and safety details. Never decrypt or
print Vercel secret values unless explicitly requested.

Do not apply production database migrations, change PayFast behavior, loosen
access controls, alter DNS, or deploy to production without an explicit request.
Validate locally first and use Vercel previews for deployment checks.

## Current code source and Git

The current working copy is `E:\ChatGPT\Ember Web`, branch `main`. The GitHub
remote is `https://github.com/Joshmoodle001/ember-web.git`; the previous OpenAI
Sites remote/history is retained as `sites`. The unified branch should preserve
both the GitHub main history and the earlier Sites project history before it is
pushed to GitHub. Review the final diff and run both apps' checks before pushing.
