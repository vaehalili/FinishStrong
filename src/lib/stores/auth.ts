import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase';
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

		supabase.auth.onAuthStateChange((_event, session) => {
			set({
				user: session?.user ?? null,
				session: session,
				loading: false
			});
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
