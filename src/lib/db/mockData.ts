import { db } from './index';
import { generateId } from './utils';
import type { Session, Entry } from './types';

const WORKOUT_TEMPLATES = [
  { name: 'Push Day', exercises: ['bench_press', 'overhead_press', 'incline_bench_press', 'tricep_pushdown', 'lateral_raise', 'dips'] },
  { name: 'Pull Day', exercises: ['deadlift', 'barbell_row', 'pull_up', 'lat_pulldown', 'bicep_curl', 'face_pull'] },
  { name: 'Leg Day', exercises: ['squat', 'leg_press', 'romanian_deadlift', 'leg_curl', 'leg_extension', 'calf_raise', 'lunge'] },
  { name: 'Upper Body', exercises: ['bench_press', 'barbell_row', 'overhead_press', 'pull_up', 'bicep_curl', 'tricep_pushdown'] },
  { name: 'Lower Body', exercises: ['squat', 'romanian_deadlift', 'leg_press', 'leg_curl', 'calf_raise'] },
  { name: 'Full Body', exercises: ['squat', 'bench_press', 'barbell_row', 'overhead_press', 'deadlift'] }
];

const SESSION_NAMES_BY_TIME = ['Morning Workout', 'Afternoon Workout', 'Evening Workout'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function getExerciseIdByName(name: string): Promise<string | null> {
  const exercise = await db.exercises.where('name').equals(name).first();
  return exercise?.id ?? null;
}

export async function generateMockData(): Promise<{ sessions: number; entries: number }> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  
  const workoutDays: Date[] = [];
  
  let currentDate = new Date(startDate);
  while (currentDate <= today) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (Math.random() < 0.7) {
        workoutDays.push(new Date(currentDate));
      }
    } else {
      if (Math.random() < 0.3) {
        workoutDays.push(new Date(currentDate));
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const weeksCount = 5;
  const targetSessionsPerWeek = randomInt(3, 5);
  let totalWorkouts = targetSessionsPerWeek * weeksCount;
  
  while (workoutDays.length > totalWorkouts) {
    const indexToRemove = randomInt(0, workoutDays.length - 1);
    workoutDays.splice(indexToRemove, 1);
  }
  
  const sessions: Session[] = [];
  const entries: Entry[] = [];
  
  for (const day of workoutDays) {
    const template = randomChoice(WORKOUT_TEMPLATES);
    const sessionName = randomChoice(SESSION_NAMES_BY_TIME);
    
    const startHour = randomInt(6, 20);
    const sessionStart = new Date(day);
    sessionStart.setHours(startHour, randomInt(0, 59), 0, 0);
    
    const sessionEnd = new Date(sessionStart);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + randomInt(45, 90));
    
    const session: Session = {
      id: generateId(),
      name: sessionName,
      date: getDateString(day),
      startedAt: sessionStart.toISOString(),
      endedAt: sessionEnd.toISOString(),
      createdAt: sessionStart.toISOString(),
      updatedAt: sessionStart.toISOString(),
      synced: false
    };
    sessions.push(session);
    
    const exerciseCount = randomInt(4, 8);
    const selectedExercises = shuffle(template.exercises).slice(0, exerciseCount);
    
    let entryTime = new Date(sessionStart);
    
    for (const exerciseName of selectedExercises) {
      const exerciseId = await getExerciseIdByName(exerciseName);
      if (!exerciseId) continue;
      
      const isBodyweight = ['push_up', 'pull_up', 'dips', 'plank', 'crunch', 'lunge'].includes(exerciseName);
      
      const entry: Entry = {
        id: generateId(),
        exerciseId,
        sessionId: session.id,
        weight: isBodyweight ? null : randomInt(20, 150),
        unit: isBodyweight ? null : (Math.random() < 0.8 ? 'kg' : 'lbs'),
        reps: randomInt(5, 15),
        sets: randomInt(3, 5),
        createdAt: entryTime.toISOString(),
        updatedAt: entryTime.toISOString(),
        synced: false
      };
      entries.push(entry);
      
      entryTime.setMinutes(entryTime.getMinutes() + randomInt(5, 10));
    }
  }
  
  await db.sessions.bulkAdd(sessions);
  await db.entries.bulkAdd(entries);
  
  return { sessions: sessions.length, entries: entries.length };
}

export async function clearMockData(): Promise<void> {
  await db.entries.clear();
  await db.sessions.clear();
}
