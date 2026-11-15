import React, { useMemo, useState } from 'react';
import { BASELINE_DAYS, MISSION_LENGTH_DAYS } from '../data/missionGenerator';
import {
  BaselineStats,
  DailyCheckIn,
  DailyMetrics,
  IndicatorEvaluation,
  LightStatus,
} from '../types/health';

interface TrendChartProps {
  evaluation: IndicatorEvaluation;
  baseline: BaselineStats;
  missionDays: DailyMetrics[];
  checkIns: Record<number, DailyCheckIn>;
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

const STATUS_STROKE: Record<LightStatus, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#f43f5e',
};

const STATUS_TEXT: Record<LightStatus, string> = {
  green: 'text-emerald-400',
  yellow: 'text-amber-300',
  red: 'text-rose-300',
};

const STATUS_LABEL: Record<LightStatus, string> = {
  green: '● Good',
  yellow: '▲ Watch',
  red: '■ Act Now',
};

export const TrendChart: React.FC<TrendChartProps> = ({
  evaluation,
  baseline,
  missionDays,
  checkIns,
  selectedDay,
  onSelectDay,
}) => {
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const { meta, todayValue, status, drift } = evaluation;

  const isCumulativeRad = meta.key === 'cumulativeRadiation';

  // Extract 90-day series (using private check-in mood override when present)
  const series = useMemo(() => {
    return missionDays.map((d) => {
      if (meta.key === 'mood' && checkIns[d.day]) {
        return checkIns[d.day].mood;
      }
      return d[meta.key];
    });
  }, [missionDays, checkIns, meta.key]);

  // Compute y-axis bounds safely covering both data and baseline band
  const { minY, maxY, bandLow, bandHigh } = useMemo(() => {
    const lowBand = baseline.avg - baseline.spread;
    const highBand = baseline.avg + baseline.spread;

    let dataMin = Math.min(...series);
    let dataMax = Math.max(...series);

    if (!isCumulativeRad) {
      dataMin = Math.min(dataMin, lowBand - baseline.spread * 0.6);
      dataMax = Math.max(dataMax, highBand + baseline.spread * 0.6);
    } else {
      dataMin = 0;
      dataMax = Math.max(dataMax * 1.08, 45);
    }

    const padding = Math.max((dataMax - dataMin) * 0.1, 0.2);
    return {
      minY: isCumulativeRad ? 0 : dataMin - padding,
      maxY: dataMax + padding,
      bandLow: lowBand,
      bandHigh: highBand,
    };
  }, [series, baseline.avg, baseline.spread, isCumulativeRad]);

  const width = 520;
  const height = 176;
  const padLeft = 40;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 24;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xForDay = (day: number) =>
    padLeft + ((day - 1) / (MISSION_LENGTH_DAYS - 1)) * plotW;

  const yForValue = (val: number) => {
    const ratio = (val - minY) / (maxY - minY || 1);
    return padTop + plotH - ratio * plotH;
  };

  // Build SVG paths
  const activePoints = series
    .slice(0, selectedDay)
    .map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${xForDay(idx + 1).toFixed(1)} ${yForValue(val).toFixed(1)}`)
    .join(' ');

  const futurePoints =
    selectedDay < MISSION_LENGTH_DAYS
      ? series
          .slice(selectedDay - 1)
          .map(
            (val, idx) =>
              `${idx === 0 ? 'M' : 'L'} ${xForDay(selectedDay + idx).toFixed(1)} ${yForValue(val).toFixed(1)}`
          )
          .join(' ')
      : '';

  // Cumulative radiation expected quiet-sun pace polygon vs horizontal baseline band
  const bandPolygonPoints = useMemo(() => {
    if (!isCumulativeRad) return '';
    const rateAvg = baseline.dailyRateAvg ?? 0.41;
    const rateSpread = baseline.dailyRateSpread ?? 0.05;
    const upper: string[] = [];
    const lower: string[] = [];
    for (let d = 1; d <= MISSION_LENGTH_DAYS; d += 5) {
      const expected = rateAvg * d;
      const allowance = Math.max(0.8, rateSpread * Math.sqrt(d) * 2.2);
      upper.push(`${xForDay(d).toFixed(1)},${yForValue(expected + allowance).toFixed(1)}`);
      lower.unshift(`${xForDay(d).toFixed(1)},${yForValue(Math.max(0, expected - allowance)).toFixed(1)}`);
    }
    const endExpected = rateAvg * MISSION_LENGTH_DAYS;
    const endAllowance = Math.max(0.8, rateSpread * Math.sqrt(MISSION_LENGTH_DAYS) * 2.2);
    upper.push(`${xForDay(MISSION_LENGTH_DAYS).toFixed(1)},${yForValue(endExpected + endAllowance).toFixed(1)}`);
    lower.unshift(
      `${xForDay(MISSION_LENGTH_DAYS).toFixed(1)},${yForValue(Math.max(0, endExpected - endAllowance)).toFixed(1)}`
    );
    return [...upper, ...lower].join(' ');
  }, [isCumulativeRad, baseline.dailyRateAvg, baseline.dailyRateSpread]);

  const activeDay = hoverDay ?? selectedDay;
  const activeValue = series[activeDay - 1];
  const baselineWindowEndX = xForDay(BASELINE_DAYS);
  const todayX = xForDay(selectedDay);
  const todayY = yForValue(todayValue);

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const clamped = Math.max(padLeft, Math.min(width - padRight, relX));
    const dayRatio = (clamped - padLeft) / plotW;
    const day = Math.round(1 + dayRatio * (MISSION_LENGTH_DAYS - 1));
    setHoverDay(Math.max(1, Math.min(MISSION_LENGTH_DAYS, day)));
  };

  return (
    <article className="rounded-xl border border-slate-800 bg-[#0F1623] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-50">{meta.label}</h3>
            <span className={`text-xs font-semibold ${STATUS_TEXT[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{meta.plainSummary}</p>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-50">
              {activeValue.toFixed(meta.decimals)}
            </span>
            <span className="ml-1 font-mono text-xs text-slate-400">{meta.unit}</span>
          </div>
          <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
            {hoverDay ? `Day ${hoverDay}` : `Day ${selectedDay}`}
            <span aria-hidden="true"> · </span>
            {isCumulativeRad
              ? `Quiet pace: ${((baseline.dailyRateAvg ?? 0.41) * activeDay).toFixed(1)} mSv`
              : `Normal: ${baseline.avg.toFixed(meta.decimals)} ± ${baseline.spread.toFixed(
                  meta.decimals === 0 ? 1 : meta.decimals
                )}`}
          </div>
        </div>
      </div>

      {/* SVG Trend Canvas */}
      <div className="mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full select-none cursor-crosshair overflow-visible"
          onMouseMove={handlePointerMove}
          onMouseLeave={() => setHoverDay(null)}
          onClick={() => {
            if (hoverDay) onSelectDay(hoverDay);
          }}
          role="img"
          aria-label={`${meta.label} 90-day trend chart`}
        >
          {/* Days 1-14 Baseline Window */}
          <rect
            x={padLeft}
            y={padTop}
            width={baselineWindowEndX - padLeft}
            height={plotH}
            fill="rgba(34, 211, 238, 0.06)"
          />
          <text
            x={padLeft + 4}
            y={padTop + 11}
            fill="#64748b"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
          >
            Baseline (1–14)
          </text>

          {/* Baseline normal band */}
          {isCumulativeRad ? (
            <polygon points={bandPolygonPoints} fill="rgba(16, 185, 129, 0.14)" />
          ) : (
            <>
              <rect
                x={padLeft}
                y={yForValue(bandHigh)}
                width={plotW}
                height={Math.max(2, yForValue(bandLow) - yForValue(bandHigh))}
                fill="rgba(16, 185, 129, 0.14)"
              />
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={yForValue(baseline.avg)}
                y2={yForValue(baseline.avg)}
                stroke="rgba(16, 185, 129, 0.4)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            </>
          )}

          {/* Y-axis min / max labels */}
          <text
            x={padLeft - 6}
            y={padTop + 7}
            textAnchor="end"
            fill="#64748b"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
          >
            {maxY.toFixed(meta.decimals)}
          </text>
          <text
            x={padLeft - 6}
            y={padTop + plotH}
            textAnchor="end"
            fill="#64748b"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
          >
            {minY.toFixed(meta.decimals)}
          </text>

          {/* X-axis markers */}
          {[1, 30, 60, 90].map((d) => (
            <text
              key={d}
              x={xForDay(d)}
              y={height - 5}
              textAnchor={d === 1 ? 'start' : d === 90 ? 'end' : 'middle'}
              fill="#64748b"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              D{d}
            </text>
          ))}

          {/* Future preview line */}
          {futurePoints && (
            <path
              d={futurePoints}
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Active line up to selectedDay */}
          <path
            d={activePoints}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Selected Day vertical marker */}
          <line
            x1={todayX}
            x2={todayX}
            y1={padTop}
            y2={padTop + plotH}
            stroke={STATUS_STROKE[status]}
            strokeWidth="1.25"
            strokeOpacity="0.65"
          />

          {/* Hover hairline if inspecting another day */}
          {hoverDay && hoverDay !== selectedDay && (
            <>
              <line
                x1={xForDay(hoverDay)}
                x2={xForDay(hoverDay)}
                y1={padTop}
                y2={padTop + plotH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={xForDay(hoverDay)}
                cy={yForValue(series[hoverDay - 1])}
                r="3.5"
                fill="#e2e8f0"
              />
            </>
          )}

          {/* Today dot */}
          <circle
            cx={todayX}
            cy={todayY}
            r="5"
            fill={STATUS_STROKE[status]}
            stroke="#070B12"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>Green band = your 14-day normal</span>
        <span className="font-mono tabular-nums">
          Drift score: {drift > 0 ? `+${drift.toFixed(1)}` : drift.toFixed(1)}
        </span>
      </div>
    </article>
  );
};
