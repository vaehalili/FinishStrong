import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, Entry, Session, ParseQueueItem } from './types';

export class FinishStrongDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  parseQueue!: EntityTable<ParseQueueItem, 'id'>;

  constructor() {
    super('FinishStrongDB');

    this.version(1).stores({
      exercises: 'id, name, updatedAt',
      entries: 'id, exerciseId, sessionId, createdAt, updatedAt, synced',
      sessions: 'id, date, startedAt, endedAt, updatedAt, synced',
      parseQueue: 'id, status, createdAt'
    });
  }
}

export const db = new FinishStrongDB();

export * from './types';
export { generateId } from './utils';
export { seedExercises } from './seed';
export {
	getAutoSessionName,
	getActiveSession,
	createSession,
	getOrCreateActiveSession,
	endSession,
	isSessionStale,
	updateSession
} from './sessions';
export type { UpdateSessionData } from './sessions';
export { updateEntry, deleteEntry } from './entries';
export type { UpdateEntryData } from './entries';
