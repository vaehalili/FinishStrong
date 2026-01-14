import type { Entry, Session, Exercise } from '$lib/db';

interface ExportRow {
  date: string;
  session: string;
  exercise: string;
  weight: number | null;
  unit: string | null;
  reps: number | null;
  sets: number | null;
}

interface ExportData {
  sessions: Session[];
  entries: Entry[];
  exercises: Exercise[];
  exportedAt: string;
}

function buildExportRows(
  entries: Entry[],
  sessions: Session[],
  exercises: Exercise[]
): ExportRow[] {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  return entries.map((entry) => {
    const session = sessionMap.get(entry.sessionId);
    const exercise = exerciseMap.get(entry.exerciseId);

    return {
      date: session?.date ?? '',
      session: session?.name ?? '',
      exercise: exercise?.displayName ?? entry.exerciseId,
      weight: entry.weight,
      unit: entry.unit,
      reps: entry.reps,
      sets: entry.sets
    };
  });
}

export function exportToCSV(
  entries: Entry[],
  sessions: Session[],
  exercises: Exercise[]
): string {
  const rows = buildExportRows(entries, sessions, exercises);
  
  const headers = ['Date', 'Session', 'Exercise', 'Weight', 'Unit', 'Reps', 'Sets'];
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const values = [
      row.date,
      `"${row.session.replace(/"/g, '""')}"`,
      `"${row.exercise.replace(/"/g, '""')}"`,
      row.weight ?? '',
      row.unit ?? '',
      row.reps ?? '',
      row.sets ?? ''
    ];
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function exportToJSON(
  entries: Entry[],
  sessions: Session[],
  exercises: Exercise[]
): string {
  const data: ExportData = {
    sessions,
    entries,
    exercises,
    exportedAt: new Date().toISOString()
  };

  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(
  entries: Entry[],
  sessions: Session[],
  exercises: Exercise[]
): void {
  const csv = exportToCSV(entries, sessions, exercises);
  const filename = `finishstrong-export-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

export function downloadJSON(
  entries: Entry[],
  sessions: Session[],
  exercises: Exercise[]
): void {
  const json = exportToJSON(entries, sessions, exercises);
  const filename = `finishstrong-export-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json');
}
