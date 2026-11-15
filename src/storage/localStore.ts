import { generateMissionData } from '../data/missionGenerator';
import { DailyCheckIn, DailyMetrics, GroundSummaryRecord } from '../types/health';

const KEYS = {
  missionData: 'vitaldrift_mission_v1',
  selectedDay: 'vitaldrift_selected_day_v1',
  completedActions: 'vitaldrift_completed_actions_v1',
  checkIns: 'vitaldrift_checkins_v1',
  outbox: 'vitaldrift_ground_outbox_v1',
  selfExamChecks: 'vitaldrift_self_exam_v1',
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export function loadOrCreateMissionData(): DailyMetrics[] {
  const existing = safeRead<DailyMetrics[] | null>(KEYS.missionData, null);
  if (existing && Array.isArray(existing) && existing.length === 90) {
    return existing;
  }
  const generated = generateMissionData();
  safeWrite(KEYS.missionData, generated);
  return generated;
}

export function resetAllMissionStorage(): DailyMetrics[] {
  const generated = generateMissionData();
  safeWrite(KEYS.missionData, generated);
  safeWrite(KEYS.selectedDay, 45);
  safeWrite(KEYS.completedActions, {});
  safeWrite(KEYS.checkIns, {});
  safeWrite(KEYS.selfExamChecks, {});
  return generated;
}

export function loadSelectedDay(): number {
  const day = safeRead<number>(KEYS.selectedDay, 45);
  if (day < 1 || day > 90) return 45;
  return day;
}

export function saveSelectedDay(day: number): void {
  safeWrite(KEYS.selectedDay, day);
}

export function loadCompletedActions(): Record<string, boolean> {
  return safeRead<Record<string, boolean>>(KEYS.completedActions, {});
}

export function saveCompletedActions(map: Record<string, boolean>): void {
  safeWrite(KEYS.completedActions, map);
}

export function loadCheckIns(): Record<number, DailyCheckIn> {
  return safeRead<Record<number, DailyCheckIn>>(KEYS.checkIns, {});
}

export function saveCheckIns(map: Record<number, DailyCheckIn>): void {
  safeWrite(KEYS.checkIns, map);
}

export function loadOutbox(): GroundSummaryRecord[] {
  return safeRead<GroundSummaryRecord[]>(KEYS.outbox, []);
}

export function saveOutbox(records: GroundSummaryRecord[]): void {
  safeWrite(KEYS.outbox, records);
}

export function loadSelfExamChecks(): Record<string, boolean> {
  return safeRead<Record<string, boolean>>(KEYS.selfExamChecks, {});
}

export function saveSelfExamChecks(map: Record<string, boolean>): void {
  safeWrite(KEYS.selfExamChecks, map);
}
