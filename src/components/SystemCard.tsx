import React from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { LightStatus, SystemEvaluation } from '../types/health';

interface SystemCardProps {
  system: SystemEvaluation;
  isWhyOpen: boolean;
  onToggleWhy: () => void;
}

const STATUS_CONFIG: Record<
  LightStatus,
  {
    label: string;
    glyph: string;
    cardBorder: string;
    lightColor: string;
    textColor: string;
    surfaceTint: string;
  }
> = {
  green: {
    label: 'Good',
    glyph: '●',
    cardBorder: 'border-slate-800 hover:border-emerald-500/40',
    lightColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    surfaceTint: 'bg-[#0F1623]',
  },
  yellow: {
    label: 'Watch',
    glyph: '▲',
    cardBorder: 'border-amber-500/45 hover:border-amber-400/70',
    lightColor: 'bg-amber-400',
    textColor: 'text-amber-300',
    surfaceTint: 'bg-[#14171F]',
  },
  red: {
    label: 'Act Now',
    glyph: '■',
    cardBorder: 'border-rose-500/60 hover:border-rose-400/80',
    lightColor: 'bg-rose-500',
    textColor: 'text-rose-300',
    surfaceTint: 'bg-[#17121C]',
  },
};

export const SystemCard: React.FC<SystemCardProps> = ({
  system,
  isWhyOpen,
  onToggleWhy,
}) => {
  const style = STATUS_CONFIG[system.status];

  return (
    <article
      className={`flex flex-col justify-between rounded-xl border p-5 transition-colors duration-200 ${style.cardBorder} ${style.surfaceTint}`}
    >
      <div>
        {/* Traffic light and plain status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full ${style.lightColor}`}
              aria-hidden="true"
            />
            <span className={`text-xs font-semibold tracking-wide ${style.textColor}`}>
              {style.glyph} {style.label}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleWhy}
            aria-expanded={isWhyOpen}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/90 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>Why?</span>
            {isWhyOpen ? (
              <ChevronUp className="h-3 w-3 text-slate-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* System name & short description */}
        <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50">
          {system.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {system.shortDescription}
        </p>

        {/* Primary today reading */}
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <div className="text-xs text-slate-400">{system.primaryMetricLabel}</div>
          <div className="mt-1 flex items-baseline">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-50">
              {system.primaryMetricValue}
            </span>
            <span className="ml-1.5 font-mono text-xs text-slate-400">
              {system.primaryMetricUnit}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable plain-English Why? drawer */}
      {isWhyOpen && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F18] p-3.5 text-xs leading-relaxed text-slate-200">
          {system.upgradedByCombiner && system.combinerNote && (
            <p className="mb-2 font-medium text-rose-300">{system.combinerNote}</p>
          )}
          <ul className="space-y-1.5">
            {system.whyReasons.map((reason, idx) => (
              <li key={idx} className="text-slate-300">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};
