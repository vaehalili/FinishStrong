<script lang="ts">
	import type { Session } from '$lib/db';

	interface Props {
		sessions: Session[];
	}

	let { sessions }: Props = $props();

	function getWeekStart(date: Date): Date {
		const d = new Date(date);
		const dayOfWeek = d.getDay();
		const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
		d.setDate(diff);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function getWeekLabel(weekStart: Date): string {
		return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	const chartData = $derived(() => {
		const weeks: { weekStart: Date; label: string; count: number }[] = [];
		
		const now = new Date();
		const currentWeekStart = getWeekStart(now);
		
		for (let i = 7; i >= 0; i--) {
			const weekStart = new Date(currentWeekStart);
			weekStart.setDate(weekStart.getDate() - i * 7);
			weeks.push({
				weekStart,
				label: getWeekLabel(weekStart),
				count: 0
			});
		}

		for (const session of sessions) {
			const sessionDate = new Date(session.date + 'T00:00:00');
			const sessionWeekStart = getWeekStart(sessionDate);
			
			for (const week of weeks) {
				if (week.weekStart.getTime() === sessionWeekStart.getTime()) {
					week.count++;
					break;
				}
			}
		}

		return weeks;
	});

	const chartWidth = 300;
	const chartHeight = 150;
	const padding = { top: 20, right: 10, bottom: 40, left: 30 };

	const plotWidth = $derived(chartWidth - padding.left - padding.right);
	const plotHeight = $derived(chartHeight - padding.top - padding.bottom);

	const maxCount = $derived(() => {
		const data = chartData();
		const max = Math.max(...data.map((d) => d.count), 1);
		return max;
	});

	const barWidth = $derived(plotWidth / 8 - 4);

	const bars = $derived(() => {
		const data = chartData();
		const max = maxCount();
		
		return data.map((d, i) => {
			const x = padding.left + (i * plotWidth) / 8 + 2;
			const barHeight = (d.count / max) * plotHeight;
			const y = padding.top + plotHeight - barHeight;
			
			return {
				x,
				y,
				width: barWidth,
				height: barHeight,
				count: d.count,
				label: d.label
			};
		});
	});
</script>

<div class="frequency-chart">
	<h3 class="chart-title">Workout Frequency</h3>

	<svg viewBox="0 0 {chartWidth} {chartHeight}" class="chart-svg">
		<!-- Y axis labels -->
		<text x={padding.left - 8} y={padding.top + 4} class="axis-label" text-anchor="end">
			{maxCount()}
		</text>
		<text x={padding.left - 8} y={padding.top + plotHeight} class="axis-label" text-anchor="end">
			0
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
			y1={padding.top + plotHeight}
			x2={padding.left + plotWidth}
			y2={padding.top + plotHeight}
			class="grid-line"
		/>

		<!-- Bars -->
		{#each bars() as bar, i}
			<rect
				x={bar.x}
				y={bar.y}
				width={bar.width}
				height={bar.height}
				class="bar"
				class:current={i === 7}
			/>
			{#if bar.count > 0}
				<text
					x={bar.x + bar.width / 2}
					y={bar.y - 4}
					class="bar-label"
					text-anchor="middle"
				>
					{bar.count}
				</text>
			{/if}
		{/each}

		<!-- X axis labels (every other week to avoid crowding) -->
		{#each bars() as bar, i}
			{#if i % 2 === 0 || i === 7}
				<text
					x={bar.x + bar.width / 2}
					y={chartHeight - 8}
					class="axis-label x-label"
					text-anchor="middle"
					transform="rotate(-30, {bar.x + bar.width / 2}, {chartHeight - 8})"
				>
					{bar.label}
				</text>
			{/if}
		{/each}
	</svg>
</div>

<style>
	.frequency-chart {
		background-color: var(--bg-dark);
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.chart-title {
		color: var(--text-primary);
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.chart-svg {
		width: 100%;
		height: auto;
	}

	.bar {
		fill: var(--bg-medium);
	}

	.bar.current {
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

	.x-label {
		font-size: 8px;
	}

	.bar-label {
		fill: var(--text-primary);
		font-size: 10px;
		font-weight: 600;
	}
</style>
