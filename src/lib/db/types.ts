export interface Exercise {
  id: string;
  name: string; // normalized: lowercase with underscores
  displayName: string;
  type?: string; // 'strength' default for Supabase sync
}

export interface Entry {
  id: string;
  exerciseId: string;
  sessionId: string;
  weight: number | null;
  unit: 'kg' | 'lbs' | null;
  reps: number | null;
  sets: number | null;
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  synced: boolean;
  userId?: string;
}

export interface Session {
  id: string;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startedAt: string; // ISO string
  endedAt: string | null; // ISO string, null if active
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  userId?: string;
}

export type ParseQueueStatus = 'pending' | 'parsed' | 'failed';

export interface ParseQueueItem {
  id: string;
  rawInput: string;
  status: ParseQueueStatus;
  createdAt: string;
  processedAt?: string;
  error?: string;
}
