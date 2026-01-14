<script lang="ts">
	import type { Session, Entry, Exercise } from '$lib/db/types';
	import { updateEntry, deleteEntry, updateSession, deleteSession } from '$lib/db';

	interface Props {
		session: Session;
		entries: (Entry & { exercise?: Exercise })[];
	}

	let { session, entries }: Props = $props();
	let isExpanded = $state(true);
	let editingEntryId = $state<string | null>(null);
	let editWeight = $state<number | null>(null);
	let editUnit = $state<'kg' | 'lbs' | null>(null);
	let editReps = $state<number | null>(null);
	let editSets = $state<number | null>(null);

	let isEditingSession = $state(false);
	let editSessionName = $state('');
	let editSessionDate = $state('');
	let editSessionNotes = $state('');

	let confirmingDelete = $state(false);

	function startDeleteSession(e: Event) {
		e.stopPropagation();
		confirmingDelete = true;
	}

	function cancelDeleteSession() {
		confirmingDelete = false;
	}

	async function confirmDeleteSession() {
		await deleteSession(session.id);
		confirmingDelete = false;
	}

	async function handleDelete(entryId: string) {
		await deleteEntry(entryId);
	}

	function startSessionEdit(e: Event) {
		e.stopPropagation();
		editSessionName = session.name;
		editSessionDate = session.date;
		editSessionNotes = session.notes || '';
		isEditingSession = true;
	}

	function cancelSessionEdit() {
		isEditingSession = false;
	}

	async function saveSessionEdit() {
		await updateSession(session.id, {
			name: editSessionName,
			date: editSessionDate,
			notes: editSessionNotes || undefined
		});
		isEditingSession = false;
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

	function startEdit(entry: Entry) {
		editingEntryId = entry.id;
		editWeight = entry.weight;
		editUnit = entry.unit;
		editReps = entry.reps;
		editSets = entry.sets;
	}

	function cancelEdit() {
		editingEntryId = null;
		editWeight = null;
		editUnit = null;
		editReps = null;
		editSets = null;
	}

	async function saveEdit() {
		if (!editingEntryId) return;

		await updateEntry(editingEntryId, {
			weight: editWeight,
			unit: editUnit,
			reps: editReps,
			sets: editSets
		});

		cancelEdit();
	}
</script>

<div class="session-card">
	<div class="session-header-row">
		<button class="session-header" onclick={toggleExpanded}>
			<div class="session-info">
				<span class="session-name">{session.name}</span>
				<span class="session-date">{formatSessionDate(session.date)}</span>
			</div>
			<span class="expand-icon" class:expanded={isExpanded}>▼</span>
		</button>
		<button class="btn-session-edit" onclick={startSessionEdit}>Edit</button>
		{#if confirmingDelete}
			<button class="btn-session-delete-confirm" onclick={confirmDeleteSession}>Confirm</button>
			<button class="btn-session-delete-cancel" onclick={cancelDeleteSession}>Cancel</button>
		{:else}
			<button class="btn-session-delete" onclick={startDeleteSession}>Delete</button>
		{/if}
	</div>

	{#if isExpanded}
		<div class="session-entries">
			{#if entries.length === 0}
				<p class="no-entries">No exercises logged yet</p>
			{:else}
				{#each entries as entry (entry.id)}
					<div class="entry-card">
						{#if editingEntryId === entry.id}
							<div class="entry-name">{entry.exercise?.displayName || 'Unknown Exercise'}</div>
							<div class="edit-form">
								<div class="edit-row">
									<label class="edit-field">
										<span>Weight</span>
										<input
											type="number"
											bind:value={editWeight}
											placeholder="—"
											min="0"
											max="500"
										/>
									</label>
									<label class="edit-field unit-field">
										<span>Unit</span>
										<select bind:value={editUnit}>
											<option value="kg">kg</option>
											<option value="lbs">lbs</option>
										</select>
									</label>
									<label class="edit-field">
										<span>Reps</span>
										<input
											type="number"
											bind:value={editReps}
											placeholder="—"
											min="1"
											max="100"
										/>
									</label>
									<label class="edit-field">
										<span>Sets</span>
										<input
											type="number"
											bind:value={editSets}
											placeholder="—"
											min="1"
											max="50"
										/>
									</label>
								</div>
								<div class="edit-actions">
									<button class="btn-cancel" onclick={cancelEdit}>Cancel</button>
									<button class="btn-save" onclick={saveEdit}>Save</button>
								</div>
							</div>
						{:else}
							<div class="entry-content">
								<div class="entry-info">
									<div class="entry-name">{entry.exercise?.displayName || 'Unknown Exercise'}</div>
									<div class="entry-details">{formatEntry(entry)}</div>
								</div>
								<div class="entry-actions">
									<button class="btn-edit" onclick={() => startEdit(entry)}>Edit</button>
									<button class="btn-delete" onclick={() => handleDelete(entry.id)}>✕</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

{#if isEditingSession}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-overlay" onclick={cancelSessionEdit} role="presentation">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h3 class="modal-title">Edit Session</h3>
			<form class="session-edit-form" onsubmit={(e) => { e.preventDefault(); saveSessionEdit(); }}>
				<label class="form-field">
					<span>Name</span>
					<input type="text" bind:value={editSessionName} required maxlength="100" />
				</label>
				<label class="form-field">
					<span>Date</span>
					<input type="date" bind:value={editSessionDate} required />
				</label>
				<label class="form-field">
					<span>Notes</span>
					<textarea bind:value={editSessionNotes} rows="3" placeholder="Optional notes..."></textarea>
				</label>
				<div class="modal-actions">
					<button type="button" class="btn-cancel" onclick={cancelSessionEdit}>Cancel</button>
					<button type="submit" class="btn-save">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

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

	.entry-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.entry-info {
		flex: 1;
		min-width: 0;
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

	.btn-edit {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--bg-medium);
		color: var(--text-secondary);
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.btn-edit:hover {
		background: var(--orange-accent);
		color: var(--bg-darkest);
	}

	.entry-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn-delete {
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--bg-medium);
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.btn-delete:hover {
		background: var(--red-destructive);
		color: var(--bg-darkest);
		border-color: var(--red-destructive);
	}

	.edit-form {
		margin-top: 0.75rem;
	}

	.edit-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 60px;
	}

	.edit-field.unit-field {
		flex: 0.8;
		min-width: 55px;
	}

	.edit-field span {
		font-size: 0.625rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.edit-field input,
	.edit-field select {
		padding: 0.5rem;
		font-size: 0.875rem;
		background: var(--bg-medium);
		color: var(--text-primary);
		border: 1px solid transparent;
		border-radius: 0.375rem;
		width: 100%;
	}

	.edit-field input:focus,
	.edit-field select:focus {
		outline: none;
		border-color: var(--orange-accent);
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.75rem;
	}

	.btn-cancel,
	.btn-save {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.btn-cancel {
		background: var(--bg-medium);
		color: var(--text-secondary);
	}

	.btn-cancel:hover {
		background: var(--bg-dark);
	}

	.btn-save {
		background: var(--green-primary);
		color: var(--bg-darkest);
	}

	.btn-save:hover {
		opacity: 0.9;
	}

	.session-header-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-session-edit {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--bg-medium);
		color: var(--text-secondary);
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		flex-shrink: 0;
		margin-right: 0.5rem;
	}

	.btn-session-edit:hover {
		background: var(--orange-accent);
		color: var(--bg-darkest);
	}

	.btn-session-delete {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--bg-medium);
		border-radius: 0.375rem;
		cursor: pointer;
		flex-shrink: 0;
		margin-right: 0.5rem;
	}

	.btn-session-delete:hover {
		background: var(--red-destructive);
		color: var(--bg-darkest);
		border-color: var(--red-destructive);
	}

	.btn-session-delete-confirm {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--red-destructive);
		color: var(--bg-darkest);
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.btn-session-delete-confirm:hover {
		opacity: 0.9;
	}

	.btn-session-delete-cancel {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--bg-medium);
		color: var(--text-secondary);
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		flex-shrink: 0;
		margin-right: 0.5rem;
	}

	.btn-session-delete-cancel:hover {
		background: var(--bg-dark);
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal-content {
		background: var(--bg-dark);
		border-radius: 0.75rem;
		padding: 1.25rem;
		width: 100%;
		max-width: 400px;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 1rem 0;
	}

	.session-edit-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-field span {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.form-field input,
	.form-field textarea {
		padding: 0.625rem;
		font-size: 0.9375rem;
		background: var(--bg-medium);
		color: var(--text-primary);
		border: 1px solid transparent;
		border-radius: 0.375rem;
		width: 100%;
		font-family: inherit;
	}

	.form-field input:focus,
	.form-field textarea:focus {
		outline: none;
		border-color: var(--orange-accent);
	}

	.form-field textarea {
		resize: vertical;
		min-height: 60px;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}
</style>
