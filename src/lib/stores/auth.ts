import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase';
import { db } from '$lib/db';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthState {
	user: User | null;
	session: Session | null;
	loading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		session: null,
		loading: true
	});

	async function initialize() {
		if (!browser) return;

		const {
			data: { session }
		} = await supabase.auth.getSession();
		set({
			user: session?.user ?? null,
			session: session,
			loading: false
		});

		// Associate local data with user on initial session load
		if (session?.user?.id) {
			associateLocalDataWithUser(session.user.id).catch(console.error);
		}

		supabase.auth.onAuthStateChange((event, session) => {
			set({
				user: session?.user ?? null,
				session: session,
				loading: false
			});

			// Associate local data when user signs in
			if (event === 'SIGNED_IN' && session?.user?.id) {
				associateLocalDataWithUser(session.user.id).catch(console.error);
			}
		});
	}

	async function signUp(
		email: string,
		password: string
	): Promise<{ error: AuthError | null }> {
		const { error } = await supabase.auth.signUp({
			email,
			password
		});
		return { error };
	}

	async function signIn(
		email: string,
		password: string
	): Promise<{ error: AuthError | null }> {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		return { error };
	}

	async function signOut(): Promise<{ error: AuthError | null }> {
		const { error } = await supabase.auth.signOut();
		return { error };
	}

	return {
		subscribe,
		initialize,
		signUp,
		signIn,
		signOut
	};
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, ($auth) => $auth.user !== null);
export const isAuthLoading = derived(auth, ($auth) => $auth.loading);

/**
 * Get the current user's ID (or undefined if not authenticated)
 */
export function getCurrentUserId(): string | undefined {
	let userId: string | undefined;
	auth.subscribe(($auth) => {
		userId = $auth.user?.id;
	})();
	return userId;
}

/**
 * Associate existing local data (sessions and entries without userId) with the given user.
 * This should be called after first login to claim orphaned local records.
 */
export async function associateLocalDataWithUser(userId: string): Promise<void> {
	const now = new Date().toISOString();

	// Update sessions without userId
	const orphanedSessions = await db.sessions
		.filter((s) => !s.userId)
		.toArray();

	for (const session of orphanedSessions) {
		await db.sessions.update(session.id, {
			userId,
			updatedAt: now,
			synced: false
		});
	}

	// Update entries without userId
	const orphanedEntries = await db.entries
		.filter((e) => !e.userId)
		.toArray();

	for (const entry of orphanedEntries) {
		await db.entries.update(entry.id, {
			userId,
			updatedAt: now,
			synced: false
		});
	}
}
