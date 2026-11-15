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
 * Single secure proxy helper calling /api/gemini.
 */
export async function askGemini(promptText: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
    }),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    const msg =
      data?.error?.message ||
      'Unable to get an AI answer right now. Please try again in a moment.';
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('The AI service returned an empty answer. Please try again.');
  }
  return text.trim();
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

export async function askHealthCoach(params: {
  question: string;
  day: number;
  systems: SystemEvaluation[];
  last7Days: ReturnType<typeof buildDaySnapshots>;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}): Promise<{ answer: string }> {
  const systemSummary = params.systems.map((s) => ({
    name: s.name,
    status: s.status,
    primaryMetric: `${s.primaryMetricValue} ${s.primaryMetricUnit}`,
    reasons: s.whyReasons,
    upgradedByCombiner: s.upgradedByCombiner,
  }));

  const recentChat = params.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Astronaut' : 'Coach'}: ${m.text}`)
    .join('\n');

  const promptText = [
    'You are a calm, practical health coach for an astronaut on a 90-day space mission.',
    'Use simple, everyday words with zero medical jargon. Reference their actual numbers and drift scores.',
    'Keep your answer under 160 words: give a short plain-English explanation followed by 2 to 3 numbered next steps for today.',
    `Current Mission Day: Day ${params.day} of 90.`,
    `Current System Statuses:\n${JSON.stringify(systemSummary, null, 2)}`,
    `Last 7 Days of Values and Drift Scores:\n${JSON.stringify(params.last7Days, null, 2)}`,
    recentChat ? `Recent conversation:\n${recentChat}` : '',
    `Astronaut question: "${params.question.trim()}"`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const answer = await askGemini(promptText);
  return { answer };
}

export async function analyzeFullMissionTrends(params: {
  selectedDay: number;
  baseline: BaselineMap;
  full90Days: ReturnType<typeof buildDaySnapshots>;
}): Promise<{ analysis: string }> {
  const promptText = [
    'You are analyzing 90 days of astronaut health numbers in simple, everyday English (no medical jargon).',
    'Be concise and use these 4 exact headings: "What changed", "When it started", "Which systems are linked", and "What may turn red next".',
    'Cite exact mission day numbers and concrete changes.',
    `Currently viewing Mission Day ${params.selectedDay} of 90.`,
    `Personal 14-Day Baseline (average and spread):\n${JSON.stringify(params.baseline, null, 2)}`,
    `Full 90-Day Indicator Values and Drift Scores:\n${JSON.stringify(params.full90Days)}`,
  ].join('\n\n');

  const analysis = await askGemini(promptText);
  return { analysis };
}

const NASA_SOURCE_LINKS: Record<string, Array<{ title: string; url: string }>> = {
  Cardio: [
    {
      title: 'NASA HRP — Cardiovascular Health in Space',
      url: 'https://www.nasa.gov/hrp/body-in-space/cardiovascular/',
    },
    {
      title: 'NASA — Heart Changes During Long Spaceflight',
      url: 'https://www.nasa.gov/missions/station/iss-research/cardiovascular-health/',
    },
  ],
  Immune: [
    {
      title: 'NASA HRP — Immune System Changes in Space',
      url: 'https://www.nasa.gov/hrp/body-in-space/immune-system/',
    },
    {
      title: 'NASA — Studying Spaceflight Immunity',
      url: 'https://www.nasa.gov/missions/station/iss-research/immune-system/',
    },
  ],
  'Bone / Muscle': [
    {
      title: 'NASA HRP — Bone and Muscle Loss Prevention',
      url: 'https://www.nasa.gov/hrp/body-in-space/bones-and-muscles/',
    },
    {
      title: 'NASA — Exercise Countermeasures in Orbit',
      url: 'https://www.nasa.gov/missions/station/iss-research/bones-and-muscles/',
    },
  ],
  Behavioral: [
    {
      title: 'NASA HRP — Behavioral Health & Sleep',
      url: 'https://www.nasa.gov/hrp/hazards/isolation-and-confinement/',
    },
    {
      title: 'NASA — Sleep and Performance in Space',
      url: 'https://www.nasa.gov/missions/station/iss-research/sleep-and-circadian-rhythms/',
    },
  ],
  Radiation: [
    {
      title: 'NASA HRP — Space Radiation Hazard',
      url: 'https://www.nasa.gov/hrp/hazards/space-radiation/',
    },
    {
      title: 'NASA — Radiation Protection on Deep-Space Missions',
      url: 'https://www.nasa.gov/missions/artemis/space-radiation/',
    },
  ],
};

function extractUrls(text: string): Array<{ title: string; url: string }> {
  const matches = text.match(/https?:\/\/[^\s)>\]"']+/g) ?? [];
  const seen = new Set<string>();
  const links: Array<{ title: string; url: string }> = [];
  for (const raw of matches) {
    const clean = raw.replace(/[.,;]+$/, '');
    if (!seen.has(clean)) {
      seen.add(clean);
      try {
        const host = new URL(clean).hostname.replace(/^www\./, '');
        links.push({ title: host, url: clean });
      } catch {
        links.push({ title: clean, url: clean });
      }
    }
  }
  return links;
}

export async function lookupNasaResearch(params: {
  systemName: string;
  status: string;
  whyReasons: string[];
}): Promise<ResearchResult> {
  const promptText = [
    `Explain in simple, everyday English (no medical jargon) what NASA Human Research Program and space-medicine studies say about ${params.systemName} health risks during long-duration space missions.`,
    `Current system light: ${params.status}. Today's alert: ${params.whyReasons.join(' ')}`,
    'Cover why this risk happens in space and what daily habits or countermeasures astronauts use to prevent it. Keep it under 160 words.',
    'At the end, include 1–2 relevant NASA reference URLs if known.',
  ].join('\n\n');

  const rawText = await askGemini(promptText);
  const foundUrls = extractUrls(rawText);
  const fallbackUrls = NASA_SOURCE_LINKS[params.systemName] ?? [
    {
      title: 'NASA Human Research Program',
      url: 'https://www.nasa.gov/hrp/',
    },
  ];

  return {
    summary: rawText,
    sources: foundUrls.length > 0 ? foundUrls.slice(0, 4) : fallbackUrls,
  };
}

export async function generateAiGroundReport(params: {
  day: number;
  systems: SystemEvaluation[];
  last7Days: ReturnType<typeof buildDaySnapshots>;
  completedSteps: string[];
  checkInSummary: string | null;
}): Promise<{ report: string }> {
  const systemSummary = params.systems.map((s) => ({
    name: s.name,
    status: s.status,
    primaryMetric: `${s.primaryMetricLabel}: ${s.primaryMetricValue} ${s.primaryMetricUnit}`,
    reasons: s.whyReasons,
    actionSteps: s.actionSteps.map((a) => a.title),
  }));

  const promptText = [
    'Write a crisp, one-page Ground Control mission health report in simple, plain English (no medical jargon).',
    'Include 4 labeled sections: OVERALL STATUS, FLAGGED SYSTEMS, RECENT TRENDS, and RECOMMENDED ACTIONS.',
    `Mission Day: ${params.day} of 90.`,
    `System Lights and Reasons:\n${JSON.stringify(systemSummary, null, 2)}`,
    `Last 7 Days Values and Drift Scores:\n${JSON.stringify(params.last7Days, null, 2)}`,
    `Completed Crew Action Steps Today: ${
      params.completedSteps.length > 0 ? params.completedSteps.join('; ') : 'None logged yet'
    }`,
    params.checkInSummary
      ? `Crew Check-In: ${params.checkInSummary}`
      : 'Crew Check-In: Not submitted today',
  ].join('\n\n');

  const report = await askGemini(promptText);
  return { report };
}
