import { BASELINE_DAYS, INDICATOR_MAP, INDICATORS } from '../data/missionGenerator';
import {
  ActionStep,
  BaselineMap,
  DailyCheckIn,
  DailyMetrics,
  IndicatorEvaluation,
  IndicatorKey,
  LightStatus,
  SystemEvaluation,
  SystemKey,
} from '../types/health';

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[], avg: number): number {
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  // Minimum floor prevents division by zero on steady indicators
  return Math.max(Math.sqrt(variance), 0.05);
}

/**
 * Step 1: Personal baseline = average and spread over the first 14 days.
 */
export function calculateBaseline(missionDays: DailyMetrics[]): BaselineMap {
  const baselineSlice = missionDays.slice(0, BASELINE_DAYS);
  const result = {} as BaselineMap;

  for (const indicator of INDICATORS) {
    const key = indicator.key;
    const values = baselineSlice.map((d) => d[key]);
    const avg = mean(values);
    const spread = standardDeviation(values, avg);

    if (key === 'cumulativeRadiation') {
      const dailyRates = baselineSlice.map((d, idx) =>
        idx === 0
          ? d.cumulativeRadiation
          : d.cumulativeRadiation - baselineSlice[idx - 1].cumulativeRadiation
      );
      const dailyRateAvg = mean(dailyRates);
      const dailyRateSpread = Math.max(standardDeviation(dailyRates, dailyRateAvg), 0.04);
      result[key] = { avg, spread, dailyRateAvg, dailyRateSpread };
    } else {
      result[key] = { avg, spread };
    }
  }

  return result;
}

/**
 * Step 2: Drift formula:
 * drift = (today - baseline_avg) / baseline_spread
 * (inverted when lower values signal risk, e.g. sleep or exercise)
 * drift > 2 = RED, drift > 1 = YELLOW, otherwise GREEN.
 */
export function computeDriftScore(
  todayValue: number,
  baselineAvg: number,
  baselineSpread: number,
  direction: 'high' | 'low'
): number {
  const rawDrift = (todayValue - baselineAvg) / baselineSpread;
  return direction === 'high' ? rawDrift : -rawDrift;
}

export function statusFromDrift(drift: number): LightStatus {
  if (drift > 2) return 'red';
  if (drift > 1) return 'yellow';
  return 'green';
}

function maxStatus(a: LightStatus, b: LightStatus): LightStatus {
  const rank: Record<LightStatus, number> = { green: 0, yellow: 1, red: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function getDailyRadiationDose(missionDays: DailyMetrics[], dayIndex: number): number {
  const today = missionDays[dayIndex];
  if (dayIndex === 0) return today.cumulativeRadiation;
  return Math.max(
    0,
    Number((today.cumulativeRadiation - missionDays[dayIndex - 1].cumulativeRadiation).toFixed(2))
  );
}

/**
 * Counts consecutive days (ending on dayIndex) where this indicator was Yellow or Red.
 */
function countFlaggedStreak(
  missionDays: DailyMetrics[],
  dayIndex: number,
  key: IndicatorKey,
  baseline: BaselineMap
): number {
  let streak = 0;
  const meta = INDICATOR_MAP[key];
  const stats = baseline[key];

  for (let i = dayIndex; i >= 0; i--) {
    const val =
      key === 'cumulativeRadiation'
        ? getDailyRadiationDose(missionDays, i)
        : missionDays[i][key];
    const avg = key === 'cumulativeRadiation' ? stats.dailyRateAvg! : stats.avg;
    const spread = key === 'cumulativeRadiation' ? stats.dailyRateSpread! : stats.spread;
    const drift = computeDriftScore(val, avg, spread, meta.direction);
    if (statusFromDrift(drift) === 'green') break;
    streak++;
  }
  return streak;
}

/**
 * Evaluates all 8 indicators for the selected mission day (incorporating private check-in mood if saved).
 */
export function evaluateIndicators(
  missionDays: DailyMetrics[],
  dayIndex: number,
  baseline: BaselineMap,
  checkIn?: DailyCheckIn
): Record<IndicatorKey, IndicatorEvaluation> {
  const today = missionDays[dayIndex];
  const evaluations = {} as Record<IndicatorKey, IndicatorEvaluation>;

  for (const meta of INDICATORS) {
    const stats = baseline[meta.key];
    let todayValue = today[meta.key];
    if (meta.key === 'mood' && checkIn) {
      todayValue = checkIn.mood;
    }

    let drift: number;
    let rawDelta: number;

    if (meta.key === 'cumulativeRadiation') {
      const dailyDose = getDailyRadiationDose(missionDays, dayIndex);
      const rateAvg = stats.dailyRateAvg!;
      const rateSpread = stats.dailyRateSpread!;
      const rateDrift = computeDriftScore(dailyDose, rateAvg, rateSpread, 'high');
      // Also warn gently if mission cumulative total crosses 35 mSv (Yellow) or 48 mSv (Red)
      const totalDrift = todayValue >= 48 ? 2.2 : todayValue >= 35 ? 1.3 : 0;
      drift = Math.max(rateDrift, totalDrift);
      rawDelta = dailyDose - rateAvg;
    } else {
      drift = computeDriftScore(todayValue, stats.avg, stats.spread, meta.direction);
      rawDelta = todayValue - stats.avg;
    }

    const status = statusFromDrift(drift);
    const streakDays = countFlaggedStreak(missionDays, dayIndex, meta.key, baseline);

    evaluations[meta.key] = {
      key: meta.key,
      meta,
      todayValue,
      baselineAvg: stats.avg,
      baselineSpread: stats.spread,
      drift,
      rawDelta,
      status,
      streakDays,
    };
  }

  return evaluations;
}

function formatIndicatorReason(ev: IndicatorEvaluation): string {
  const { meta, todayValue, baselineAvg, rawDelta, streakDays } = ev;
  const streakText = streakDays > 1 ? ` for ${streakDays} days` : ' today';

  switch (meta.key) {
    case 'restingHeartRate': {
      const diff = Math.round(Math.abs(rawDelta));
      return `Resting HR is ${diff} bpm above your normal${streakText}.`;
    }
    case 'hrv': {
      const diff = Math.round(Math.abs(rawDelta));
      return `Heart recovery (HRV) is ${diff} ms below your normal${streakText}.`;
    }
    case 'bodyTemperature': {
      const diff = Math.abs(rawDelta).toFixed(1);
      return `Body temp is ${diff} °C above your normal (${todayValue.toFixed(1)} °C)${streakText}.`;
    }
    case 'sleepHours': {
      const diff = Math.abs(rawDelta).toFixed(1);
      return `Sleep dropped by ${diff} hrs below your normal (${todayValue.toFixed(1)} hrs)${streakText}.`;
    }
    case 'exerciseMinutes': {
      const diff = Math.round(Math.abs(rawDelta));
      return `Exercise time is ${diff} min below your baseline (${Math.round(todayValue)} min)${streakText}.`;
    }
    case 'mood': {
      return `Mood rating is ${todayValue.toFixed(1)}/5, below your ${baselineAvg.toFixed(1)}/5 baseline${streakText}.`;
    }
    case 'reactionTime': {
      const diff = Math.round(Math.abs(rawDelta));
      return `Reaction test is ${diff} ms slower than your normal${streakText}.`;
    }
    case 'cumulativeRadiation': {
      if (todayValue >= 35 && rawDelta < 0.12) {
        return `Total mission dose has reached ${todayValue.toFixed(1)} mSv (nearing mission advisory range).`;
      }
      return `Daily radiation intake rose above quiet-sun baseline (total ${todayValue.toFixed(1)} mSv)${streakText}.`;
    }
  }
}

const SYSTEM_ACTIONS: Record<SystemKey, ActionStep[]> = {
  cardio: [
    {
      id: 'cardio-hydrate',
      title: 'Drink 500 ml water with electrolytes',
      detail: 'Helps fluid balance and lowers strain on your morning heart rate.',
    },
    {
      id: 'cardio-pace',
      title: 'Switch today’s cardio to light pace',
      detail: 'Keep effort easy until your resting heart rate returns near baseline.',
    },
    {
      id: 'cardio-recheck',
      title: 'Recheck resting pulse after 20 min rest',
      detail: 'Sit quietly without caffeine and log a fresh 60-second pulse check.',
    },
  ],
  immune: [
    {
      id: 'immune-exam',
      title: 'Complete the 2-minute self-exam checklist',
      detail: 'Check throat, lymph nodes, skin rash, and breathing comfort.',
    },
    {
      id: 'immune-hydrate',
      title: 'Hydrate and pause heavy exertion',
      detail: 'Drink warm fluids every 2 hours and conserve energy for recovery.',
    },
    {
      id: 'immune-isolate',
      title: 'Limit shared cabin contact if fever > 37.3 °C',
      detail: 'Wear a cabin mask and notify crewmates before shared meals.',
    },
  ],
  boneMuscle: [
    {
      id: 'bone-load',
      title: 'Complete a 40-min bone-loading workout',
      detail: 'Prioritize squats, deadlifts, and heel raises on the resistance rack.',
    },
    {
      id: 'bone-harness',
      title: 'Log 20 min of treadmill harness loading',
      detail: 'Impact loading signals hips and spine to keep bone density.',
    },
    {
      id: 'bone-nutrients',
      title: 'Take daily Vitamin D and calcium ration',
      detail: 'Pair supplements with your midday meal for steady absorption.',
    },
  ],
  behavioral: [
    {
      id: 'behav-light',
      title: 'Dim cabin lights 60 min before sleep',
      detail: 'Use warm night lighting to protect your sleep rhythm.',
    },
    {
      id: 'behav-breathe',
      title: 'Run a 10-min paced breathing reset',
      detail: 'Slow 4-second inhale, 6-second exhale to ease tension.',
    },
    {
      id: 'behav-window',
      title: 'Protect a full 8-hour sleep block',
      detail: 'Defer non-urgent tasks and log a private check-in tomorrow.',
    },
  ],
  radiation: [
    {
      id: 'rad-shelter',
      title: 'Spend extra hours in shielded core module',
      detail: 'Use water-wall sleeping berth while solar particle levels are high.',
    },
    {
      id: 'rad-dosimeter',
      title: 'Verify personal dosimeter sync',
      detail: 'Confirm pocket badge and wall sensor numbers match within 5%.',
    },
    {
      id: 'rad-eva',
      title: 'Hold non-essential airlock or EVA prep',
      detail: 'Wait for daily radiation intake to return to normal background.',
    },
  ],
};

interface SystemConfig {
  key: SystemKey;
  name: string;
  shortDescription: string;
  primaryIndicator: IndicatorKey;
  ownIndicators: IndicatorKey[];
  relatedIndicators: IndicatorKey[];
}

const SYSTEM_CONFIGS: SystemConfig[] = [
  {
    key: 'cardio',
    name: 'Cardio',
    shortDescription: 'Heart rate, recovery reserve, and fluid balance',
    primaryIndicator: 'restingHeartRate',
    ownIndicators: ['restingHeartRate', 'hrv'],
    relatedIndicators: ['bodyTemperature', 'sleepHours'],
  },
  {
    key: 'immune',
    name: 'Immune',
    shortDescription: 'Temperature stability and early illness signs',
    primaryIndicator: 'bodyTemperature',
    ownIndicators: ['bodyTemperature'],
    relatedIndicators: ['restingHeartRate', 'hrv', 'sleepHours'],
  },
  {
    key: 'boneMuscle',
    name: 'Bone / Muscle',
    shortDescription: 'Daily mechanical loading against microgravity loss',
    primaryIndicator: 'exerciseMinutes',
    ownIndicators: ['exerciseMinutes'],
    relatedIndicators: ['hrv', 'sleepHours'],
  },
  {
    key: 'behavioral',
    name: 'Behavioral',
    shortDescription: 'Sleep depth, mood stability, and mental sharpness',
    primaryIndicator: 'sleepHours',
    ownIndicators: ['sleepHours', 'mood', 'reactionTime'],
    relatedIndicators: ['restingHeartRate', 'hrv'],
  },
  {
    key: 'radiation',
    name: 'Radiation',
    shortDescription: 'Cumulative dose and solar particle exposure',
    primaryIndicator: 'cumulativeRadiation',
    ownIndicators: ['cumulativeRadiation'],
    relatedIndicators: [],
  },
];

/**
 * Step 3: Evaluate all 5 systems including the Combiner rule:
 * "If 2 or more indicators in related systems are YELLOW, upgrade that system to RED."
 */
export function evaluateSystems(
  missionDays: DailyMetrics[],
  dayIndex: number,
  baseline: BaselineMap,
  checkIn?: DailyCheckIn
): {
  indicators: Record<IndicatorKey, IndicatorEvaluation>;
  systems: SystemEvaluation[];
} {
  const indicators = evaluateIndicators(missionDays, dayIndex, baseline, checkIn);

  const systems: SystemEvaluation[] = SYSTEM_CONFIGS.map((cfg) => {
    const ownEvals = cfg.ownIndicators.map((k) => indicators[k]);
    const relatedEvals = cfg.relatedIndicators.map((k) => indicators[k]);

    // Base status from own indicators
    let status: LightStatus = 'green';
    for (const ev of ownEvals) {
      status = maxStatus(status, ev.status);
    }

    // Factor in private self-reported symptoms for Immune & Behavioral
    const hasFeverSymptom = Boolean(checkIn?.symptoms.includes('feverish'));
    const hasColdSymptom = Boolean(checkIn?.symptoms.includes('soreThroat'));
    const hasFatigueSymptom = Boolean(
      checkIn?.symptoms.includes('fatigue') || checkIn?.symptoms.includes('headache')
    );

    if (cfg.key === 'immune' && (hasFeverSymptom || hasColdSymptom)) {
      status = maxStatus(status, hasFeverSymptom ? 'red' : 'yellow');
    }
    if (cfg.key === 'behavioral' && hasFatigueSymptom) {
      status = maxStatus(status, 'yellow');
    }

    // Combiner check: 2 or more yellow/flagged indicators across this system + related systems -> upgrade to RED
    let upgradedByCombiner = false;
    let combinerNote: string | null = null;

    const flaggedInCluster = [...ownEvals, ...relatedEvals].filter(
      (ev) => ev.status === 'yellow' || ev.status === 'red'
    );
    const yellowInCluster = flaggedInCluster.filter((ev) => ev.status === 'yellow');

    if (status === 'yellow' && (yellowInCluster.length >= 2 || flaggedInCluster.length >= 2)) {
      status = 'red';
      upgradedByCombiner = true;
      const names = flaggedInCluster.slice(0, 3).map((ev) => ev.meta.shortLabel);
      combinerNote = `Upgraded to Red because ${flaggedInCluster.length} connected signals are flagged together (${names.join(' + ')}).`;
    }

    // Build plain-English "Why?" reasons
    const whyReasons: string[] = [];
    for (const ev of ownEvals) {
      if (ev.status !== 'green') {
        whyReasons.push(formatIndicatorReason(ev));
      }
    }
    if (upgradedByCombiner) {
      for (const ev of relatedEvals) {
        if (ev.status !== 'green') {
          whyReasons.push(`Related signal: ${formatIndicatorReason(ev)}`);
        }
      }
    }
    if (cfg.key === 'immune' && checkIn && (hasFeverSymptom || hasColdSymptom)) {
      whyReasons.push('You reported feverish or throat symptoms in today’s private check-in.');
    }
    if (cfg.key === 'behavioral' && checkIn && hasFatigueSymptom) {
      whyReasons.push('You logged fatigue or headache in today’s private check-in.');
    }

    if (whyReasons.length === 0) {
      const primary = indicators[cfg.primaryIndicator];
      whyReasons.push(
        `${primary.meta.label} is steady at ${primary.todayValue.toFixed(primary.meta.decimals)} ${primary.meta.unit}, right inside your 14-day normal band.`
      );
    }

    const primaryEv = indicators[cfg.primaryIndicator];
    const decimals = primaryEv.meta.decimals;

    return {
      key: cfg.key,
      name: cfg.name,
      shortDescription: cfg.shortDescription,
      status,
      upgradedByCombiner,
      combinerNote,
      primaryMetricLabel: primaryEv.meta.shortLabel,
      primaryMetricValue: primaryEv.todayValue.toFixed(decimals),
      primaryMetricUnit: primaryEv.meta.unit,
      whyReasons,
      indicatorKeys: cfg.ownIndicators,
      actionSteps: status === 'green' ? [] : SYSTEM_ACTIONS[cfg.key],
      needsSelfExam: cfg.key === 'immune' && status !== 'green',
    };
  });

  return { indicators, systems };
}
