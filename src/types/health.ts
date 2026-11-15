export type LightStatus = 'green' | 'yellow' | 'red';

export type IndicatorKey =
  | 'restingHeartRate'
  | 'hrv'
  | 'bodyTemperature'
  | 'sleepHours'
  | 'exerciseMinutes'
  | 'mood'
  | 'reactionTime'
  | 'cumulativeRadiation';

export type SystemKey =
  | 'radiation'
  | 'immune'
  | 'boneMuscle'
  | 'cardio'
  | 'behavioral';

export interface DailyMetrics {
  day: number; // 1 to 90
  restingHeartRate: number; // bpm
  hrv: number; // ms
  bodyTemperature: number; // °C
  sleepHours: number; // hours
  exerciseMinutes: number; // minutes
  mood: number; // 1 to 5
  reactionTime: number; // ms
  cumulativeRadiation: number; // mSv
}

export interface IndicatorMeta {
  key: IndicatorKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  direction: 'high' | 'low'; // which direction indicates unhealthy drift
  plainSummary: string;
  primarySystem: SystemKey;
}

export interface BaselineStats {
  avg: number;
  spread: number;
  /** For cumulative radiation, we also track the daily rate baseline over Days 1-14 */
  dailyRateAvg?: number;
  dailyRateSpread?: number;
}

export type BaselineMap = Record<IndicatorKey, BaselineStats>;

export interface IndicatorEvaluation {
  key: IndicatorKey;
  meta: IndicatorMeta;
  todayValue: number;
  baselineAvg: number;
  baselineSpread: number;
  /** Positive drift always means moving toward risk */
  drift: number;
  rawDelta: number;
  status: LightStatus;
  streakDays: number;
}

export interface ActionStep {
  id: string;
  title: string;
  detail: string;
}

export interface SystemEvaluation {
  key: SystemKey;
  name: string;
  shortDescription: string;
  status: LightStatus;
  upgradedByCombiner: boolean;
  combinerNote: string | null;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  primaryMetricUnit: string;
  whyReasons: string[];
  indicatorKeys: IndicatorKey[];
  actionSteps: ActionStep[];
  needsSelfExam: boolean;
}

export type SymptomId =
  | 'headache'
  | 'soreThroat'
  | 'feverish'
  | 'muscleSoreness'
  | 'fatigue';

export interface DailyCheckIn {
  day: number;
  mood: number; // 1 to 5
  sleepQuality: number; // 1 to 5
  symptoms: SymptomId[];
  privateNote: string;
  updatedAt: string;
}

export interface GroundSummaryRecord {
  id: string;
  day: number;
  createdAt: string;
  overallStatus: LightStatus;
  summaryText: string;
  includedPrivateNote: boolean;
  deliveryState: 'queued_offline';
}
