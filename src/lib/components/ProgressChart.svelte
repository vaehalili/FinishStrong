<script lang="ts">
	import type { Entry, Exercise } from '$lib/db';

	interface Props {
		entries: Entry[];
		exercises: Exercise[];
	}

	let { entries, exercises }: Props = $props();

	let selectedExerciseId = $state<string>('');

	const exercisesWithData = $derived(() => {
		const exerciseIds = new Set(entries.filter((e) => e.weight !== null).map((e) => e.exerciseId));
		return exercises.filter((ex) => exerciseIds.has(ex.id));
	});

	$effect(() => {
		const available = exercisesWithData();
		if (available.length > 0 && !selectedExerciseId) {
			selectedExerciseId = available[0].id;
		}
	});

	const chartData = $derived(() => {
		if (!selectedExerciseId) return [];

		const relevantEntries = entries.filter(
			(e) => e.exerciseId === selectedExerciseId && e.weight !== null
		);

		const byDate = new Map<string, number>();
		for (const entry of relevantEntries) {
			const date = entry.createdAt.split('T')[0];
			const currentMax = byDate.get(date) ?? 0;
			if (entry.weight! > currentMax) {
				byDate.set(date, entry.weight!);
			}
		}

		const sorted = Array.from(byDate.entries())
			.map(([date, weight]) => ({ date, weight }))
			.sort((a, b) => a.date.localeCompare(b.date));

		return sorted;
	});

	const chartWidth = 300;
	const chartHeight = 150;
	const padding = { top: 20, right: 20, bottom: 30, left: 40 };

	const plotWidth = $derived(chartWidth - padding.left - padding.right);
	const plotHeight = $derived(chartHeight - padding.top - padding.bottom);

	const scales = $derived(() => {
		const data = chartData();
		if (data.length === 0) return { xScale: () => 0, yScale: () => 0, yMin: 0, yMax: 0 };

		const weights = data.map((d) => d.weight);
		const yMin = Math.floor(Math.min(...weights) * 0.9);
		const yMax = Math.ceil(Math.max(...weights) * 1.1);

		const xScale = (i: number) => {
			if (data.length === 1) return plotWidth / 2;
			return (i / (data.length - 1)) * plotWidth;
		};

		const yScale = (weight: number) => {
			if (yMax === yMin) return plotHeight / 2;
			return plotHeight - ((weight - yMin) / (yMax - yMin)) * plotHeight;
		};

		return { xScale, yScale, yMin, yMax };
	});

	const linePath = $derived(() => {
		const data = chartData();
		const { xScale, yScale } = scales();
		if (data.length === 0) return '';

		return data
			.map((d, i) => {
				const x = padding.left + xScale(i);
				const y = padding.top + yScale(d.weight);
				return `${i === 0 ? 'M' : 'L'}${x},${y}`;
			})
			.join(' ');
	});

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="progress-chart">
	<div class="chart-header">
		<h3 class="chart-title">Progress</h3>
		<select class="exercise-select" bind:value={selectedExerciseId}>
			{#each exercisesWithData() as exercise}
				<option value={exercise.id}>{exercise.displayName}</option>
			{/each}
		</select>
	</div>

	{#if chartData().length === 0}
		<div class="empty-chart">
			<p>No weight data for this exercise</p>
		</div>
	{:else}
		<svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart-svg">
			<!-- Y axis labels -->
			<text x={padding.left - 8} y={padding.top} class="axis-label" text-anchor="end">
				{scales().yMax}
			</text>
			<text x={padding.left - 8} y={padding.top + plotHeight} class="axis-label" text-anchor="end">
				{scales().yMin}
			</text>
			<text
				x={padding.left - 8}
				y={padding.top + plotHeight / 2}
				class="axis-label"
				text-anchor="end"
			>
				{Math.round((scales().yMax + scales().yMin) / 2)}
			</text>

			<!-- Grid lines -->
			<line
				x1={padding.left}
				y1={padding.top}
				x2={padding.left + plotWidth}
				y2={padding.top}
				class="grid-line"
			/>
			<line
				x1={padding.left}
				y1={padding.top + plotHeight / 2}
				x2={padding.left + plotWidth}
				y2={padding.top + plotHeight / 2}
				class="grid-line"
			/>
			<line
				x1={padding.left}
				y1={padding.top + plotHeight}
				x2={padding.left + plotWidth}
				y2={padding.top + plotHeight}
				class="grid-line"
			/>

			<!-- Line chart -->
			<path d={linePath()} class="chart-line" />

			<!-- Data points -->
			{#each chartData() as point, i}
				<circle
					cx={padding.left + scales().xScale(i)}
					cy={padding.top + scales().yScale(point.weight)}
					r="4"
					class="data-point"
				/>
			{/each}

			<!-- X axis labels (first and last) -->
			{#if chartData().length > 0}
				<text
					x={padding.left}
					y={chartHeight - 5}
					class="axis-label"
					text-anchor="start"
				>
					{formatDate(chartData()[0].date)}
				</text>
				{#if chartData().length > 1}
					<text
						x={padding.left + plotWidth}
						y={chartHeight - 5}
						class="axis-label"
						text-anchor="end"
					>
						{formatDate(chartData()[chartData().length - 1].date)}
					</text>
				{/if}
			{/if}
		</svg>
	{/if}
</div>

<style>
	.progress-chart {
		background-color: var(--bg-dark);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.chart-title {
		color: var(--text-primary);
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.exercise-select {
		background-color: var(--bg-medium);
		color: var(--text-primary);
		border: none;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.exercise-select:focus {
		outline: 2px solid var(--orange-accent);
		outline-offset: 2px;
	}

	.chart-svg {
		width: 100%;
		height: auto;
	}

	.chart-line {
		fill: none;
		stroke: var(--orange-accent);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.data-point {
		fill: var(--orange-accent);
	}

	.grid-line {
		stroke: var(--bg-medium);
		stroke-width: 1;
	}

	.axis-label {
		fill: var(--text-muted);
		font-size: 10px;
	}

	.empty-chart {
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-chart p {
		color: var(--text-muted);
		font-size: 0.875rem;
	}
</style>
