<script lang="ts">
	import { onMount } from 'svelte';
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db';
	import type { Session, Entry, Exercise } from '$lib/db';
	import ProgressChart from '$lib/components/ProgressChart.svelte';
	import FrequencyChart from '$lib/components/FrequencyChart.svelte';
	import { downloadCSV, downloadJSON } from '$lib/export';

	let sessions = $state<Session[]>([]);
	let entries = $state<Entry[]>([]);
	let exercises = $state<Exercise[]>([]);

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

		const exercisesSubscription = liveQuery(() => db.exercises.toArray()).subscribe({
			next: (result) => {
				exercises = result;
			},
			error: (err) => console.error('Exercises query error:', err)
		});

		return () => {
			sessionsSubscription.unsubscribe();
			entriesSubscription.unsubscribe();
			exercisesSubscription.unsubscribe();
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
		{:else}
			<FrequencyChart {sessions} />
			<ProgressChart {entries} {exercises} />

			<div class="export-section">
				<h3 class="section-title">Export Data</h3>
				<div class="export-buttons">
					<button class="export-btn" onclick={() => downloadCSV(entries, sessions, exercises)}>
						📊 Export CSV
					</button>
					<button class="export-btn" onclick={() => downloadJSON(entries, sessions, exercises)}>
						📁 Export JSON
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.dashboard-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--space-md);
		overflow-y: auto;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.section-title {
		color: var(--text-primary);
		font-size: 1.375rem;
		font-weight: 700;
		margin-bottom: var(--space-md);
		letter-spacing: -0.01em;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.stat-card {
		background-color: var(--bg-dark);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		box-shadow: var(--shadow-md);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.stat-card.highlight {
		background-color: var(--orange-accent);
		box-shadow: 0 4px 16px rgba(251, 146, 60, 0.3);
	}

	.stat-card.highlight .stat-value,
	.stat-card.highlight .stat-label {
		color: var(--bg-darkest);
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.stat-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-muted);
		margin-top: var(--space-sm);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 1.125rem;
		text-align: center;
		margin-top: var(--space-xl);
		line-height: 1.6;
	}

	.export-section {
		margin-top: var(--space-lg);
	}

	.export-buttons {
		display: flex;
		gap: var(--space-md);
	}

	.export-btn {
		flex: 1;
		padding: var(--space-md);
		background-color: var(--bg-dark);
		border: 1px solid var(--bg-medium);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: var(--shadow-sm);
	}

	.export-btn:hover {
		background-color: var(--bg-medium);
		border-color: var(--orange-accent);
		transform: translateY(-1px);
	}

	.export-btn:active {
		background-color: var(--orange-accent);
		color: var(--bg-darkest);
		transform: translateY(0);
	}
</style>
