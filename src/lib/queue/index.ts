import { db, generateId, getOrCreateActiveSession, type ParseQueueItem, type Entry } from '$lib/db';
import { activeSession } from '$lib/stores/session';
import { getCurrentUserId } from '$lib/stores/auth';
import { debouncedSync } from '$lib/supabase';

let processingQueue = false;

export async function addToParseQueue(rawInput: string): Promise<ParseQueueItem> {
	const now = new Date().toISOString();
	const item: ParseQueueItem = {
		id: generateId(),
		rawInput,
		status: 'pending',
		createdAt: now
	};
	await db.parseQueue.add(item);
	return item;
}

export async function getPendingQueueItems(): Promise<ParseQueueItem[]> {
	return db.parseQueue.where('status').equals('pending').toArray();
}

export async function markQueueItemParsed(id: string): Promise<void> {
	await db.parseQueue.update(id, {
		status: 'parsed',
		processedAt: new Date().toISOString()
	});
}

export async function markQueueItemFailed(id: string, error: string): Promise<void> {
	await db.parseQueue.update(id, {
		status: 'failed',
		processedAt: new Date().toISOString(),
		error
	});
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
	if (processingQueue) {
		return { processed: 0, failed: 0 };
	}

	processingQueue = true;
	let processed = 0;
	let failed = 0;

	try {
		const pendingItems = await getPendingQueueItems();

		for (const item of pendingItems) {
			try {
				const response = await fetch('/api/parse', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ input: item.rawInput })
				});

				const result = await response.json();

				if (!result.success) {
					await markQueueItemFailed(item.id, result.error || 'Failed to parse');
					failed++;
					continue;
				}

				const now = new Date().toISOString();
				const today = now.split('T')[0];
				const userId = getCurrentUserId();
				const session = await getOrCreateActiveSession(today, userId);
				activeSession.set(session);

				for (const parsed of result.data) {
					const normalizedName = parsed.exercise.toLowerCase().replace(/\s+/g, '_');

					let exercise = await db.exercises.where('name').equals(normalizedName).first();
					if (!exercise) {
						exercise = {
							id: generateId(),
							name: normalizedName,
							displayName: parsed.exercise
								.split(' ')
								.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
								.join(' ')
						};
						await db.exercises.add(exercise);
					}

					const entry: Entry = {
						id: generateId(),
						exerciseId: exercise.id,
						sessionId: session.id,
						weight: parsed.weight,
						unit: parsed.unit,
						reps: parsed.reps,
						sets: parsed.sets ?? 1,
						createdAt: now,
						updatedAt: now,
						synced: false,
						userId
					};

					await db.entries.add(entry);
				}

				await markQueueItemParsed(item.id);
				processed++;
				debouncedSync();
			} catch (err) {
				await markQueueItemFailed(item.id, err instanceof Error ? err.message : 'Unknown error');
				failed++;
			}
		}
	} finally {
		processingQueue = false;
	}

	return { processed, failed };
}
