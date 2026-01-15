-- Row Level Security Policies for FinishStrong
-- Run this AFTER auth-5 story is complete
-- Ensures users can only access their own data

-- ============================================
-- SESSIONS RLS
-- ============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own sessions
CREATE POLICY "Users can insert own sessions" ON sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own sessions
CREATE POLICY "Users can delete own sessions" ON sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ENTRIES RLS
-- ============================================
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own entries
CREATE POLICY "Users can view own entries" ON entries
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own entries
CREATE POLICY "Users can insert own entries" ON entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own entries
CREATE POLICY "Users can update own entries" ON entries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own entries
CREATE POLICY "Users can delete own entries" ON entries
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- EXERCISES RLS
-- ============================================
-- Exercises are shared across all users (reference data)
-- Allow read access to all authenticated users
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercises are readable by all" ON exercises
    FOR SELECT
    USING (true);

-- Only allow inserts from authenticated users
CREATE POLICY "Authenticated users can insert exercises" ON exercises
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only allow updates from authenticated users
CREATE POLICY "Authenticated users can update exercises" ON exercises
    FOR UPDATE
    USING (auth.role() = 'authenticated');
