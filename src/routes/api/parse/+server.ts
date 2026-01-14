import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { validateInputLength, validateLLMResponse, type ParsedExercise } from '$lib/validation';
import { logPromptRequest } from '$lib/supabase/promptLog';

const PARSE_PROMPT = `You are an exercise log parser. Extract exercise information from the user's natural language input.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "exercises": [
    {
      "exercise": "exercise name in lowercase",
      "weight": number or null,
      "unit": "kg" or "lbs" or null,
      "reps": number or null,
      "sets": number or null
    }
  ]
}

Rules:
- Always return an array of exercises, even for single exercise input
- Normalize exercise names: "DL" -> "deadlift", "bench" -> "bench press"
- If no sets mentioned, default to 1 (if reps are given)
- Handle written numbers: "eight" -> 8, "sixty-five" -> 65
- If weight has no unit, assume kg
- "8x3" means 8 reps, 3 sets
- Return null for any field you cannot determine`;

const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

const MODEL = 'claude-haiku-4-5-20251001';

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();
	let rawInput = '';

	try {
		const body = await request.json();
		const { input } = body;
		rawInput = input || '';

		const inputValidation = validateInputLength(input);
		if (!inputValidation.valid) {
			logPromptRequest({
				raw_input: rawInput,
				parsed_output: null,
				success: false,
				latency_ms: Date.now() - startTime,
				model: MODEL
			}).catch(console.error);

			return json({ success: false, error: inputValidation.error }, { status: 400 });
		}

		const message = await anthropic.messages.create({
			model: MODEL,
			max_tokens: 1024,
			messages: [
				{
					role: 'user',
					content: input.trim()
				}
			],
			system: PARSE_PROMPT
		});

		let responseText = message.content[0].type === 'text' ? message.content[0].text : '';
		responseText = responseText.trim();
		if (responseText.startsWith('```')) {
			responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(responseText);
		} catch {
			logPromptRequest({
				raw_input: rawInput,
				parsed_output: null,
				success: false,
				latency_ms: Date.now() - startTime,
				model: MODEL
			}).catch(console.error);

			return json(
				{ success: false, error: 'Failed to parse LLM response as JSON' },
				{ status: 500 }
			);
		}

		const validation = validateLLMResponse(parsed);
		if (!validation.valid) {
			logPromptRequest({
				raw_input: rawInput,
				parsed_output: parsed as object,
				success: false,
				latency_ms: Date.now() - startTime,
				model: MODEL
			}).catch(console.error);

			return json({ success: false, error: validation.error }, { status: 500 });
		}

		const exercises: ParsedExercise[] = validation.data!.exercises;

		logPromptRequest({
			raw_input: rawInput,
			parsed_output: { exercises },
			success: true,
			latency_ms: Date.now() - startTime,
			model: MODEL
		}).catch(console.error);

		return json({ success: true, data: exercises });
	} catch (error) {
		console.error('Parse API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		logPromptRequest({
			raw_input: rawInput,
			parsed_output: null,
			success: false,
			latency_ms: Date.now() - startTime,
			model: MODEL
		}).catch(console.error);

		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
