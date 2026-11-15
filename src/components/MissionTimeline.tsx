import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { BASELINE_DAYS, MISSION_LENGTH_DAYS } from '../data/missionGenerator';

interface MissionTimelineProps {
  selectedDay: number;
  isPlaying: boolean;
  playSpeed: 1 | 3;
  onSelectDay: (day: number) => void;
  onTogglePlay: () => void;
  onToggleSpeed: () => void;
  onResetMission: () => void;
}

const MILESTONES = [
  { day: 14, label: 'Day 14 · Baseline Ready' },
  { day: 45, label: 'Day 45 · High Stress' },
  { day: 62, label: 'Day 62 · Low Fever' },
  { day: 82, label: 'Day 82 · Exercise Drop' },
];

export const MissionTimeline: React.FC<MissionTimelineProps> = ({
  selectedDay,
  isPlaying,
  playSpeed,
  onSelectDay,
  onTogglePlay,
  onToggleSpeed,
  onResetMission,
}) => {
  const phaseLabel =
    selectedDay <= BASELINE_DAYS
      ? 'Personal baseline window (Days 1–14)'
      : 'Comparing today against your 14-day personal normal';

  return (
    <section
      aria-label="Mission timeline controls"
      className="rounded-xl border border-slate-800 bg-[#0F1623] p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-slate-400">Mission Day</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-50">
              {selectedDay}
            </span>
            <span className="font-mono text-sm tabular-nums text-slate-500">
              / {MISSION_LENGTH_DAYS}
            </span>
          </div>
          <span className="text-xs text-slate-400">{phaseLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 focus-visible:outline-2 focus-visible:outline-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause mission</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Play mission</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleSpeed}
            aria-label={`Playback speed ${playSpeed}x`}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 font-mono text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {playSpeed}x speed
          </button>

          <button
            type="button"
            onClick={onResetMission}
            title="Restore default 90-day mission data and clear local check-ins"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset data</span>
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tabular-nums text-slate-500">Day 1</span>
          <input
            type="range"
            min={1}
            max={MISSION_LENGTH_DAYS}
            value={selectedDay}
            onChange={(e) => onSelectDay(Number(e.target.value))}
            aria-label="Select mission day"
            className="mission-slider w-full"
          />
          <span className="font-mono text-xs tabular-nums text-slate-500">Day 90</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Jump to:</span>
          {MILESTONES.map((m) => {
            const active = selectedDay === m.day;
            return (
              <button
                key={m.day}
                type="button"
                onClick={() => onSelectDay(m.day)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
