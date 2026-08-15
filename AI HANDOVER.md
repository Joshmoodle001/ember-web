# AI Handover — EmberWeb

Last updated: 11 August 2026

This file is the operating manual for the EmberWeb website and client-payment workspace. It is intended for the owner or the next AI/developer taking over the project.

## 1. First: keep a safe copy

Before erasing this computer:

1. Copy the entire `Ember Web` project folder to an external drive and a cloud drive.
2. Keep this file with that backup.
3. Keep access to the ChatGPT/Codex account that owns the Sites project.
4. Save all credentials in a password manager — never in this repository or this file.
5. Create a personal GitHub/GitLab backup of the committed source if you want ownership outside the Sites source repository.

The project folder includes the source code, database migration, generated visual assets, and hosting configuration. Do **not** rely on `dist/`, deployment archives, or staging folders as the source of truth.

## 2. Live services

| Purpose | Address / provider | Notes |
| --- | --- | --- |
| Public site | `https://emberweb.co.za` | Live custom domain |
| Sites preview | `https://emberweb-studio.joshmoodley01.chatgpt.site` | Managed by OpenAI Sites |
| Hosting project | OpenAI Sites | Project ID is stored in `.openai/hosting.json` |
| Domain DNS | domains.co.za | Keep the current OpenAI/Sites domain records intact |
| Payments | PayFast | Used only for private, agreed payment requests |
| Database | Cloudflare D1 through OpenAI Sites | Logical binding: `DB` |

## 3. What the site does

### Public experience

- Homepage with animated introduction, persistent navigation, responsive layouts, motion effects and EmberGuide mascot.
- Public pages: Work, Packages, Free Audit, Process, Industries, EmberCare, Policies and Start a Project.
- All public package calls-to-action now lead to a conversation/project brief. They do **not** collect payment from a cold visitor.
- Project and audit forms prepare a WhatsApp message to `072 339 8781`.

### Private client-payment experience

- Client page: `/pay`
- A client enters a private code such as `EW-1234ABCD`.
- A valid code shows only the agreed payment amount, type and due date.
- The client is then sent to PayFast for payment.
- PayFast ITN (server notification) validates the notification and marks the saved payment request as paid.

### Owner workspace

- Owner page: `/admin`
- It is protected server-side. Anonymous visitors, and signed-in users not on the owner allowlist, receive no admin workspace.
- The workspace creates client files and payment requests.
- A payment request includes: package, launch fee or EmberCare type, amount, due date, optional billing day and a random payment code.
- The workspace shows generated client payment links. It does not automatically send email, WhatsApp or recurring payment reminders yet.

## 4. Critical setup still required

The admin workspace is intentionally locked until the owner's exact ChatGPT sign-in email is configured.

Set this protected hosting environment variable:

```text
ADMIN_EMAIL=the-email-used-to-sign-in-to-ChatGPT
```

The value must be the actual sign-in email, not necessarily the public business inbox. Once set, visit `/admin` while signed in to ChatGPT with that email.

Without `ADMIN_EMAIL`, `/admin` remains inaccessible to everyone. This is expected and secure.

## 5. PayFast setup

### Hosting variables

These are stored in OpenAI Sites environment settings, not in the Git repository:

```text
PAYFAST_MERCHANT_ID        (secret)
PAYFAST_MERCHANT_KEY       (secret)
PAYFAST_SITE_URL=https://emberweb.co.za
ADMIN_EMAIL                (secret/allowlist value — still needs to be set)
```

Never paste these values into source files, public client code, screenshots, or a handover document. If a key has been shared outside a secure channel, rotate it in PayFast and update the protected hosting value.

### Current payment model

1. Meet the client and agree scope.
2. Create their client record in `/admin`.
3. Create a **launch fee** request for the agreed once-off amount.
4. Share the generated `/pay?code=...` link privately.
5. After the launch fee is paid, create a monthly **EmberCare** request with the client's chosen due date/billing day.
6. Share its private payment link when due.

This is deliberate: monthly fees are invoice-style requests, not automatic card debits.

### Important PayFast constraint

The current checkout/ITN signing code assumes the PayFast account has **no Security Passphrase** configured. If PayFast uses a Security Passphrase, the next developer must:

1. Add `PAYFAST_PASSPHRASE` as a protected hosting secret.
2. Include it in both outgoing checkout signature generation and incoming ITN signature validation, following PayFast’s current documentation.
3. Test in PayFast Sandbox before accepting live client payments.

Recurring automatic billing is not enabled. It requires explicit client consent, recurring-billing configuration and a PayFast passphrase. Do not enable it casually.

## 6. Database

Database source:

- Schema: `db/schema.ts`
- Access helper: `db/index.ts`
- Migration: `drizzle/0000_pretty_ozymandias.sql`
- Binding declaration: `.openai/hosting.json` (`"d1": "DB"`)

Tables:

| Table | Purpose |
| --- | --- |
| `clients` | Contact, business, email, phone, notes and status |
| `payment_requests` | Private code, amount, payment type, due date, status and PayFast payment ID |

When changing the schema:

```powershell
npm.cmd run db:generate
```

Commit the new `drizzle/` files. A deployment archive must include `dist/.openai/drizzle/` so the platform can apply the migration.

## 7. Key source areas

| Location | Responsibility |
| --- | --- |
| `app/page.tsx` | Main marketing homepage |
| `app/components/site-nav.tsx` | Persistent desktop/mobile navigation |
| `app/components/site-intro.tsx` | First-visit intro animation |
| `app/components/site-mascot.tsx` | Animated EmberGuide helper |
| `app/components/site-support.tsx` | WhatsApp button and cookie notice |
| `app/packages/page.tsx` | Public package presentation; intentionally meeting-first |
| `app/start/page.tsx` | Project brief that opens WhatsApp |
| `app/admin/page.tsx` | Protected owner workspace entry |
| `app/admin/admin-console.tsx` | Admin UI for clients and payment codes |
| `app/admin/owner.ts` | Server-side ChatGPT identity/owner allowlist check |
| `app/pay/page.tsx` | Public private-code payment screen |
| `app/api/admin/workspace/route.ts` | Protected client/payment-request API |
| `app/api/payment-code/route.ts` | Public code lookup with limited response data |
| `app/api/payfast/invoice/route.ts` | Creates PayFast checkout from a valid saved request |
| `app/api/payfast/itn/route.ts` | PayFast ITN verification and paid-status update |
| `app/api/payfast/checkout/route.ts` | Legacy direct package checkout disabled; redirects to project start |
| `app/globals.css` | Global visual system and responsive styling |

## 8. Local development

Requirements:

- Node.js 22 or newer
- npm
- A copy of this complete project folder

On Windows PowerShell, use `npm.cmd` if script execution blocks `npm.ps1`.

```powershell
npm.cmd install
npm.cmd run dev
```

Build before every deployment:

```powershell
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'
.\node_modules\.bin\vinext.cmd build
```

The local D1 binding is a placeholder. Production D1 is attached by OpenAI Sites during deployment.

## 9. Deployment process

This project uses OpenAI Sites. Do not replace `.openai/hosting.json` or invent a new hosting project.

Safe sequence:

1. Make code changes.
2. Run the production build.
3. If the database changed, generate and inspect the migration.
4. Commit the exact source state.
5. Use the OpenAI Sites flow to obtain a temporary source-repository credential, push `HEAD` to `main`, package the built `dist/` directory with `.openai/hosting.json` and migrations, save a version, then deploy it.
6. Wait for deployment status to succeed.
7. Verify `https://emberweb.co.za` and the affected route.

Deployment archives and `site-package-stage-*` folders are temporary packaging output. They are not source code and do not need to be backed up.

## 10. Testing checklist

Before treating a release as production ready:

- [ ] Homepage works on mobile and desktop.
- [ ] Navigation links, CTA links and WhatsApp links work.
- [ ] `/packages` does not ask a new visitor to pay immediately.
- [ ] `/start` opens a prefilled WhatsApp brief.
- [ ] `/admin` rejects anonymous and unapproved users.
- [ ] Approved owner can create a client and payment request.
- [ ] `/pay` rejects invalid/used codes and only exposes minimal payment details.
- [ ] Valid code reaches PayFast with the correct amount.
- [ ] PayFast Sandbox ITN marks the matching request paid.
- [ ] Custom domain and favicon work after deployment.

## 11. Known limitations / next sensible upgrades

1. **Owner access:** `ADMIN_EMAIL` must be configured before the workspace can be used.
2. **Notifications:** payment-code links are copied/opened manually. Add Resend, WhatsApp Business API or another approved messaging provider to send scheduled reminders.
3. **Monthly scheduling:** the owner creates monthly requests manually. Add a scheduled job only after deciding the reminder timing and communication channel.
4. **PayFast passphrase:** add passphrase support if one is active in the PayFast dashboard.
5. **Recurring payments:** remain disabled until clients explicitly accept a recurring agreement and the PayFast subscription setup is tested.
6. **Admin improvements:** useful additions would be search, client timelines, payment resend, cancellation/refund notes, CSV export and a client-facing invoice receipt.

## 12. Design system and assets

- Brand base: midnight navy, cobalt/electric blue, cyan and chartreuse/lime.
- Active logo: `public/brand/emberweb-weave.png`
- Active favicon: `public/brand/emberweb-weave-favicon.png`
- Mascot: `public/brand/ember-guide.png`
- Visual imagery: `public/visuals/`
- The active logo is original EmberWeb artwork. Do not replace it with a random placeholder.

## 13. Recent project history

Recent commits include:

```text
0f23170  Add private client payment workspace
220193e  Add secure PayFast package checkout
c9e640e  Deepen internal route content and preserve enquiry context
76f45b2  Add EmberGuide mascot and woven brand system
```

## 14. Instructions for the next AI/developer

1. Read this file first.
2. Never expose, log, commit or paste secrets into code.
3. Preserve the public-site / private-payment separation.
4. Keep all admin authorization decisions server-side.
5. Use the existing D1 schema and migrations for durable data; do not use browser storage for clients or payments.
6. Confirm PayFast signatures and ITN validation against current official documentation before changing payment logic.
7. Build and deploy through OpenAI Sites; do not silently move hosting or DNS.
8. Keep the site mobile-first and preserve reduced-motion accessibility support.
