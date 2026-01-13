# FinishStrong - Agent Guidelines

## Project Overview

FinishStrong is a voice-first exercise tracking PWA. Users log exercises via natural language (text or voice), which is parsed by Claude Haiku and stored locally with optional cloud sync. Includes historical data browsing, prompt logging for debugging, and user authentication.

## Tech Stack

- **Framework:** SvelteKit 5 with TypeScript
- **Local DB:** Dexie.js (IndexedDB wrapper)
- **Cloud DB:** Supabase (Postgres)
- **LLM:** Claude Haiku (claude-haiku-4-5-20251001)
- **Voice:** Web Speech API
- **PWA:** vite-plugin-pwa
- **Auth:** Supabase Auth (email/password)

## Critical Patterns

### 1. LLM Response Handling

**IMPORTANT:** Claude Haiku sometimes wraps JSON in markdown code blocks. Always strip them:

```typescript
let responseText = message.content[0].type === 'text' ? message.content[0].text : '';
responseText = responseText.trim();
if (responseText.startsWith('```')) {
  responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
}
```

### 2. Parse Prompt Structure

Use this exact prompt structure for exercise parsing:

```typescript
const PARSE_PROMPT = `You are an exercise log parser. Extract exercise information from the user's natural language input.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "exercises": [
    {
      "exercise": "exercise name in lowercase",
      "weight": number or null,
      "unit": "kg" or "lbs" or null,
      "reps": number or null,
      "sets": number or null
    }
  ]
}

Rules:
- Always return an array of exercises, even for single exercise input
- Normalize exercise names: "DL" -> "deadlift", "bench" -> "bench press"
- If no sets mentioned, default to 1 (if reps are given)
- Handle written numbers: "eight" -> 8, "sixty-five" -> 65
- If weight has no unit, assume kg
- "8x3" means 8 reps, 3 sets
- Return null for any field you cannot determine`;
```

### 3. UUID Generation

Use crypto.randomUUID() with fallback for non-secure contexts (dev on local network):

```typescript
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for dev only
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

### 4. Validation Constants

```typescript
export const LIMITS = {
  INPUT_MAX_LENGTH: 300,
  QUERY_MAX_LENGTH: 500,
  WEIGHT_MIN: 0,
  WEIGHT_MAX: 500,
  REPS_MIN: 1,
  REPS_MAX: 100,
  SETS_MIN: 1,
  SETS_MAX: 50
} as const;
```

### 5. Exercise Name Normalization

Always normalize exercise names to lowercase with underscores:

```typescript
const normalizedName = exerciseData.exercise.toLowerCase().replace(/\s+/g, '_');
```

### 6. Session Stale Threshold

Sessions are considered stale after 2 hours of no activity:

```typescript
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
```

### 7. Session Auto-Naming

```typescript
function getAutoSessionName(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning Workout';
  if (hour >= 12 && hour < 17) return 'Afternoon Workout';
  if (hour >= 17 && hour < 21) return 'Evening Workout';
  return 'Night Workout';
}
```

### 8. Voice Input Configuration

Use continuous mode for better multi-exercise capture:

```typescript
recognition.continuous = true;
recognition.interimResults = true;
```

Voice pattern: Tap to start, tap to stop, auto-submit on stop.

### 9. Sync Debouncing

Debounce sync to prevent excessive API calls:

```typescript
const SYNC_DEBOUNCE_MS = 2000;
let syncInProgress = false;
```

### 10. Supabase Column Mapping

Local uses camelCase, Supabase uses snake_case:

| Local | Supabase |
|-------|----------|
| exerciseId | exercise_id |
| sessionId | session_id |
| displayName | display_name |
| startedAt | started_at |
| endedAt | ended_at |
| createdAt | created_at |
| updatedAt | updated_at |
| userId | user_id |

### 11. Dexie Schema Versioning

Always use schema versioning for migrations:

```typescript
db.version(1).stores({...});
db.version(2).stores({...}).upgrade(tx => {...});
```

### 12. Supabase Exercises Table

The Supabase exercises table has a non-nullable `type` column. Always send `type: 'strength'` when syncing:

```typescript
const payload = exercises.map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  display_name: exercise.displayName,
  type: 'strength'
}));
```

### 13. Date-Aware Logging (Historical Data)

**IMPORTANT:** Entries use the **displayed date** from UI, not always `new Date()`. This enables backdating.

```typescript
// viewingDate store tracks which date the user is viewing
import { viewingDate } from '$lib/stores/viewingDate';

// When creating entries, use the viewing date
const entryDate = get(viewingDate); // ISO date string like "2025-01-10"
```

The date shown in the header is the "context date" for all operations:
- New entries go to the displayed date
- Sessions are created for the displayed date
- This allows users to log forgotten workouts from previous days

### 14. Prompt Logging

Log every parse request for debugging and prompt improvement:

```typescript
interface PromptLog {
  id: string;
  timestamp: string;
  raw_input: string;
  parsed_output: object | null;
  success: boolean;
  latency_ms: number;
  model: string;
}
```

Log asynchronously after returning the parse response (don't block the user):

```typescript
// Fire and forget - don't await
logPromptRequest({
  raw_input: input,
  parsed_output: result,
  success: true,
  latency_ms: endTime - startTime,
  model: 'claude-haiku-4-5-20251001'
}).catch(console.error);
```

### 15. Authentication Flow

```typescript
// Check auth state on app load
const { data: { session } } = await supabase.auth.getSession();

// Protect routes
if (!session && requiresAuth) {
  goto('/login');
}

// Include user_id on records
const entry = {
  ...entryData,
  user_id: session.user.id
};
```

### 16. Row Level Security (RLS)

Supabase RLS policies ensure users only see their own data:

```sql
-- Example policy for entries table
CREATE POLICY "Users can only access own entries"
ON entries FOR ALL
USING (auth.uid() = user_id);
```

## File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── AppHeader.svelte (includes date display + navigation)
│   │   ├── TabNav.svelte
│   │   ├── SessionCard.svelte
│   │   ├── DatePicker.svelte
│   │   └── ProgressChart.svelte
│   ├── db/
│   │   ├── index.ts (Dexie schema)
│   │   ├── seed.ts (exercise data)
│   │   ├── sessions.ts (session lifecycle)
│   │   └── mockData.ts
│   ├── queue/
│   │   └── index.ts
│   ├── stores/
│   │   ├── session.ts
│   │   ├── online.ts
│   │   ├── viewingDate.ts (tracks displayed date for historical view)
│   │   └── auth.ts (authentication state)
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── sync.ts
│   │   └── promptLog.ts (prompt logging functions)
│   └── validation/
│       └── index.ts
├── routes/
│   ├── +page.svelte (Log page - respects viewingDate)
│   ├── +layout.svelte
│   ├── ask/+page.svelte
│   ├── dashboard/+page.svelte
│   ├── login/+page.svelte
│   └── api/
│       ├── parse/+server.ts
│       └── query/+server.ts
└── app.css
```

## Color Palette

- Background: #09090b (darkest), #18181b (dark), #27272a (medium)
- Orange accent: #fb923c (brand, active states)
- Green primary: #22c55e (positive actions)
- Red destructive: #f87171 (delete, errors)

## Testing

- **Unit tests:** Vitest for validation functions
- **E2E verification:** Browser MCP for UI flows
- **Run tests:** `npm run test`

## Common Gotchas

1. **Haiku markdown:** Always strip ```json blocks from responses
2. **Secure context:** crypto.randomUUID() requires HTTPS or localhost
3. **Exercise lookup:** Check by both `name` and `id` when finding exercises
4. **Sync order:** Push sessions before entries (entries reference sessions)
5. **iOS PWA:** May break out of standalone mode on navigation (known WebKit bug, acceptable)
6. **Date context:** Always use viewingDate store for entry dates, not new Date()
7. **Prompt logging:** Log asynchronously, don't block parse response
8. **RLS:** user_id must be set on all records for RLS to work
9. **Auth redirect:** Check auth state before accessing protected routes
