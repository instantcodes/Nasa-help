import React from 'react';
import { Radio } from 'lucide-react';

interface TopBarProps {
  queuedCount: number;
  onOpenGroundSummary: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ queuedCount, onOpenGroundSummary }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#070B12]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-8 px-6 py-3.5">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0"
        >
          VitalDrift
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <a
            href="#systems"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Systems
          </a>
          <a
            href="#actions"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Actions
          </a>
          <a
            href="#trends"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Trends
          </a>
          <a
            href="#checkin"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Daily Check-In
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenGroundSummary}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Send summary to ground{queuedCount > 0 ? ` (${queuedCount})` : ''}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
