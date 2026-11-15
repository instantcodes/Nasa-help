import { DailyMetrics, IndicatorKey, IndicatorMeta } from '../types/health';

export const MISSION_LENGTH_DAYS = 90;
export const BASELINE_DAYS = 14;

export const INDICATORS: IndicatorMeta[] = [
  {
    key: 'restingHeartRate',
    label: 'Resting Heart Rate',
    shortLabel: 'Resting HR',
    unit: 'bpm',
    decimals: 0,
    direction: 'high',
    plainSummary: 'Morning pulse before getting out of bed.',
    primarySystem: 'cardio',
  },
  {
    key: 'hrv',
    label: 'Heart Rate Variability',
    shortLabel: 'HRV',
    unit: 'ms',
    decimals: 0,
    direction: 'low',
    plainSummary: 'Recovery reserve between heartbeats. Higher means better rest.',
    primarySystem: 'cardio',
  },
  {
    key: 'bodyTemperature',
    label: 'Body Temperature',
    shortLabel: 'Body Temp',
    unit: '°C',
    decimals: 1,
    direction: 'high',
    plainSummary: 'Core temperature taken during morning check.',
    primarySystem: 'immune',
  },
  {
    key: 'sleepHours',
    label: 'Sleep Duration',
    shortLabel: 'Sleep',
    unit: 'hrs',
    decimals: 1,
    direction: 'low',
    plainSummary: 'Total restful sleep logged in crew quarters.',
    primarySystem: 'behavioral',
  },
  {
    key: 'exerciseMinutes',
    label: 'Exercise Time',
    shortLabel: 'Exercise',
    unit: 'min',
    decimals: 0,
    direction: 'low',
    plainSummary: 'Daily strength and treadmill loading to protect bone and muscle.',
    primarySystem: 'boneMuscle',
  },
  {
    key: 'mood',
    label: 'Mood Rating',
    shortLabel: 'Mood',
    unit: '/ 5',
    decimals: 1,
    direction: 'low',
    plainSummary: 'Daily 1 to 5 self-rating of morale and calm.',
    primarySystem: 'behavioral',
  },
  {
    key: 'reactionTime',
    label: 'Reaction Time',
    shortLabel: 'Reaction',
    unit: 'ms',
    decimals: 0,
    direction: 'high',
    plainSummary: 'Speed on the 20-second morning focus tap test.',
    primarySystem: 'behavioral',
  },
  {
    key: 'cumulativeRadiation',
    label: 'Cumulative Radiation',
    shortLabel: 'Radiation',
    unit: 'mSv',
    decimals: 1,
    direction: 'high',
    plainSummary: 'Total space radiation absorbed since launch.',
    primarySystem: 'radiation',
  },
];

export const INDICATOR_MAP: Record<IndicatorKey, IndicatorMeta> = INDICATORS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<IndicatorKey, IndicatorMeta>
);

/** Deterministic pseudo-random wave so the 90-day mission is repeatable offline */
function seededNoise(day: number, salt: number): number {
  const x = Math.sin(day * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // -1 to +1
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function generateMissionData(): DailyMetrics[] {
  const days: DailyMetrics[] = [];
  let cumulativeRadiation = 0;

  for (let day = 1; day <= MISSION_LENGTH_DAYS; day++) {
    // Normal personal baseline values
    let restingHR = 58 + seededNoise(day, 1) * 2.1;
    let hrv = 66 + seededNoise(day, 2) * 3.8;
    let bodyTemp = 36.6 + seededNoise(day, 3) * 0.12;
    let sleepHours = 7.5 + seededNoise(day, 4) * 0.35;
    let exerciseMinutes = 95 + seededNoise(day, 5) * 6.5;
    let mood = 4.3 + seededNoise(day, 6) * 0.35;
    let reactionTime = 240 + seededNoise(day, 7) * 7.5;
    let dailyRad = 0.41 + seededNoise(day, 8) * 0.05;

    // Problem 1: Days 40-50 -> Stress (resting HR rises, sleep drops, mild mood & reaction ripple)
    if (day >= 40 && day <= 50) {
      const progress = Math.sin(((day - 39) / 12) * Math.PI); // smooth peak around day 45
      restingHR += 5 + progress * 8; // +5 to +13 bpm
      sleepHours -= 0.7 + progress * 1.1; // -0.7 to -1.8 hrs
      hrv -= 4 + progress * 6;
      mood -= 0.5 + progress * 0.6;
      reactionTime += 10 + progress * 14;
    }

    // Brief Solar Particle Event: Days 54-56 -> elevated daily radiation
    if (day >= 54 && day <= 56) {
      dailyRad += day === 55 ? 0.32 : 0.16;
    }

    // Problem 2: Days 60-65 -> Possible infection (low fever + high HR + fatigue)
    if (day >= 60 && day <= 65) {
      const peak = Math.sin(((day - 59) / 7) * Math.PI);
      bodyTemp += 0.55 + peak * 0.55; // 37.2°C to 37.7°C
      restingHR += 9 + peak * 9; // +9 to +18 bpm
      hrv -= 8 + peak * 7;
      sleepHours -= 0.4 + peak * 0.4;
      mood -= 0.4 + peak * 0.4;
      reactionTime += 8 + peak * 10;
    }

    // Problem 3: Days 70-90 -> Bone loss risk (exercise minutes steadily fall)
    if (day >= 70) {
      const declineRatio = (day - 70) / 20; // 0.0 on day 70 -> 1.0 on day 90
      exerciseMinutes -= 6 + declineRatio * 50; // falls from ~89 min down to ~39 min
      if (day >= 82) {
        hrv -= (day - 81) * 0.55;
      }
    }

    cumulativeRadiation += Math.max(0.25, dailyRad);

    days.push({
      day,
      restingHeartRate: Math.round(restingHR),
      hrv: Math.round(hrv),
      bodyTemperature: roundTo(bodyTemp, 1),
      sleepHours: roundTo(Math.max(3.5, Math.min(9.5, sleepHours)), 1),
      exerciseMinutes: Math.round(Math.max(15, exerciseMinutes)),
      mood: roundTo(Math.max(1, Math.min(5, mood)), 1),
      reactionTime: Math.round(reactionTime),
      cumulativeRadiation: roundTo(cumulativeRadiation, 1),
    });
  }

  return days;
}
