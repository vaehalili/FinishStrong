import { db, generateId, type ParseQueueItem } from '$lib/db';

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
