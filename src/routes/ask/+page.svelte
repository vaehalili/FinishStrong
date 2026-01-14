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
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.offline-warning {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(251, 146, 60, 0.15);
		border: 1px solid var(--orange-accent);
		border-radius: 0.5rem;
		color: var(--orange-accent);
		font-size: 0.875rem;
	}

	.offline-icon {
		font-size: 1.25rem;
	}

	.suggestions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 2rem;
	}

	.suggestions-label {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.suggestion-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.suggestion-btn {
		padding: 0.75rem 1rem;
		background: var(--bg-dark);
		border: 1px solid var(--bg-medium);
		border-radius: 0.5rem;
		color: var(--text-primary);
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.suggestion-btn:hover:not(:disabled) {
		background: var(--bg-medium);
		border-color: var(--orange-accent);
	}

	.suggestion-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.answer-section {
		background: var(--bg-dark);
		border: 1px solid var(--bg-medium);
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.answer-label {
		color: var(--orange-accent);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem 0;
	}

	.answer-content {
		color: var(--text-primary);
		font-size: 1rem;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		color: var(--text-muted);
	}

	.loading-spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid var(--bg-medium);
		border-top-color: var(--orange-accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.error-message {
		color: var(--red-destructive);
		font-size: 0.875rem;
		padding: 0.75rem 1rem;
		margin: 0 1rem;
		background: rgba(248, 113, 113, 0.1);
		border-radius: 0.5rem;
		flex-shrink: 0;
	}

	.input-area {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--bg-medium);
		background: var(--bg-darkest);
		flex-shrink: 0;
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

	.mic-btn {
		position: relative;
		padding: 0.875rem 1rem;
		background: var(--bg-dark);
		border: 1px solid var(--bg-medium);
		border-radius: 0.5rem;
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 3.5rem;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.mic-btn:hover:not(:disabled) {
		border-color: var(--orange-accent);
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
		border-radius: 0.5rem;
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
