import { writable } from 'svelte/store';
import type { Session } from '$lib/db/types';

/**
 * Store for tracking the currently active session
 */
export const activeSession = writable<Session | null>(null);
