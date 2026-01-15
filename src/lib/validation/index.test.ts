import { describe, it, expect } from 'vitest';
import {
  LIMITS,
  validateInputLength,
  validateQueryLength,
  validateWeight,
  validateReps,
  validateSets,
  validateParsedExercise,
  validateLLMResponse
} from './index';

describe('validateInputLength', () => {
  it('returns valid for normal input', () => {
    const result = validateInputLength('bench press 80kg 8x3');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for empty string', () => {
    const result = validateInputLength('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Input cannot be empty');
  });

  it('returns invalid for whitespace-only string', () => {
    const result = validateInputLength('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Input cannot be empty');
  });

  it('returns invalid for null/undefined input', () => {
    expect(validateInputLength(null as unknown as string).valid).toBe(false);
    expect(validateInputLength(undefined as unknown as string).valid).toBe(false);
  });

  it('returns invalid for input exceeding max length', () => {
    const longInput = 'a'.repeat(LIMITS.INPUT_MAX_LENGTH + 1);
    const result = validateInputLength(longInput);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('returns valid for input at max length', () => {
    const maxInput = 'a'.repeat(LIMITS.INPUT_MAX_LENGTH);
    const result = validateInputLength(maxInput);
    expect(result.valid).toBe(true);
  });
});

describe('validateQueryLength', () => {
  it('returns valid for normal query', () => {
    const result = validateQueryLength('What was my bench press PR?');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for empty query', () => {
    const result = validateQueryLength('');
    expect(result.valid).toBe(false);
  });

  it('returns invalid for query exceeding max length', () => {
    const longQuery = 'a'.repeat(LIMITS.QUERY_MAX_LENGTH + 1);
    const result = validateQueryLength(longQuery);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('returns valid for query at max length', () => {
    const maxQuery = 'a'.repeat(LIMITS.QUERY_MAX_LENGTH);
    const result = validateQueryLength(maxQuery);
    expect(result.valid).toBe(true);
  });
});

describe('validateWeight', () => {
  it('returns valid for null weight', () => {
    const result = validateWeight(null);
    expect(result.valid).toBe(true);
  });

  it('returns valid for weight within bounds', () => {
    expect(validateWeight(0).valid).toBe(true);
    expect(validateWeight(100).valid).toBe(true);
    expect(validateWeight(500).valid).toBe(true);
  });

  it('returns invalid for weight below minimum', () => {
    const result = validateWeight(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between');
  });

  it('returns invalid for weight above maximum', () => {
    const result = validateWeight(501);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between');
  });

  it('returns invalid for non-number weight', () => {
    const result = validateWeight('80' as unknown as number);
    expect(result.valid).toBe(false);
  });

  it('returns invalid for NaN weight', () => {
    const result = validateWeight(NaN);
    expect(result.valid).toBe(false);
  });
});

describe('validateReps', () => {
  it('returns valid for null reps', () => {
    const result = validateReps(null);
    expect(result.valid).toBe(true);
  });

  it('returns valid for reps within bounds', () => {
    expect(validateReps(1).valid).toBe(true);
    expect(validateReps(50).valid).toBe(true);
    expect(validateReps(100).valid).toBe(true);
  });

  it('returns invalid for reps below minimum', () => {
    const result = validateReps(0);
    expect(result.valid).toBe(false);
  });

  it('returns invalid for reps above maximum', () => {
    const result = validateReps(101);
    expect(result.valid).toBe(false);
  });

  it('returns invalid for non-integer reps', () => {
    const result = validateReps(8.5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('integer');
  });
});

describe('validateSets', () => {
  it('returns valid for null sets', () => {
    const result = validateSets(null);
    expect(result.valid).toBe(true);
  });

  it('returns valid for sets within bounds', () => {
    expect(validateSets(1).valid).toBe(true);
    expect(validateSets(25).valid).toBe(true);
    expect(validateSets(50).valid).toBe(true);
  });

  it('returns invalid for sets below minimum', () => {
    const result = validateSets(0);
    expect(result.valid).toBe(false);
  });

  it('returns invalid for sets above maximum', () => {
    const result = validateSets(51);
    expect(result.valid).toBe(false);
  });

  it('returns invalid for non-integer sets', () => {
    const result = validateSets(3.5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('integer');
  });
});

describe('validateParsedExercise', () => {
  it('returns valid for complete exercise', () => {
    const exercise = {
      exercise: 'bench press',
      weight: 80,
      unit: 'kg',
      reps: 8,
      sets: 3
    };
    const result = validateParsedExercise(exercise);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(exercise);
  });

  it('returns valid for exercise with nulls', () => {
    const exercise = {
      exercise: 'pushups',
      weight: null,
      unit: null,
      reps: 20,
      sets: 3
    };
    const result = validateParsedExercise(exercise);
    expect(result.valid).toBe(true);
  });

  it('returns invalid for missing exercise name', () => {
    const exercise = {
      weight: 80,
      unit: 'kg',
      reps: 8,
      sets: 3
    };
    const result = validateParsedExercise(exercise);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('name is required');
  });

  it('returns invalid for invalid unit', () => {
    const exercise = {
      exercise: 'bench press',
      weight: 80,
      unit: 'pounds', // should be 'lbs'
      reps: 8,
      sets: 3
    };
    const result = validateParsedExercise(exercise);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unit');
  });

  it('returns invalid for out-of-bounds weight', () => {
    const exercise = {
      exercise: 'deadlift',
      weight: 600,
      unit: 'kg',
      reps: 1,
      sets: 1
    };
    const result = validateParsedExercise(exercise);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Weight');
  });

  it('returns invalid for non-object input', () => {
    expect(validateParsedExercise(null).valid).toBe(false);
    expect(validateParsedExercise('string').valid).toBe(false);
    expect(validateParsedExercise(123).valid).toBe(false);
  });
});

describe('validateLLMResponse', () => {
  it('returns valid for proper response with exercises', () => {
    const response = {
      exercises: [
        { exercise: 'bench press', weight: 80, unit: 'kg', reps: 8, sets: 3 },
        { exercise: 'squat', weight: 100, unit: 'kg', reps: 5, sets: 5 }
      ]
    };
    const result = validateLLMResponse(response);
    expect(result.valid).toBe(true);
    expect(result.data?.exercises).toHaveLength(2);
  });

  it('returns invalid for empty exercises array', () => {
    const response = { exercises: [] };
    const result = validateLLMResponse(response);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No exercises');
  });

  it('returns invalid for missing exercises property', () => {
    const response = { data: [] };
    const result = validateLLMResponse(response);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exercises array');
  });

  it('returns invalid if any exercise fails validation', () => {
    const response = {
      exercises: [
        { exercise: 'bench press', weight: 80, unit: 'kg', reps: 8, sets: 3 },
        { exercise: '', weight: 100, unit: 'kg', reps: 5, sets: 5 } // invalid: empty name
      ]
    };
    const result = validateLLMResponse(response);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Exercise 2');
  });

  it('returns invalid for non-object response', () => {
    expect(validateLLMResponse(null).valid).toBe(false);
    expect(validateLLMResponse('string').valid).toBe(false);
    expect(validateLLMResponse([]).valid).toBe(false);
  });
});
