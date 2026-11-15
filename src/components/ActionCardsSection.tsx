import React, { useState } from 'react';
import { Check, CheckSquare, ClipboardList, ShieldCheck, Square } from 'lucide-react';
import { SystemEvaluation } from '../types/health';

interface ActionCardsSectionProps {
  day: number;
  systems: SystemEvaluation[];
  completedActions: Record<string, boolean>;
  selfExamChecks: Record<string, boolean>;
  onToggleAction: (actionKey: string) => void;
  onToggleSelfExamItem: (examKey: string) => void;
}

const SELF_EXAM_ITEMS = [
  { id: 'throat', label: 'Throat looks red or feels scratchy when swallowing' },
  { id: 'nodes', label: 'Small tender bumps under jaw or sides of neck' },
  { id: 'breathing', label: 'Shortness of breath or chest tightness at rest' },
  { id: 'sinus', label: 'Blocked nose, ear pressure, or sinus ache' },
  { id: 'chills', label: 'Feeling cold, shaky, or unusual body aches' },
];

export const ActionCardsSection: React.FC<ActionCardsSectionProps> = ({
  day,
  systems,
  completedActions,
  selfExamChecks,
  onToggleAction,
  onToggleSelfExamItem,
}) => {
  const [showSelfExam, setShowSelfExam] = useState(false);

  const flaggedSystems = systems.filter((s) => s.status !== 'green');

  return (
    <section id="actions" aria-labelledby="actions-heading" className="scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="actions-heading" className="text-xl font-bold tracking-tight text-slate-50">
            What to Do Now
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Simple steps for any system showing Watch or Act Now on Day {day}.
          </p>
        </div>
        {flaggedSystems.length > 0 && (
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {flaggedSystems.length} {flaggedSystems.length === 1 ? 'system' : 'systems'} flagged
          </span>
        )}
      </div>

      {flaggedSystems.length === 0 ? (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-emerald-500/25 bg-[#0D161A] p-5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-400" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-slate-100">
              All systems are inside your personal normal range today
            </div>
            <p className="mt-0.5 text-sm text-slate-400">
              No extra corrective steps needed. Continue your scheduled exercise, water intake, and 7+ hours of sleep.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {flaggedSystems.map((sys) => {
            const isRed = sys.status === 'red';
            const doneCount = sys.actionSteps.filter(
              (step) => completedActions[`day-${day}-${step.id}`]
            ).length;

            return (
              <div
                key={sys.key}
                className={`rounded-xl border p-5 ${
                  isRed
                    ? 'border-rose-500/45 bg-[#15101A]'
                    : 'border-amber-500/40 bg-[#14171F]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        isRed ? 'text-rose-300' : 'text-amber-300'
                      }`}
                    >
                      {isRed ? '■ Act Now' : '▲ Watch'} · {sys.name}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{sys.whyReasons[0]}</p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-400 whitespace-nowrap shrink-0">
                    {doneCount}/{sys.actionSteps.length} done
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {sys.actionSteps.map((step) => {
                    const storageKey = `day-${day}-${step.id}`;
                    const checked = Boolean(completedActions[storageKey]);
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => onToggleAction(storageKey)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                          checked
                            ? 'border-emerald-500/35 bg-emerald-950/25'
                            : 'border-slate-800 bg-[#0A0F18] hover:border-slate-700'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0 text-cyan-400">
                          {checked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-500" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm font-medium ${
                              checked ? 'text-slate-400 line-through' : 'text-slate-100'
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {step.detail}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {sys.needsSelfExam && (
                  <div className="mt-4 border-t border-slate-800/80 pt-3.5">
                    <button
                      type="button"
                      onClick={() => setShowSelfExam((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {showSelfExam
                          ? 'Hide 2-minute self-exam checklist'
                          : 'Open 2-minute self-exam checklist'}
                      </span>
                    </button>

                    {showSelfExam && (
                      <div className="mt-3 rounded-lg border border-slate-800 bg-[#0A0F18] p-3.5 space-y-2">
                        <div className="text-xs font-medium text-slate-300">
                          Tap any sign you notice right now (saved locally for Day {day}):
                        </div>
                        {SELF_EXAM_ITEMS.map((item) => {
                          const examKey = `day-${day}-exam-${item.id}`;
                          const flagged = Boolean(selfExamChecks[examKey]);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => onToggleSelfExamItem(examKey)}
                              className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                                flagged
                                  ? 'border-amber-500/45 bg-amber-950/30 text-amber-100'
                                  : 'border-slate-800/90 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  flagged
                                    ? 'border-amber-400 bg-amber-400 text-slate-950'
                                    : 'border-slate-600'
                                }`}
                              >
                                {flagged && <Check className="h-3 w-3" aria-hidden="true" />}
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
