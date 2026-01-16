# FinishStrong - Project Plan

> Voice-first exercise tracking PWA with LLM parsing

## Project Status

**Phase 1: MVP** ✅ Complete (44/44 stories)  
**Phase 2: Deployment** 🔄 In Progress  
**Phase 3: Enhancements** 📋 Planned  

---

## Architecture Decisions

### Hosting: Cloudflare Pages ✅

**Decision Date:** January 2026  
**Status:** Selected

**Rationale:**
- Unlimited bandwidth/requests on free tier (no surprise bills)
- Fastest global edge network (300+ PoPs)
- Native SvelteKit adapter support
- Future integration with KV, R2, Workers
- Best price/performance ratio

**Alternatives Considered:**
| Platform | Rejected Because |
|----------|------------------|
| Vercel | Can get expensive at scale, less predictable costs |
| Netlify | Credit system confusing, slower cold starts |
| Railway | No free tier, overkill for frontend-only hosting |
| Fly.io | More DevOps work, CLI-heavy |

### Backend: Supabase ✅ (Keep)

**Decision:** Keep Supabase, do not migrate to Cloudflare D1

**Rationale:**
- Auth already implemented and working
- PostgreSQL > SQLite (D1 limitations)
- Row Level Security built-in
- Realtime subscriptions available for future features
- Cloudflare has no auth solution

### LLM: Anthropic Claude Haiku ✅ (Keep)

**Decision:** Continue using Claude Haiku for parsing

**Rationale:**
- Fast response times
- Cost-effective for short parsing tasks
- Already integrated and working
- Prompt logging in place for optimization

---

## Tech Stack Summary

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  SvelteKit 5 + TypeScript + Vite                        │
│  Hosted on: Cloudflare Pages                            │
└─────────────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌─────────────────────┐  ┌─────────────────────┐
│   LOCAL STORAGE     │  │   CLOUD SERVICES    │
│                     │  │                     │
│  Dexie.js           │  │  Supabase           │
│  (IndexedDB)        │  │  - PostgreSQL       │
│  - Offline-first    │  │  - Auth             │
│  - Sync queue       │  │  - RLS              │
│                     │  │                     │
└─────────────────────┘  │  Anthropic          │
                         │  - Claude Haiku     │
                         │  - Exercise parsing │
                         └─────────────────────┘
```

---

## Deployment Plan

### Phase 2A: Cloudflare Setup

- [ ] Create Cloudflare account
- [ ] Install adapter: `npm i -D @sveltejs/adapter-cloudflare`
- [ ] Update `svelte.config.js` with Cloudflare adapter
- [ ] Connect GitHub repo to Cloudflare Pages
- [ ] Set environment variables in Cloudflare dashboard:
  - `ANTHROPIC_API_KEY`
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
- [ ] Configure custom domain (optional)
- [ ] Verify deployment works

### Phase 2B: Supabase Production Setup

- [ ] Create production Supabase project
- [ ] Run migration: `000_create_tables.sql`
- [ ] Run migration: `001_create_prompt_logs.sql`
- [ ] Run migration: `002_enable_rls.sql`
- [ ] Enable email auth provider
- [ ] Update Cloudflare env vars with production Supabase keys
- [ ] Test auth flow end-to-end

### Phase 2C: PWA Verification

- [ ] Add PWA icons to `static/`:
  - `pwa-192x192.png`
  - `pwa-512x512.png`
  - `apple-touch-icon.png`
- [ ] Test "Add to Home Screen" on iOS/Android
- [ ] Verify offline functionality
- [ ] Test service worker caching

---

## Future Features (Phase 3)

### Priority 1: Cost Optimization

| Feature | Description | Cloudflare Service |
|---------|-------------|-------------------|
| **Exercise Cache** | Cache common parse results to reduce Anthropic API calls | KV Store |
| **Rate Limiting** | Limit /api/parse to 10 req/min per user | Workers |

**KV Cache Implementation:**
```typescript
// In /api/parse
const cacheKey = normalizedInput.toLowerCase().trim();
const cached = await env.EXERCISE_CACHE.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... call Anthropic ...

await env.EXERCISE_CACHE.put(cacheKey, JSON.stringify(result), {
  expirationTtl: 86400 // 24 hours
});
```

**Estimated savings:** 30-50% reduction in Anthropic API costs

### Priority 2: Security Enhancements

| Feature | Description | Cloudflare Service |
|---------|-------------|-------------------|
| **Bot Protection** | Invisible CAPTCHA on login/signup | Turnstile (Free) |
| **API Abuse Prevention** | Rate limit by IP/user | Workers + Rate Limiting |

### Priority 3: Media Features

| Feature | Description | Cloudflare Service |
|---------|-------------|-------------------|
| **Progress Photos** | Upload/store workout photos | R2 Storage |
| **Image Optimization** | Auto-resize for thumbnails | Cloudflare Images |
| **Photo Gallery** | View progress over time | R2 + Images |

**R2 Pricing:** $0.015/GB/month, **no egress fees** (S3 charges $0.09/GB egress)

### Priority 4: Analytics & Insights

| Feature | Description | Cloudflare Service |
|---------|-------------|-------------------|
| **Web Analytics** | Privacy-focused usage tracking | Cloudflare Analytics (Free) |
| **Performance Monitoring** | Core Web Vitals tracking | Cloudflare Analytics |
| **Error Tracking** | Client-side error logging | Workers + KV |

### Priority 5: Advanced Features

| Feature | Description | Service |
|---------|-------------|---------|
| **Realtime Sync** | Live updates across devices | Supabase Realtime |
| **Social Features** | Share workouts, follow friends | Supabase + new tables |
| **Workout Templates** | Save and reuse workout routines | Local DB + sync |
| **Apple Health Sync** | Export to Apple Health | Native API |
| **Wearable Integration** | Import from Garmin, Fitbit | OAuth + APIs |

---

## Cost Projections

### Current (Development)

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Pages | $0 (free tier) |
| Supabase | $0 (free tier: 500MB DB, 50K auth users) |
| Anthropic | ~$5-10 (development usage) |
| **Total** | **~$5-10/month** |

### At Scale (1,000 active users)

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Pages | $0 (unlimited bandwidth) |
| Cloudflare KV | $0 (free tier: 100K reads/day) |
| Supabase Pro | $25/month (8GB DB, unlimited auth) |
| Anthropic | ~$20-50 (with KV caching) |
| **Total** | **~$45-75/month** |

### At Scale (10,000 active users)

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Pro | $20/month |
| Cloudflare KV | $5/month |
| Cloudflare R2 | $10/month (if photos enabled) |
| Supabase Pro | $25/month |
| Anthropic | ~$100-200 (with caching) |
| **Total** | **~$160-260/month** |

---

## Ralph Development Stats

### Completed Work

| Metric | Value |
|--------|-------|
| Total stories completed | 44 |
| Ralph iterations | 42 threads |
| Estimated tokens used | ~850K |
| Estimated Ralph cost | ~$4-6 |
| Development time saved | ~20-30 hours |

### Codebase Patterns Discovered

From `progress.txt`:
- Use `npm run check` to typecheck
- SvelteKit 5 uses `$props()` and `$state()` runes
- Flex layout: `min-height:0` on container, `flex:1` on content, `flex-shrink:0` on footer
- Dexie boolean index uses 0/1, not true/false
- Supabase column mapping: camelCase → snake_case
- Web Speech API needs TypeScript types in app.d.ts

---

## Repository Structure

```
FinishStrong/
├── docs/
│   ├── HOSTING.md          # Hosting comparison
│   └── PLAN.md             # This document
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── db/             # Dexie database
│   │   ├── queue/          # Offline parse queue
│   │   ├── stores/         # Svelte stores
│   │   ├── supabase/       # Supabase client + sync
│   │   └── validation/     # Input/output validation
│   └── routes/
│       ├── api/parse/      # Exercise parsing endpoint
│       ├── api/query/      # Ask questions endpoint
│       ├── ask/            # Ask page
│       ├── dashboard/      # Dashboard page
│       └── login/          # Auth pages
├── supabase/
│   └── migrations/         # SQL migrations
├── static/                 # PWA icons, static assets
├── AGENTS.md               # AI agent guidelines
├── SETUP.md                # Manual setup checklist
├── prd.json                # Product requirements
├── progress.txt            # Ralph progress log
├── prompt.md               # Ralph instructions
└── ralph.sh                # Ralph automation script
```

---

## Next Steps

1. **Complete Phase 2A** - Deploy to Cloudflare Pages
2. **Complete Phase 2B** - Set up production Supabase
3. **Manual testing** - Full end-to-end test
4. **Add PWA icons** - Complete PWA setup
5. **Push to GitHub** - Make repo public or share with testers
6. **Gather feedback** - Beta test with real users
7. **Phase 3 planning** - Prioritize enhancements based on feedback

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 2026 | Use SvelteKit 5 | Modern, fast, good DX |
| Jan 2026 | Use Dexie.js for local DB | Best IndexedDB wrapper, offline-first |
| Jan 2026 | Use Supabase for backend | Auth + Postgres + RLS in one |
| Jan 2026 | Use Claude Haiku for parsing | Fast, cheap, good at structured output |
| Jan 2026 | Host on Cloudflare Pages | Best free tier, unlimited bandwidth |
| Jan 2026 | Keep Supabase (not migrate to D1) | Auth critical, PostgreSQL > SQLite |
| Jan 2026 | Defer auth-5 RLS | Implemented later, now complete |

---

*Last updated: January 2026*
