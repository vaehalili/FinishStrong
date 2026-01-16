<script lang="ts">
	import { db, generateId, getOrCreateActiveSession, type Entry, type Exercise, type Session, type ParseQueueItem } from '$lib/db';
	import { activeSession } from '$lib/stores/session';
	import { isOnline } from '$lib/stores/online';
	import { viewingDate } from '$lib/stores/viewingDate';
	import { getCurrentUserId } from '$lib/stores/auth';
	import { addToParseQueue, processQueue, getPendingQueueItems } from '$lib/queue';
	import { debouncedSync } from '$lib/supabase';
	import { LIMITS } from '$lib/validation';
	import { onMount } from 'svelte';
	import { liveQuery } from 'dexie';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import SessionCard from '$lib/components/SessionCard.svelte';

	let inputValue = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let sessions = $state<Session[]>([]);
	let entriesBySession = $state<Map<string, (Entry & { exercise?: Exercise })[]>>(new Map());
	let pendingQueueItems = $state<ParseQueueItem[]>([]);
	let wasOffline = $state(false);
	let isProcessingQueue = $state(false);

	let isRecording = $state(false);
	let recognition: SpeechRecognition | null = $state(null);
	let speechSupported = $state(false);

	let currentViewingDate = $state(get(viewingDate));

	function loadDataForDate(date: string) {
		const sessionSubscription = liveQuery(() =>
			db.sessions.where('date').equals(date).toArray()
		).subscribe({
			next: (sessionList) => {
				sessions = sessionList.sort(
					(a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
				);
			}
		});

		const entrySubscription = liveQuery(() =>
			db.entries.where('createdAt').startsWith(date).toArray()
		).subscribe({
			next: async (entryList) => {
				const withExercises = await Promise.all(
					entryList.map(async (entry) => {
						const exercise = await db.exercises.get(entry.exerciseId);
						return { ...entry, exercise };
					})
				);
				
				const grouped = new Map<string, (Entry & { exercise?: Exercise })[]>();
				for (const entry of withExercises) {
					const existing = grouped.get(entry.sessionId) || [];
					existing.push(entry);
					grouped.set(entry.sessionId, existing);
				}
				
				for (const [sessionId, entries] of grouped) {
					grouped.set(
						sessionId,
						entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
					);
				}
				
				entriesBySession = grouped;
			}
		});

		return () => {
			sessionSubscription.unsubscribe();
			entrySubscription.unsubscribe();
		};
	}

	onMount(() => {
		if (browser) {
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			if (SpeechRecognition) {
				speechSupported = true;
				recognition = new SpeechRecognition();
				recognition.continuous = true;
				recognition.interimResults = true;
				recognition.lang = 'en-US';

				recognition.onresult = (event: SpeechRecognitionEvent) => {
					let transcript = '';
					for (let i = 0; i < event.results.length; i++) {
						transcript += event.results[i][0].transcript;
					}
					inputValue = transcript;
				};

				recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
					console.error('Speech recognition error:', event.error);
					isRecording = false;
					if (event.error !== 'aborted') {
						error = `Voice error: ${event.error}`;
					}
				};

				recognition.onend = () => {
					if (isRecording) {
						isRecording = false;
						if (inputValue.trim()) {
							handleSubmit();
						}
					}
				};
			}
		}

		let dataCleanup = loadDataForDate(currentViewingDate);

		const viewingDateSubscription = viewingDate.subscribe((date) => {
			if (date !== currentViewingDate) {
				currentViewingDate = date;
				dataCleanup();
				dataCleanup = loadDataForDate(date);
			}
		});

		const queueSubscription = liveQuery(() =>
			db.parseQueue.where('status').equals('pending').toArray()
		).subscribe({
			next: (items) => {
				pendingQueueItems = items.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			}
		});

		const onlineSubscription = isOnline.subscribe(async (online) => {
			if (online && wasOffline) {
				const pending = await getPendingQueueItems();
				if (pending.length > 0 && !isProcessingQueue) {
					isProcessingQueue = true;
					try {
						await processQueue();
					} finally {
						isProcessingQueue = false;
					}
				}
			}
			wasOffline = !online;
		});

		return () => {
			dataCleanup();
			viewingDateSubscription();
			queueSubscription.unsubscribe();
			onlineSubscription();
			if (recognition) {
				recognition.abort();
			}
		};
	});

	function toggleVoice() {
		if (!recognition) return;

		if (isRecording) {
			recognition.stop();
		} else {
			inputValue = '';
			error = '';
			isRecording = true;
			recognition.start();
		}
	}

	async function handleSubmit() {
		if (!inputValue.trim() || isLoading) return;

		const trimmedInput = inputValue.trim();
		isLoading = true;
		error = '';

		if (!get(isOnline)) {
			try {
				await addToParseQueue(trimmedInput);
				inputValue = '';
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to queue input';
			} finally {
				isLoading = false;
			}
			return;
		}

		try {
			const response = await fetch('/api/parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ input: trimmedInput })
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to parse exercise';
				return;
			}

			const now = new Date().toISOString();
			const userId = getCurrentUserId();

			const session = await getOrCreateActiveSession(currentViewingDate, userId);
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
					synced: false,
					userId
				};

				await db.entries.add(entry);
			}

			debouncedSync();
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
</script>

<div class="log-page">
	<div class="content">
		{#if pendingQueueItems.length > 0}
			<div class="pending-section">
				<h3 class="pending-header">Pending (offline)</h3>
				{#each pendingQueueItems as item (item.id)}
					<div class="pending-item">
						<span class="pending-indicator"></span>
						<span class="pending-text">{item.rawInput}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if sessions.length === 0 && pendingQueueItems.length === 0}
			<p class="empty-state">No exercises logged for this date</p>
		{:else if sessions.length > 0}
			<div class="sessions-list">
				{#each sessions as session (session.id)}
					<SessionCard {session} entries={entriesBySession.get(session.id) || []} />
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
			placeholder={isRecording ? 'Listening...' : 'Log an exercise... (e.g., bench press 80kg 8x3)'}
			maxlength={LIMITS.INPUT_MAX_LENGTH}
			disabled={isLoading || isRecording}
			onkeydown={handleKeydown}
		/>
		{#if speechSupported}
			<button
				onclick={toggleVoice}
				disabled={isLoading}
				class="mic-btn"
				class:recording={isRecording}
				aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
			>
				{#if isRecording}
					<span class="mic-pulse"></span>
				{/if}
				🎤
			</button>
		{/if}
		<button onclick={handleSubmit} disabled={isLoading || !inputValue.trim() || isRecording} class="submit-btn">
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
		min-height: 0;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md);
		padding-bottom: var(--space-sm);
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 1.125rem;
		text-align: center;
		margin-top: 5rem;
		line-height: 1.6;
	}

	.sessions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.pending-section {
		margin-bottom: var(--space-md);
	}

	.pending-header {
		color: var(--orange-accent);
		font-size: 0.75rem;
		font-weight: 700;
		margin: 0 0 var(--space-sm) 0;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.pending-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--bg-dark);
		border: 1px solid rgba(251, 146, 60, 0.2);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
		box-shadow: var(--shadow-sm);
	}

	.pending-indicator {
		width: 10px;
		height: 10px;
		background: var(--orange-accent);
		border-radius: 50%;
		flex-shrink: 0;
		animation: pulse-pending 1.5s ease-in-out infinite;
	}

	.pending-text {
		color: var(--text-secondary);
		font-size: 0.9375rem;
		font-style: italic;
	}

	@keyframes pulse-pending {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	.error-message {
		color: var(--red-destructive);
		font-size: 0.875rem;
		font-weight: 500;
		padding: var(--space-md);
		margin: 0 var(--space-md);
		background: rgba(248, 113, 113, 0.1);
		border-radius: var(--radius-md);
		border: 1px solid rgba(248, 113, 113, 0.2);
		flex-shrink: 0;
	}

	.input-area {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md);
		padding-top: var(--space-lg);
		padding-bottom: var(--space-lg);
		border-top: 1px solid var(--bg-medium);
		background: var(--bg-dark);
		flex-shrink: 0;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
	}

	.input-area input {
		flex: 1;
		padding: 1rem 1.125rem;
		background: var(--bg-darkest);
		border: 2px solid var(--bg-medium);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 1.0625rem;
		font-weight: 500;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.input-area input:focus {
		outline: none;
		border-color: var(--orange-accent);
		box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.15);
	}

	.input-area input::placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.input-area input:disabled {
		opacity: 0.6;
	}

	.mic-btn {
		position: relative;
		padding: 1rem 1.125rem;
		background: var(--bg-darkest);
		border: 2px solid var(--bg-medium);
		border-radius: var(--radius-md);
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 56px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mic-btn:hover:not(:disabled) {
		border-color: var(--orange-accent);
		background: rgba(251, 146, 60, 0.1);
	}

	.mic-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.mic-btn.recording {
		background: rgba(251, 146, 60, 0.2);
		border-color: var(--orange-accent);
	}

	.mic-pulse {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: var(--radius-md);
		background: var(--orange-accent);
		opacity: 0.3;
		animation: mic-pulse-anim 1s ease-out infinite;
	}

	@keyframes mic-pulse-anim {
		0% {
			transform: scale(1);
			opacity: 0.3;
		}
		100% {
			transform: scale(1.3);
			opacity: 0;
		}
	}

	.submit-btn {
		padding: 1rem 1.25rem;
		background: var(--green-primary);
		border: none;
		border-radius: var(--radius-md);
		color: white;
		font-size: 1.375rem;
		font-weight: 700;
		min-width: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-md);
		transition: all 0.15s ease;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:not(:disabled):hover {
		background: #16a34a;
		transform: translateY(-1px);
		box-shadow: var(--shadow-lg);
	}

	.submit-btn:not(:disabled):active {
		transform: translateY(0);
	}

	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2.5px solid transparent;
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
