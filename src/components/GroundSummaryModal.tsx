import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Radio, WifiOff, X } from 'lucide-react';
import {
  DailyCheckIn,
  GroundSummaryRecord,
  LightStatus,
  SystemEvaluation,
} from '../types/health';

interface GroundSummaryModalProps {
  isOpen: boolean;
  day: number;
  systems: SystemEvaluation[];
  completedActions: Record<string, boolean>;
  checkIn?: DailyCheckIn;
  outbox: GroundSummaryRecord[];
  onClose: () => void;
  onQueueSummary: (record: GroundSummaryRecord) => void;
}

const STATUS_WORD: Record<LightStatus, string> = {
  green: 'GOOD (Green)',
  yellow: 'WATCH (Yellow)',
  red: 'ACT NOW (Red)',
};

export const GroundSummaryModal: React.FC<GroundSummaryModalProps> = ({
  isOpen,
  day,
  systems,
  completedActions,
  checkIn,
  outbox,
  onClose,
  onQueueSummary,
}) => {
  const [includePrivateNote, setIncludePrivateNote] = useState(false);
  const [copied, setCopied] = useState(false);
  const [queuedNow, setQueuedNow] = useState(false);

  const overallStatus: LightStatus = useMemo(() => {
    if (systems.some((s) => s.status === 'red')) return 'red';
    if (systems.some((s) => s.status === 'yellow')) return 'yellow';
    return 'green';
  }, [systems]);

  const summaryText = useMemo(() => {
    const lines: string[] = [
      `VITALDRIFT DAILY STATUS SUMMARY — MISSION DAY ${day} OF 90`,
      `Overall Crew Health: ${STATUS_WORD[overallStatus]}`,
      `Generated Offline: ${new Date().toLocaleString()}`,
      '',
      'SYSTEM LIGHTS:',
    ];

    for (const sys of systems) {
      lines.push(
        `- ${sys.name}: ${STATUS_WORD[sys.status]} | ${sys.primaryMetricLabel}: ${sys.primaryMetricValue} ${sys.primaryMetricUnit}`
      );
      if (sys.status !== 'green') {
        lines.push(`  Reason: ${sys.whyReasons.join(' ')}`);
        const doneCount = sys.actionSteps.filter(
          (step) => completedActions[`day-${day}-${step.id}`]
        ).length;
        lines.push(
          `  Crew Action Progress: ${doneCount} of ${sys.actionSteps.length} steps completed`
        );
      }
    }

    if (checkIn) {
      lines.push('');
      lines.push('DAILY CHECK-IN:');
      lines.push(`- Mood: ${checkIn.mood}/5 | Rested feel: ${checkIn.sleepQuality}/5`);
      lines.push(
        `- Reported symptoms: ${
          checkIn.symptoms.length > 0 ? checkIn.symptoms.join(', ') : 'None'
        }`
      );
      if (includePrivateNote && checkIn.privateNote) {
        lines.push(`- Crew Note: ${checkIn.privateNote}`);
      }
    }

    return lines.join('\n');
  }, [day, overallStatus, systems, completedActions, checkIn, includePrivateNote]);

  if (!isOpen) return null;

  const handleQueue = () => {
    const record: GroundSummaryRecord = {
      id: `${Date.now()}-${day}`,
      day,
      createdAt: new Date().toLocaleString(),
      overallStatus,
      summaryText,
      includedPrivateNote: includePrivateNote,
      deliveryState: 'queued_offline',
    };
    onQueueSummary(record);
    setQueuedNow(true);
    setTimeout(() => setQueuedNow(false), 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be restricted in some frames; download & queue remain available
    }
  };

  const handleDownload = () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vitaldrift-day-${day}-summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ground-summary-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-700 bg-[#0F1623] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 id="ground-summary-title" className="text-lg font-bold text-slate-50">
              Send Summary to Ground
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <WifiOff className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span>Works completely offline — queues locally until next radio window</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close summary modal"
            className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:border-slate-700 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {checkIn?.privateNote && (
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrivateNote}
                onChange={(e) => setIncludePrivateNote(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-cyan-400"
              />
              <span>Include my private check-in note in this ground summary</span>
            </label>
          )}

          <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-[#070B12] p-4 font-mono text-xs leading-relaxed text-slate-200">
            {summaryText}
          </pre>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleQueue}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Queue for next ground link</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-slate-500 cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied' : 'Copy text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-slate-500 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download .txt</span>
            </button>

            {queuedNow && (
              <span className="text-xs font-medium text-emerald-400">
                Saved to offline outbox
              </span>
            )}
          </div>

          {/* Local Offline Outbox History */}
          {outbox.length > 0 && (
            <div className="border-t border-slate-800 pt-4">
              <div className="text-xs font-semibold text-slate-300">
                Offline Outbox Queue ({outbox.length})
              </div>
              <div className="mt-2.5 space-y-2">
                {outbox.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0A0F18] px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-slate-100">
                        Day {item.day}
                      </span>
                      <span className="mx-2 text-slate-600">·</span>
                      <span className="text-slate-300">{STATUS_WORD[item.overallStatus]}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      Queued offline · {item.createdAt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
