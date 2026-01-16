<script lang="ts">
	import { db, type Entry, type Exercise } from '$lib/db';
	import { isOnline } from '$lib/stores/online';
	import { LIMITS } from '$lib/validation';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import type { EntryData } from '../api/query/+server';

	let inputValue = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let answer = $state('');
	let currentOnline = $state(true);

	let isRecording = $state(false);
	let recognition: SpeechRecognition | null = $state(null);
	let speechSupported = $state(false);

	const suggestedQuestions = [
		"What's my bench press PR?",
		"How many workouts this week?",
		"What was my heaviest deadlift?",
		"Show my recent exercises"
	];

	onMount(() => {
		currentOnline = get(isOnline);

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

		const onlineSubscription = isOnline.subscribe((online) => {
			currentOnline = online;
		});

		return () => {
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
		answer = '';

		try {
			const allEntries = await db.entries.toArray();
			const entriesWithExercises = await Promise.all(
				allEntries.map(async (entry) => {
					const exercise = await db.exercises.get(entry.exerciseId);
					return { entry, exercise };
				})
			);

			const entryData: EntryData[] = entriesWithExercises.map(({ entry, exercise }) => ({
				id: entry.id,
				date: entry.createdAt.split('T')[0],
				exerciseName: exercise?.displayName || exercise?.name || 'Unknown',
				weight: entry.weight,
				unit: entry.unit,
				reps: entry.reps,
				sets: entry.sets
			}));

			const response = await fetch('/api/query', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: trimmedInput, entries: entryData })
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to get answer';
				return;
			}

			answer = result.answer;
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

	function askSuggested(question: string) {
		inputValue = question;
		handleSubmit();
	}
</script>

<div class="ask-page">
	<div class="content">
		{#if !currentOnline}
			<div class="offline-warning">
				<span class="offline-icon">📡</span>
				<span>You're offline. Questions require an internet connection.</span>
			</div>
		{/if}

		{#if answer}
			<div class="answer-section">
				<h3 class="answer-label">Answer</h3>
				<div class="answer-content">{answer}</div>
			</div>
		{:else if !isLoading}
			<div class="suggestions">
				<p class="suggestions-label">Try asking:</p>
				<div class="suggestion-buttons">
					{#each suggestedQuestions as question}
						<button
							class="suggestion-btn"
							onclick={() => askSuggested(question)}
							disabled={!currentOnline || isLoading}
						>
							{question}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="loading-state">
				<span class="loading-spinner"></span>
				<span>Thinking...</span>
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
			placeholder={isRecording ? 'Listening...' : 'Ask about your workout history...'}
			maxlength={LIMITS.QUERY_MAX_LENGTH}
			disabled={isLoading || isRecording || !currentOnline}
			onkeydown={handleKeydown}
		/>
		{#if speechSupported}
			<button
				onclick={toggleVoice}
				disabled={isLoading || !currentOnline}
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
		<button
			onclick={handleSubmit}
			disabled={isLoading || !inputValue.trim() || isRecording || !currentOnline}
			class="submit-btn"
		>
			{#if isLoading}
				<span class="spinner"></span>
			{:else}
				→
			{/if}
		</button>
	</div>
</div>

<style>
	.ask-page {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.offline-warning {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: rgba(251, 146, 60, 0.12);
		border: 1px solid rgba(251, 146, 60, 0.3);
		border-radius: var(--radius-md);
		color: var(--orange-accent);
		font-size: 0.9375rem;
		font-weight: 500;
		box-shadow: var(--shadow-sm);
	}

	.offline-icon {
		font-size: 1.375rem;
	}

	.suggestions {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-top: var(--space-xl);
	}

	.suggestions-label {
		color: var(--text-muted);
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.suggestion-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.suggestion-btn {
		padding: var(--space-md);
		background: var(--bg-dark);
		border: 1px solid var(--bg-medium);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 0.9375rem;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: var(--shadow-sm);
	}

	.suggestion-btn:hover:not(:disabled) {
		background: var(--bg-medium);
		border-color: var(--orange-accent);
		transform: translateX(4px);
	}

	.suggestion-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.answer-section {
		background: var(--bg-dark);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		box-shadow: var(--shadow-md);
	}

	.answer-label {
		color: var(--orange-accent);
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0 0 var(--space-md) 0;
	}

	.answer-content {
		color: var(--text-primary);
		font-size: 1.0625rem;
		line-height: 1.7;
		white-space: pre-wrap;
	}

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-xl);
		color: var(--text-muted);
		font-weight: 500;
	}

	.loading-spinner {
		width: 1.75rem;
		height: 1.75rem;
		border: 2.5px solid var(--bg-medium);
		border-top-color: var(--orange-accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
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
