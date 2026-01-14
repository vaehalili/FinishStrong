import { db } from './index';
import { generateId } from './utils';
import type { Session } from './types';

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Get auto-generated session name based on time of day
 */
export function getAutoSessionName(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) return 'Morning Workout';
	if (hour >= 12 && hour < 17) return 'Afternoon Workout';
	if (hour >= 17 && hour < 21) return 'Evening Workout';
	return 'Night Workout';
}

/**
 * Check if a session is stale (no activity for 2 hours)
 * Uses the most recent entry time or session startedAt if no entries
 */
export async function isSessionStale(session: Session): Promise<boolean> {
	const lastEntry = await db.entries
		.where('sessionId')
		.equals(session.id)
		.reverse()
		.sortBy('createdAt')
		.then((entries) => entries[0]);

	const lastActivityTime = lastEntry
		? new Date(lastEntry.createdAt).getTime()
		: new Date(session.startedAt).getTime();

	const now = Date.now();
	return now - lastActivityTime > STALE_THRESHOLD_MS;
}

/**
 * Get the active session for a given date (session with no endedAt)
 */
export async function getActiveSession(date: string): Promise<Session | undefined> {
	return db.sessions.where('date').equals(date).and((s) => s.endedAt === null).first();
}

/**
 * Create a new session for a given date
 */
export async function createSession(date: string): Promise<Session> {
	const now = new Date().toISOString();
	const session: Session = {
		id: generateId(),
		name: getAutoSessionName(),
		date,
		startedAt: now,
		endedAt: null,
		createdAt: now,
		updatedAt: now,
		synced: false
	};

	await db.sessions.add(session);
	return session;
}

/**
 * Get or create an active session for a given date
 * Returns the existing active session if one exists and is not stale
 * If the existing session is stale, ends it and creates a new one
 */
export async function getOrCreateActiveSession(date: string): Promise<Session> {
	const existing = await getActiveSession(date);
	if (existing) {
		const stale = await isSessionStale(existing);
		if (stale) {
			await endSession(existing.id);
			return createSession(date);
		}
		return existing;
	}
	return createSession(date);
}

/**
 * End a session by setting its endedAt timestamp
 */
export async function endSession(sessionId: string): Promise<void> {
	const now = new Date().toISOString();
	await db.sessions.update(sessionId, {
		endedAt: now,
		updatedAt: now
	});
}
