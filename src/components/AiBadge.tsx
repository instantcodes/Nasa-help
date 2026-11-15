import React from 'react';
import { WifiOff } from 'lucide-react';

export const AiAttribution: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
      <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
        AI-generated
      </span>
      <span>Not a doctor. For decision support only.</span>
    </div>
  );
};

export const OfflineAiNotice: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0A0F18] text-slate-400 ${
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
      }`}
    >
      <WifiOff className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span>AI tools need a connection</span>
    </div>
  );
};
