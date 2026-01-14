-- Create prompt_logs table for LLM request logging
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS prompt_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_input TEXT NOT NULL,
    parsed_output JSONB,
    success BOOLEAN NOT NULL DEFAULT false,
    latency_ms INTEGER NOT NULL,
    model TEXT NOT NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_prompt_logs_timestamp ON prompt_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_logs_success ON prompt_logs(success);
CREATE INDEX IF NOT EXISTS idx_prompt_logs_model ON prompt_logs(model);

-- Enable RLS but allow all inserts (logs are write-only from client)
ALTER TABLE prompt_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from authenticated and anonymous users (anon key)
CREATE POLICY "Allow inserts to prompt_logs" ON prompt_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy: Only allow reads from service role (for dashboard viewing)
CREATE POLICY "Allow service role reads" ON prompt_logs
    FOR SELECT
    USING (auth.role() = 'service_role');
