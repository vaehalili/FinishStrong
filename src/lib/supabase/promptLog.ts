import { supabase } from './client';
import { generateId } from '$lib/db/utils';

export interface PromptLog {
	id: string;
	timestamp: string;
	raw_input: string;
	parsed_output: object | null;
	success: boolean;
	latency_ms: number;
	model: string;
}

export interface LogPromptParams {
	raw_input: string;
	parsed_output: object | null;
	success: boolean;
	latency_ms: number;
	model: string;
}

export async function logPromptRequest(params: LogPromptParams): Promise<void> {
	const log: PromptLog = {
		id: generateId(),
		timestamp: new Date().toISOString(),
		raw_input: params.raw_input,
		parsed_output: params.parsed_output,
		success: params.success,
		latency_ms: params.latency_ms,
		model: params.model
	};

	const { error } = await supabase.from('prompt_logs').insert(log);

	if (error) {
		console.error('Failed to log prompt request:', error);
		throw error;
	}
}
