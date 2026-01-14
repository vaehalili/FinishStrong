import { db } from './index';
import type { Entry } from './types';

export interface UpdateEntryData {
	weight?: number | null;
	unit?: 'kg' | 'lbs' | null;
	reps?: number | null;
	sets?: number | null;
	notes?: string;
}

export async function updateEntry(id: string, data: UpdateEntryData): Promise<void> {
	const now = new Date().toISOString();
	await db.entries.update(id, {
		...data,
		updatedAt: now,
		synced: false
	});
}
