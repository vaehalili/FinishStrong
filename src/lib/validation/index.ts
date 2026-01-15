/**
 * Validation constants and functions for FinishStrong
 */

// Validation limits as per AGENTS.md
export const LIMITS = {
  INPUT_MAX_LENGTH: 300,
  QUERY_MAX_LENGTH: 500,
  WEIGHT_MIN: 0,
  WEIGHT_MAX: 500,
  REPS_MIN: 1,
  REPS_MAX: 100,
  SETS_MIN: 1,
  SETS_MAX: 50
} as const;

// LLM response schema types
export interface ParsedExercise {
  exercise: string;
  weight: number | null;
  unit: 'kg' | 'lbs' | null;
  reps: number | null;
  sets: number | null;
}

export interface ParsedResponse {
  exercises: ParsedExercise[];
}

// Input validation
export function validateInputLength(input: string): { valid: boolean; error?: string } {
  if (input === null || input === undefined || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Input cannot be empty' };
  }
  if (trimmed.length > LIMITS.INPUT_MAX_LENGTH) {
    return { valid: false, error: `Input exceeds ${LIMITS.INPUT_MAX_LENGTH} characters` };
  }
  return { valid: true };
}

export function validateQueryLength(query: string): { valid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query is required' };
  }
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  if (trimmed.length > LIMITS.QUERY_MAX_LENGTH) {
    return { valid: false, error: `Query exceeds ${LIMITS.QUERY_MAX_LENGTH} characters` };
  }
  return { valid: true };
}

// Bounds checking
export function validateWeight(weight: number | null): { valid: boolean; error?: string } {
  if (weight === null) {
    return { valid: true };
  }
  if (typeof weight !== 'number' || isNaN(weight)) {
    return { valid: false, error: 'Weight must be a number' };
  }
  if (weight < LIMITS.WEIGHT_MIN || weight > LIMITS.WEIGHT_MAX) {
    return { valid: false, error: `Weight must be between ${LIMITS.WEIGHT_MIN} and ${LIMITS.WEIGHT_MAX} kg` };
  }
  return { valid: true };
}

export function validateReps(reps: number | null): { valid: boolean; error?: string } {
  if (reps === null) {
    return { valid: true };
  }
  if (typeof reps !== 'number' || isNaN(reps) || !Number.isInteger(reps)) {
    return { valid: false, error: 'Reps must be an integer' };
  }
  if (reps < LIMITS.REPS_MIN || reps > LIMITS.REPS_MAX) {
    return { valid: false, error: `Reps must be between ${LIMITS.REPS_MIN} and ${LIMITS.REPS_MAX}` };
  }
  return { valid: true };
}

export function validateSets(sets: number | null): { valid: boolean; error?: string } {
  if (sets === null) {
    return { valid: true };
  }
  if (typeof sets !== 'number' || isNaN(sets) || !Number.isInteger(sets)) {
    return { valid: false, error: 'Sets must be an integer' };
  }
  if (sets < LIMITS.SETS_MIN || sets > LIMITS.SETS_MAX) {
    return { valid: false, error: `Sets must be between ${LIMITS.SETS_MIN} and ${LIMITS.SETS_MAX}` };
  }
  return { valid: true };
}

// LLM response schema validation
export function validateParsedExercise(exercise: unknown): { valid: boolean; error?: string; data?: ParsedExercise } {
  if (!exercise || typeof exercise !== 'object') {
    return { valid: false, error: 'Exercise must be an object' };
  }

  const e = exercise as Record<string, unknown>;

  // Validate exercise name
  if (typeof e.exercise !== 'string' || e.exercise.trim().length === 0) {
    return { valid: false, error: 'Exercise name is required' };
  }

  // Validate weight
  if (e.weight !== null && typeof e.weight !== 'number') {
    return { valid: false, error: 'Weight must be a number or null' };
  }
  const weightResult = validateWeight(e.weight as number | null);
  if (!weightResult.valid) {
    return weightResult;
  }

  // Validate unit
  if (e.unit !== null && e.unit !== 'kg' && e.unit !== 'lbs') {
    return { valid: false, error: 'Unit must be "kg", "lbs", or null' };
  }

  // Validate reps
  if (e.reps !== null && typeof e.reps !== 'number') {
    return { valid: false, error: 'Reps must be a number or null' };
  }
  const repsResult = validateReps(e.reps as number | null);
  if (!repsResult.valid) {
    return repsResult;
  }

  // Validate sets
  if (e.sets !== null && typeof e.sets !== 'number') {
    return { valid: false, error: 'Sets must be a number or null' };
  }
  const setsResult = validateSets(e.sets as number | null);
  if (!setsResult.valid) {
    return setsResult;
  }

  return {
    valid: true,
    data: {
      exercise: e.exercise as string,
      weight: e.weight as number | null,
      unit: e.unit as 'kg' | 'lbs' | null,
      reps: e.reps as number | null,
      sets: e.sets as number | null
    }
  };
}

export function validateLLMResponse(response: unknown): { valid: boolean; error?: string; data?: ParsedResponse } {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Response must be an object' };
  }

  const r = response as Record<string, unknown>;

  if (!Array.isArray(r.exercises)) {
    return { valid: false, error: 'Response must contain an exercises array' };
  }

  if (r.exercises.length === 0) {
    return { valid: false, error: 'No exercises parsed from input' };
  }

  const validatedExercises: ParsedExercise[] = [];

  for (let i = 0; i < r.exercises.length; i++) {
    const result = validateParsedExercise(r.exercises[i]);
    if (!result.valid) {
      return { valid: false, error: `Exercise ${i + 1}: ${result.error}` };
    }
    validatedExercises.push(result.data!);
  }

  return {
    valid: true,
    data: { exercises: validatedExercises }
  };
}
