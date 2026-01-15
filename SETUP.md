# FinishStrong - Manual Setup Checklist

Complete these steps before running the app in production.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or pnpm installed
- [ ] Anthropic API account (for Claude Haiku)
- [ ] Supabase account (for cloud sync & auth)

## 1. Environment Variables

- [ ] Copy `.env.example` to `.env`
- [ ] Set `ANTHROPIC_API_KEY` - Get from [console.anthropic.com](https://console.anthropic.com)
- [ ] Set `PUBLIC_SUPABASE_URL` - From Supabase project settings
- [ ] Set `PUBLIC_SUPABASE_ANON_KEY` - From Supabase project settings → API

## 2. Supabase Project Setup

### Create Project
- [ ] Go to [supabase.com](https://supabase.com) and create a new project
- [ ] Wait for project to finish provisioning
- [ ] Copy project URL and anon key to `.env`

### Enable Authentication
- [ ] Go to Authentication → Providers
- [ ] Enable "Email" provider
- [ ] (Optional) Disable "Confirm email" for easier testing in Authentication → Settings

### Create Database Tables
- [ ] Go to SQL Editor
- [ ] Run the contents of `supabase/migrations/000_create_tables.sql`
- [ ] Run the contents of `supabase/migrations/001_create_prompt_logs.sql`

### Enable Row Level Security (after auth-5 is complete)
- [ ] Run the contents of `supabase/migrations/002_enable_rls.sql`

## 3. Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Type check
npm run check
```

## 4. PWA Setup (Optional)

For full PWA functionality:
- [ ] Add icon files to `static/` folder:
  - `pwa-192x192.png` (192x192)
  - `pwa-512x512.png` (512x512)
  - `apple-touch-icon.png` (180x180)

## 5. Verification

After setup, verify:
- [ ] App loads at `http://localhost:5173`
- [ ] Can create account / log in
- [ ] Can log an exercise via text input
- [ ] Can log an exercise via voice input
- [ ] Entries appear in session cards
- [ ] Dashboard shows stats
- [ ] Ask page answers questions
- [ ] Data syncs to Supabase (check Table Editor)

## Troubleshooting

### "401 Unauthorized" from /api/parse
- Check `ANTHROPIC_API_KEY` is set correctly in `.env`
- Restart dev server after changing `.env`

### Supabase sync not working
- Check `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Verify tables exist in Supabase Table Editor
- Check browser console for errors

### Voice input not working
- Requires HTTPS or localhost (Web Speech API security requirement)
- Check browser supports Web Speech API (Chrome/Edge recommended)
