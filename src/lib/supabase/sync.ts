import { supabase } from './client';
import { db } from '$lib/db';
import type { Exercise, Entry, Session } from '$lib/db/types';
import { browser } from '$app/environment';

const SYNC_DEBOUNCE_MS = 2000;

/**
 * Check if the user is currently authenticated.
 * Sync operations require authentication for RLS to work correctly.
 */
async function isAuthenticated(): Promise<boolean> {
	const { data: { session } } = await supabase.auth.getSession();
	return session !== null;
}
const LAST_PULL_KEY = 'finishstrong_last_pull';
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInProgress = false;

function sessionToSupabase(session: Session) {
	return {
		id: session.id,
		name: session.name,
		date: session.date,
		started_at: session.startedAt,
		ended_at: session.endedAt,
		notes: session.notes || null,
		created_at: session.createdAt,
		updated_at: session.updatedAt,
		user_id: session.userId || null
	};
}

function entryToSupabase(entry: Entry) {
	return {
		id: entry.id,
		exercise_id: entry.exerciseId,
		session_id: entry.sessionId,
		weight: entry.weight,
		unit: entry.unit,
		reps: entry.reps,
		sets: entry.sets,
		notes: entry.notes || null,
		created_at: entry.createdAt,
		updated_at: entry.updatedAt,
		user_id: entry.userId || null
	};
}

function exerciseToSupabase(exercise: Exercise) {
	return {
		id: exercise.id,
		name: exercise.name,
		display_name: exercise.displayName,
		type: 'strength'
	};
}

async function pushSessions(): Promise<string[]> {
	const unsyncedSessions = await db.sessions.where('synced').equals(0).toArray();
	if (unsyncedSessions.length === 0) return [];

	const payload = unsyncedSessions.map(sessionToSupabase);
	const { error } = await supabase.from('sessions').upsert(payload, { onConflict: 'id' });

	if (error) {
		console.error('Failed to push sessions:', error);
		throw error;
	}

	const ids = unsyncedSessions.map((s) => s.id);
	await db.sessions.where('id').anyOf(ids).modify({ synced: true });
	return ids;
}

async function pushEntries(): Promise<string[]> {
	const unsyncedEntries = await db.entries.where('synced').equals(0).toArray();
	if (unsyncedEntries.length === 0) return [];

	const payload = unsyncedEntries.map(entryToSupabase);
	const { error } = await supabase.from('entries').upsert(payload, { onConflict: 'id' });

	if (error) {
		console.error('Failed to push entries:', error);
		throw error;
	}

	const ids = unsyncedEntries.map((e) => e.id);
	await db.entries.where('id').anyOf(ids).modify({ synced: true });
	return ids;
}

async function pushExercises(): Promise<string[]> {
	const allExercises = await db.exercises.toArray();
	if (allExercises.length === 0) return [];

	const payload = allExercises.map(exerciseToSupabase);
	const { error } = await supabase.from('exercises').upsert(payload, { onConflict: 'id' });

	if (error) {
		console.error('Failed to push exercises:', error);
		throw error;
	}

	return allExercises.map((e) => e.id);
}

export async function pushToSupabase(): Promise<{
	sessions: string[];
	entries: string[];
	exercises: string[];
}> {
	if (syncInProgress) {
		return { sessions: [], entries: [], exercises: [] };
	}

	// RLS requires authentication - skip sync if not authenticated
	if (!(await isAuthenticated())) {
		return { sessions: [], entries: [], exercises: [] };
	}

	syncInProgress = true;
	try {
		const exercises = await pushExercises();
		const sessions = await pushSessions();
		const entries = await pushEntries();

		return { sessions, entries, exercises };
	} finally {
		syncInProgress = false;
	}
}

export function debouncedSync(): void {
	if (syncDebounceTimer) {
		clearTimeout(syncDebounceTimer);
	}

	syncDebounceTimer = setTimeout(async () => {
		try {
			await pushToSupabase();
		} catch (error) {
			console.error('Sync failed:', error);
		}
	}, SYNC_DEBOUNCE_MS);
}

export function isSyncInProgress(): boolean {
	return syncInProgress;
}

export async function deleteEntryFromSupabase(entryId: string): Promise<void> {
	const { error } = await supabase.from('entries').delete().eq('id', entryId);
	if (error) {
		console.error('Failed to delete entry from Supabase:', error);
		throw error;
	}
}

function getLastPullTimestamp(): string | null {
	if (!browser) return null;
	return localStorage.getItem(LAST_PULL_KEY);
}

function setLastPullTimestamp(timestamp: string): void {
	if (!browser) return;
	localStorage.setItem(LAST_PULL_KEY, timestamp);
}

interface SupabaseSession {
	id: string;
	name: string;
	date: string;
	started_at: string;
	ended_at: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	user_id: string | null;
}

interface SupabaseEntry {
	id: string;
	exercise_id: string;
	session_id: string;
	weight: number | null;
	unit: 'kg' | 'lbs' | null;
	reps: number | null;
	sets: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	user_id: string | null;
}

interface SupabaseExercise {
	id: string;
	name: string;
	display_name: string;
	type: string;
	updated_at?: string;
}

function supabaseToSession(s: SupabaseSession): Session {
	return {
		id: s.id,
		name: s.name,
		date: s.date,
		startedAt: s.started_at,
		endedAt: s.ended_at,
		notes: s.notes || undefined,
		createdAt: s.created_at,
		updatedAt: s.updated_at,
		synced: true,
		userId: s.user_id || undefined
	};
}

function supabaseToEntry(e: SupabaseEntry): Entry {
	return {
		id: e.id,
		exerciseId: e.exercise_id,
		sessionId: e.session_id,
		weight: e.weight,
		unit: e.unit,
		reps: e.reps,
		sets: e.sets,
		notes: e.notes || undefined,
		createdAt: e.created_at,
		updatedAt: e.updated_at,
		synced: true,
		userId: e.user_id || undefined
	};
}

function supabaseToExercise(e: SupabaseExercise): Exercise {
	return {
		id: e.id,
		name: e.name,
		displayName: e.display_name,
		type: e.type,
		updatedAt: e.updated_at
	};
}

async function pullExercises(lastPull: string | null): Promise<number> {
	let query = supabase.from('exercises').select('*');
	if (lastPull) {
		query = query.gt('updated_at', lastPull);
	}
	const { data, error } = await query;

	if (error) {
		console.error('Failed to pull exercises:', error);
		throw error;
	}

	if (!data || data.length === 0) return 0;

	for (const remote of data as SupabaseExercise[]) {
		const local = await db.exercises.get(remote.id);
		if (!local || (remote.updated_at || '') > (local.updatedAt || '')) {
			await db.exercises.put(supabaseToExercise(remote));
		}
	}

	return data.length;
}

async function pullSessions(lastPull: string | null): Promise<number> {
	let query = supabase.from('sessions').select('*');
	if (lastPull) {
		query = query.gt('updated_at', lastPull);
	}
	const { data, error } = await query;

	if (error) {
		console.error('Failed to pull sessions:', error);
		throw error;
	}

	if (!data || data.length === 0) return 0;

	for (const remote of data as SupabaseSession[]) {
		const local = await db.sessions.get(remote.id);
		if (!local || remote.updated_at > local.updatedAt) {
			await db.sessions.put(supabaseToSession(remote));
		}
	}

	return data.length;
}

async function pullEntries(lastPull: string | null): Promise<number> {
	let query = supabase.from('entries').select('*');
	if (lastPull) {
		query = query.gt('updated_at', lastPull);
	}
	const { data, error } = await query;

	if (error) {
		console.error('Failed to pull entries:', error);
		throw error;
	}

	if (!data || data.length === 0) return 0;

	for (const remote of data as SupabaseEntry[]) {
		const local = await db.entries.get(remote.id);
		if (!local || remote.updated_at > local.updatedAt) {
			await db.entries.put(supabaseToEntry(remote));
		}
	}

	return data.length;
}

export async function pullFromSupabase(): Promise<{
	exercises: number;
	sessions: number;
	entries: number;
}> {
	if (syncInProgress) {
		return { exercises: 0, sessions: 0, entries: 0 };
	}

	// RLS requires authentication - skip sync if not authenticated
	if (!(await isAuthenticated())) {
		return { exercises: 0, sessions: 0, entries: 0 };
	}

	syncInProgress = true;
	try {
		const lastPull = getLastPullTimestamp();
		const pullTime = new Date().toISOString();

		const exercises = await pullExercises(lastPull);
		const sessions = await pullSessions(lastPull);
		const entries = await pullEntries(lastPull);

		setLastPullTimestamp(pullTime);

		return { exercises, sessions, entries };
	} finally {
		syncInProgress = false;
	}
}
