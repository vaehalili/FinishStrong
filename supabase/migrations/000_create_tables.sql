-- FinishStrong Database Schema
-- Run this in Supabase SQL Editor to create all required tables

-- ============================================
-- EXERCISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'strength',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for sync queries
CREATE INDEX IF NOT EXISTS idx_exercises_updated_at ON exercises(updated_at);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    synced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

-- ============================================
-- ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    weight REAL,
    unit TEXT,
    reps INTEGER,
    sets INTEGER,
    notes TEXT,
    date TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    synced BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_session_id ON entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_exercise_id ON entries(exercise_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);

-- ============================================
-- NOTES
-- ============================================
-- Local Dexie DB uses camelCase, Supabase uses snake_case
-- Column mapping handled in src/lib/supabase/sync.ts:
--   exerciseId  -> exercise_id
--   sessionId   -> session_id
--   startedAt   -> started_at
--   endedAt     -> ended_at
--   createdAt   -> created_at
--   updatedAt   -> updated_at
--   userId      -> user_id
--   displayName -> display_name
