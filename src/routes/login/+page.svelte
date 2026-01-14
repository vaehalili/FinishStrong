<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, isAuthenticated } from '$lib/stores/auth';

	let mode: 'login' | 'signup' = $state('login');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	$effect(() => {
		if ($isAuthenticated) {
			goto('/');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			if (mode === 'login') {
				const result = await auth.signIn(email, password);
				if (result.error) {
					error = result.error.message;
				}
			} else {
				const result = await auth.signUp(email, password);
				if (result.error) {
					error = result.error.message;
				}
			}
		} catch (e) {
			error = 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		mode = mode === 'login' ? 'signup' : 'login';
		error = '';
	}
</script>

<div class="login-page">
	<div class="login-card">
		<h1 class="logo">💪 FinishStrong</h1>
		<h2>{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>

		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="you@example.com"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="••••••••"
					required
					minlength="6"
					disabled={loading}
				/>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<button type="submit" class="btn-primary" disabled={loading}>
				{#if loading}
					<span class="spinner"></span>
				{:else}
					{mode === 'login' ? 'Log In' : 'Sign Up'}
				{/if}
			</button>
		</form>

		<p class="toggle-text">
			{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
			<button type="button" class="btn-link" onclick={toggleMode} disabled={loading}>
				{mode === 'login' ? 'Sign Up' : 'Log In'}
			</button>
		</p>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background-color: var(--bg-darkest);
	}

	.login-card {
		background-color: var(--bg-dark);
		border-radius: 12px;
		padding: 2rem;
		width: 100%;
		max-width: 360px;
	}

	.logo {
		font-size: 1.5rem;
		text-align: center;
		margin: 0 0 1rem;
	}

	h2 {
		font-size: 1.25rem;
		text-align: center;
		margin: 0 0 1.5rem;
		color: var(--text-primary);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	input {
		background-color: var(--bg-medium);
		border: 1px solid var(--bg-medium);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: var(--text-primary);
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: var(--orange-accent);
	}

	input:disabled {
		opacity: 0.6;
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.error-message {
		background-color: rgba(248, 113, 113, 0.15);
		border: 1px solid var(--red-destructive);
		border-radius: 8px;
		padding: 0.75rem;
		color: var(--red-destructive);
		font-size: 0.875rem;
	}

	.btn-primary {
		background-color: var(--orange-accent);
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: var(--bg-darkest);
		font-size: 1rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 44px;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid var(--bg-darkest);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.toggle-text {
		text-align: center;
		margin-top: 1.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--orange-accent);
		font-size: 0.875rem;
		padding: 0;
	}

	.btn-link:hover:not(:disabled) {
		text-decoration: underline;
	}

	.btn-link:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
