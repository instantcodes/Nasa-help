import { useEffect, useState } from 'react';
import { INDICATORS } from '../data/missionGenerator';
import { evaluateIndicators } from '../logic/driftEngine';
import {
  BaselineMap,
  DailyCheckIn,
  DailyMetrics,
  SystemEvaluation,
} from '../types/health';

export interface ResearchResult {
  summary: string;
  sources: Array<{ title: string; url: string }>;
}

/**
 * Tracks live browser connectivity so AI tools hide gracefully when offline.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Builds compact daily snapshots (values + drift scores) for a range of days.
 */
export function buildDaySnapshots(
  missionDays: DailyMetrics[],
  baseline: BaselineMap,
  checkIns: Record<number, DailyCheckIn>,
  startDay: number,
  endDay: number
) {
  const rows = [];
  for (let d = Math.max(1, startDay); d <= Math.min(missionDays.length, endDay); d++) {
    const evals = evaluateIndicators(missionDays, d - 1, baseline, checkIns[d]);
    const metrics: Record<string, { value: number; drift: number; status: string }> = {};
    for (const meta of INDICATORS) {
      const ev = evals[meta.key];
      metrics[meta.shortLabel] = {
        value: Number(ev.todayValue.toFixed(meta.decimals)),
        drift: Number(ev.drift.toFixed(2)),
        status: ev.status,
      };
    }
    rows.push({ day: d, metrics });
  }
  return rows;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || `Request failed (${res.status})`);
  }
  return payload as T;
}

export function askHealthCoach(params: {
  question: string;
  day: number;
  systems: SystemEvaluation[];
  last7Days: ReturnType<typeof buildDaySnapshots>;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}) {
  return postJson<{ answer: string }>('/api/ai/coach', {
    question: params.question,
    day: params.day,
    systems: params.systems.map((s) => ({
      name: s.name,
      status: s.status,
      primaryMetric: `${s.primaryMetricValue} ${s.primaryMetricUnit}`,
      reasons: s.whyReasons,
      upgradedByCombiner: s.upgradedByCombiner,
    })),
    last7Days: params.last7Days,
    history: params.history,
  });
}

export function analyzeFullMissionTrends(params: {
  selectedDay: number;
  baseline: BaselineMap;
  full90Days: ReturnType<typeof buildDaySnapshots>;
}) {
  return postJson<{ analysis: string }>('/api/ai/analyze', params);
}

export function lookupNasaResearch(params: {
  systemName: string;
  status: string;
  whyReasons: string[];
}) {
  return postJson<ResearchResult>('/api/ai/research', params);
}

export function generateAiGroundReport(params: {
  day: number;
  systems: SystemEvaluation[];
  last7Days: ReturnType<typeof buildDaySnapshots>;
  completedSteps: string[];
  checkInSummary: string | null;
}) {
  return postJson<{ report: string }>('/api/ai/report', {
    day: params.day,
    systems: params.systems.map((s) => ({
      name: s.name,
      status: s.status,
      primaryMetric: `${s.primaryMetricLabel}: ${s.primaryMetricValue} ${s.primaryMetricUnit}`,
      reasons: s.whyReasons,
      actionSteps: s.actionSteps.map((a) => a.title),
    })),
    last7Days: params.last7Days,
    completedSteps: params.completedSteps,
    checkInSummary: params.checkInSummary,
  });
}
