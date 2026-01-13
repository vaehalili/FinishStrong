import { db } from './index';
import { generateId } from './utils';
import type { Exercise } from './types';

const COMMON_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Chest
  { name: 'bench_press', displayName: 'Bench Press' },
  { name: 'incline_bench_press', displayName: 'Incline Bench Press' },
  { name: 'dumbbell_fly', displayName: 'Dumbbell Fly' },
  { name: 'push_up', displayName: 'Push Up' },
  { name: 'dips', displayName: 'Dips' },
  // Back
  { name: 'deadlift', displayName: 'Deadlift' },
  { name: 'barbell_row', displayName: 'Barbell Row' },
  { name: 'pull_up', displayName: 'Pull Up' },
  { name: 'lat_pulldown', displayName: 'Lat Pulldown' },
  { name: 'seated_cable_row', displayName: 'Seated Cable Row' },
  // Shoulders
  { name: 'overhead_press', displayName: 'Overhead Press' },
  { name: 'lateral_raise', displayName: 'Lateral Raise' },
  { name: 'front_raise', displayName: 'Front Raise' },
  { name: 'face_pull', displayName: 'Face Pull' },
  { name: 'shrug', displayName: 'Shrug' },
  // Arms
  { name: 'bicep_curl', displayName: 'Bicep Curl' },
  { name: 'hammer_curl', displayName: 'Hammer Curl' },
  { name: 'tricep_pushdown', displayName: 'Tricep Pushdown' },
  { name: 'skull_crusher', displayName: 'Skull Crusher' },
  { name: 'tricep_extension', displayName: 'Tricep Extension' },
  // Legs
  { name: 'squat', displayName: 'Squat' },
  { name: 'front_squat', displayName: 'Front Squat' },
  { name: 'leg_press', displayName: 'Leg Press' },
  { name: 'romanian_deadlift', displayName: 'Romanian Deadlift' },
  { name: 'leg_curl', displayName: 'Leg Curl' },
  { name: 'leg_extension', displayName: 'Leg Extension' },
  { name: 'calf_raise', displayName: 'Calf Raise' },
  { name: 'lunge', displayName: 'Lunge' },
  // Core
  { name: 'plank', displayName: 'Plank' },
  { name: 'crunch', displayName: 'Crunch' }
];

export async function seedExercises(): Promise<void> {
  const count = await db.exercises.count();
  
  if (count > 0) {
    return;
  }

  const exercises: Exercise[] = COMMON_EXERCISES.map((ex) => ({
    id: generateId(),
    ...ex
  }));

  await db.exercises.bulkAdd(exercises);
}
