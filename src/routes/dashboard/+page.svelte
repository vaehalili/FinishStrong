<script lang="ts">
	import { onMount } from 'svelte';
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db';
	import type { Session, Entry } from '$lib/db';

	let sessions = $state<Session[]>([]);
	let entries = $state<Entry[]>([]);

	function getStartOfWeek(): Date {
		const now = new Date();
		const dayOfWeek = now.getDay();
		const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
		const monday = new Date(now.setDate(diff));
		monday.setHours(0, 0, 0, 0);
		return monday;
	}

	const totalWorkouts = $derived(sessions.length);
	const totalExercises = $derived(entries.length);
	const uniqueExerciseTypes = $derived(new Set(entries.map((e) => e.exerciseId)).size);
	const thisWeekWorkouts = $derived(() => {
		const weekStart = getStartOfWeek();
		return sessions.filter((s) => new Date(s.date) >= weekStart).length;
	});

	onMount(() => {
		const sessionsSubscription = liveQuery(() => db.sessions.toArray()).subscribe({
			next: (result) => {
				sessions = result;
			},
			error: (err) => console.error('Sessions query error:', err)
		});

		const entriesSubscription = liveQuery(() => db.entries.toArray()).subscribe({
			next: (result) => {
				entries = result;
			},
			error: (err) => console.error('Entries query error:', err)
		});

		return () => {
			sessionsSubscription.unsubscribe();
			entriesSubscription.unsubscribe();
		};
	});
</script>

<div class="dashboard-page">
	<div class="content">
		<h2 class="section-title">Your Stats</h2>

		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-value">{totalWorkouts}</span>
				<span class="stat-label">Total Workouts</span>
			</div>

			<div class="stat-card">
				<span class="stat-value">{totalExercises}</span>
				<span class="stat-label">Total Exercises</span>
			</div>

			<div class="stat-card">
				<span class="stat-value">{uniqueExerciseTypes}</span>
				<span class="stat-label">Unique Exercises</span>
			</div>

			<div class="stat-card highlight">
				<span class="stat-value">{thisWeekWorkouts()}</span>
				<span class="stat-label">This Week</span>
			</div>
		</div>

		{#if totalWorkouts === 0}
			<p class="empty-state">No workouts logged yet. Start tracking!</p>
		{/if}
	</div>
</div>

<style>
	.dashboard-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 1rem;
		overflow-y: auto;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.section-title {
		color: var(--text-primary);
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background-color: var(--bg-dark);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.stat-card.highlight {
		background-color: var(--orange-accent);
	}

	.stat-card.highlight .stat-value,
	.stat-card.highlight .stat-label {
		color: var(--bg-darkest);
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-top: 0.5rem;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 1rem;
		text-align: center;
		margin-top: 2rem;
	}
</style>
