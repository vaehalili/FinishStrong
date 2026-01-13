import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { validateInputLength, validateLLMResponse, type ParsedExercise } from '$lib/validation';

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

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { input } = body;

		const inputValidation = validateInputLength(input);
		if (!inputValidation.valid) {
			return json({ success: false, error: inputValidation.error }, { status: 400 });
		}

		const message = await anthropic.messages.create({
			model: 'claude-haiku-4-5-20251001',
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
			return json(
				{ success: false, error: 'Failed to parse LLM response as JSON' },
				{ status: 500 }
			);
		}

		const validation = validateLLMResponse(parsed);
		if (!validation.valid) {
			return json({ success: false, error: validation.error }, { status: 500 });
		}

		const exercises: ParsedExercise[] = validation.data!.exercises;

		return json({ success: true, data: exercises });
	} catch (error) {
		console.error('Parse API error:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
