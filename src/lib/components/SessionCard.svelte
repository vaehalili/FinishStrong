<script lang="ts">
	import type { Session, Entry, Exercise } from '$lib/db/types';

	interface Props {
		session: Session;
		entries: (Entry & { exercise?: Exercise })[];
	}

	let { session, entries }: Props = $props();
	let isExpanded = $state(true);

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

	function formatSessionDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

<div class="session-card">
	<button class="session-header" onclick={toggleExpanded}>
		<div class="session-info">
			<span class="session-name">{session.name}</span>
			<span class="session-date">{formatSessionDate(session.date)}</span>
		</div>
		<span class="expand-icon" class:expanded={isExpanded}>▼</span>
	</button>

	{#if isExpanded}
		<div class="session-entries">
			{#if entries.length === 0}
				<p class="no-entries">No exercises logged yet</p>
			{:else}
				{#each entries as entry (entry.id)}
					<div class="entry-card">
						<div class="entry-name">{entry.exercise?.displayName || 'Unknown Exercise'}</div>
						<div class="entry-details">{formatEntry(entry)}</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.session-card {
		background: var(--bg-dark);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.session-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 1rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--text-primary);
	}

	.session-header:hover {
		background: var(--bg-medium);
	}

	.session-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.session-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.session-date {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.expand-icon {
		font-size: 0.75rem;
		color: var(--text-muted);
		transition: transform 0.2s ease;
	}

	.expand-icon.expanded {
		transform: rotate(180deg);
	}

	.session-entries {
		border-top: 1px solid var(--bg-medium);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.no-entries {
		color: var(--text-muted);
		font-size: 0.875rem;
		text-align: center;
		padding: 0.5rem;
	}

	.entry-card {
		background: var(--bg-darkest);
		border-radius: 0.5rem;
		padding: 0.75rem;
	}

	.entry-name {
		font-weight: 600;
		font-size: 0.9375rem;
		margin-bottom: 0.125rem;
	}

	.entry-details {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}
</style>
