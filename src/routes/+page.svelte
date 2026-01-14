<script lang="ts">
	import { db, generateId, getOrCreateActiveSession, type Entry, type Exercise, type Session } from '$lib/db';
	import { activeSession } from '$lib/stores/session';
	import { LIMITS } from '$lib/validation';
	import { onMount } from 'svelte';
	import { liveQuery } from 'dexie';

	let inputValue = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let entries = $state<(Entry & { exercise?: Exercise })[]>([]);
	let currentSession = $state<Session | null>(null);

	const today = new Date().toISOString().split('T')[0];

	activeSession.subscribe((session) => {
		currentSession = session;
	});

	onMount(() => {
		const subscription = liveQuery(() =>
			db.entries.where('createdAt').startsWith(today).toArray()
		).subscribe({
			next: async (entryList) => {
				const withExercises = await Promise.all(
					entryList.map(async (entry) => {
						const exercise = await db.exercises.get(entry.exerciseId);
						return { ...entry, exercise };
					})
				);
				entries = withExercises.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			}
		});

		return () => subscription.unsubscribe();
	});

	async function handleSubmit() {
		if (!inputValue.trim() || isLoading) return;

		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: inputValue.trim() })
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to parse exercise';
				return;
			}

			const now = new Date().toISOString();

			const session = await getOrCreateActiveSession(today);
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
					synced: false
				};

				await db.entries.add(entry);
			}

			inputValue = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}

	function formatEntry(entry: Entry & { exercise?: Exercise }): string {
		const parts: string[] = [];

		if (entry.weight !== null) {
			parts.push(`${entry.weight}${entry.unit || 'kg'}`);
		}
		if (entry.reps !== null) {
			parts.push(`${entry.reps} reps`);
		}
		if (entry.sets !== null && entry.sets > 1) {
			parts.push(`${entry.sets} sets`);
		}

		return parts.join(' × ');
	}
</script>

<div class="log-page">
	<div class="content">
		{#if entries.length === 0}
			<p class="empty-state">No exercises logged yet today</p>
		{:else}
			<div class="entries-list">
				{#each entries as entry (entry.id)}
					<div class="entry-card">
						<div class="entry-name">{entry.exercise?.displayName || 'Unknown Exercise'}</div>
						<div class="entry-details">{formatEntry(entry)}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<div class="input-area">
		<input
			type="text"
			bind:value={inputValue}
			placeholder="Log an exercise... (e.g., bench press 80kg 8x3)"
			maxlength={LIMITS.INPUT_MAX_LENGTH}
			disabled={isLoading}
			onkeydown={handleKeydown}
		/>
		<button onclick={handleSubmit} disabled={isLoading || !inputValue.trim()} class="submit-btn">
			{#if isLoading}
				<span class="spinner"></span>
			{:else}
				→
			{/if}
		</button>
	</div>
</div>

<style>
	.log-page {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 1rem;
		gap: 1rem;
	}

	.content {
		flex: 1;
		overflow-y: auto;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 1rem;
		text-align: center;
		margin-top: 4rem;
	}

	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.entry-card {
		background: var(--bg-dark);
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.entry-name {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}

	.entry-details {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.error-message {
		color: var(--red-destructive);
		font-size: 0.875rem;
		padding: 0.5rem 1rem;
		background: rgba(248, 113, 113, 0.1);
		border-radius: 0.5rem;
	}

	.input-area {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--bg-medium);
	}

	.input-area input {
		flex: 1;
		padding: 0.875rem 1rem;
		background: var(--bg-dark);
		border: 1px solid var(--bg-medium);
		border-radius: 0.5rem;
		color: var(--text-primary);
		font-size: 1rem;
	}

	.input-area input:focus {
		outline: none;
		border-color: var(--orange-accent);
	}

	.input-area input::placeholder {
		color: var(--text-muted);
	}

	.input-area input:disabled {
		opacity: 0.6;
	}

	.submit-btn {
		padding: 0.875rem 1.25rem;
		background: var(--green-primary);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 1.25rem;
		font-weight: 600;
		min-width: 3.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:not(:disabled):hover {
		background: #16a34a;
	}

	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid transparent;
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
