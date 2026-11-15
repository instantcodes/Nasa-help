import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { lookupNasaResearch, ResearchResult } from '../services/aiClient';
import { LightStatus, SystemEvaluation } from '../types/health';
import { AiAttribution, OfflineAiNotice } from './AiBadge';

interface SystemCardProps {
  system: SystemEvaluation;
  isOnline: boolean;
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
  isOnline,
  isWhyOpen,
  onToggleWhy,
}) => {
  const style = STATUS_CONFIG[system.status];
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const handleLearnMore = async () => {
    if (!isOnline || researchLoading) return;
    setResearchLoading(true);
    setResearchError(null);

    try {
      const data = await lookupNasaResearch({
        systemName: system.name,
        status: system.status,
        whyReasons: system.whyReasons,
      });
      setResearch(data);
    } catch (err) {
      setResearchError(
        err instanceof Error ? err.message : 'Unable to look up NASA research right now.'
      );
    } finally {
      setResearchLoading(false);
    }
  };

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

      {/* Expandable plain-English Why? drawer + NASA Research Lookup */}
      {isWhyOpen && (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-[#0A0F18] p-3.5 text-xs leading-relaxed text-slate-200">
          {system.upgradedByCombiner && system.combinerNote && (
            <p className="font-medium text-rose-300">{system.combinerNote}</p>
          )}
          <ul className="space-y-1.5">
            {system.whyReasons.map((reason, idx) => (
              <li key={idx} className="text-slate-300">
                {reason}
              </li>
            ))}
          </ul>

          {/* NASA Research Lookup */}
          <div className="border-t border-slate-800/90 pt-3">
            {!isOnline ? (
              <OfflineAiNotice compact />
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleLearnMore}
                  disabled={researchLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {researchLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {researchLoading
                      ? 'Searching NASA research...'
                      : research
                      ? 'Refresh NASA research'
                      : 'Learn more'}
                  </span>
                </button>

                {researchError && (
                  <div className="rounded border border-rose-500/40 bg-rose-950/25 p-2 text-rose-200">
                    {researchError}
                  </div>
                )}

                {research && !researchLoading && (
                  <div className="space-y-2 rounded-md border border-slate-800 bg-[#070B12] p-2.5">
                    <AiAttribution />
                    <div className="whitespace-pre-wrap text-slate-300">
                      {research.summary}
                    </div>
                    {research.sources.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-2">
                        <div className="text-[11px] font-semibold text-slate-400">
                          Sources
                        </div>
                        <ul className="mt-1 space-y-1">
                          {research.sources.map((src, i) => (
                            <li key={i}>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-all"
                              >
                                <span className="truncate max-w-[210px]">{src.title}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
};
