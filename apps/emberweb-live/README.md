# EmberWeb live-site copy

This folder contains a self-contained static copy of the public EmberWeb site, captured from `https://emberweb.co.za/` on 12 October 2026. It has its own build and preview commands so the older application at the repository root is not part of this site's deployment.

The copy preserves the current nine public routes, page content, visual assets, and stylesheet. The build removes the old framework runtime and adds route-specific search metadata. The small browser script handles the mobile navigation, EmberGuide panel, and enquiry handoff to WhatsApp. It does not connect to Supabase or store submitted form details.

Run `pnpm run build` to prepare `dist`, `pnpm run lint` to check the generated pages and local assets, and `pnpm run preview` to serve the result locally at `http://127.0.0.1:4173`.

Vercel should use this folder as its Root Directory, run `npm run build`, and publish `dist`. The existing repository root and its older app remain outside this deployment.
