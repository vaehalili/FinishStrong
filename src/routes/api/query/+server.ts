import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { validateQueryLength } from '$lib/validation';

const QUERY_SYSTEM_PROMPT = `You are a helpful fitness assistant that answers questions about the user's workout history.

You will receive:
1. A question from the user about their workout history
2. Their exercise log data in JSON format

Analyze the data to answer their question. Be concise and specific. Include relevant numbers, dates, and exercise names in your response.

If the data doesn't contain enough information to answer the question, say so clearly.

Examples of questions you might receive:
- "What's my bench press PR?"
- "How many times did I work out last week?"
- "What was my heaviest deadlift?"
- "Show me my chest exercises from this week"`;

const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

const MODEL = 'claude-haiku-4-5-20251001';

export interface EntryData {
	id: string;
	date: string;
	exerciseName: string;
	weight: number | null;
	unit: 'kg' | 'lbs' | null;
	reps: number | null;
	sets: number | null;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { query, entries } = body as { query: string; entries: EntryData[] };

		const queryValidation = validateQueryLength(query);
		if (!queryValidation.valid) {
			return json({ success: false, error: queryValidation.error }, { status: 400 });
		}

		if (!Array.isArray(entries)) {
			return json({ success: false, error: 'Entries must be an array' }, { status: 400 });
		}

		const entriesContext =
			entries.length > 0
				? `Here is the user's workout history:\n${JSON.stringify(entries, null, 2)}`
				: 'The user has no workout history yet.';

		const userMessage = `Question: ${query.trim()}\n\n${entriesContext}`;

		const message = await anthropic.messages.create({
			model: MODEL,
			max_tokens: 1024,
			messages: [
				{
					role: 'user',
					content: userMessage
				}
			],
			system: QUERY_SYSTEM_PROMPT
		});

		const answer = message.content[0].type === 'text' ? message.content[0].text : '';

		return json({ success: true, answer: answer.trim() });
	} catch (error) {
		console.error('Query API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
