import { supabase } from './client';
import { db } from '$lib/db';
import type { Exercise, Entry, Session } from '$lib/db/types';

const SYNC_DEBOUNCE_MS = 2000;
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
