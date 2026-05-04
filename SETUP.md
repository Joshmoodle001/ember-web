# Ember Electric Web - Futuristic Redesign

## Setup

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it `ember-web` (or your preferred name)
3. Set a secure database password
4. Choose the closest region (e.g., Africa - Cape Town)
5. Once created, go to **SQL Editor** and run the migration in `supabase/migrations/001_initial.sql`
6. Get your API keys from **Settings > API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
7. Update `.env.local` with your keys

### 2. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel

# Or link and deploy:
vercel link
vercel env pull .env.local  # Pull env vars from Vercel
```

Make sure to set the environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Tailwind CSS 4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library
- **Supabase** - Backend & database
- **TypeScript** - Type safety

## Features

- Futuristic dark theme with neon orange accents
- Interactive particle background
- Glass morphism cards
- Scroll-triggered animations
- Contact form with Supabase integration
- Responsive design (mobile-first)
- WhatsApp floating button
- Smooth scroll navigation
- Dynamic text rotation hero