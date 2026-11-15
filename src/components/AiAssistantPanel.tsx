import React, { useState } from 'react';
import { Loader2, Send, Sparkles, TrendingUp } from 'lucide-react';
import {
  analyzeFullMissionTrends,
  askHealthCoach,
  buildDaySnapshots,
} from '../services/aiClient';
import {
  BaselineMap,
  DailyCheckIn,
  DailyMetrics,
  SystemEvaluation,
} from '../types/health';
import { AiAttribution, OfflineAiNotice } from './AiBadge';

interface AiAssistantPanelProps {
  day: number;
  isOnline: boolean;
  systems: SystemEvaluation[];
  missionDays: DailyMetrics[];
  baseline: BaselineMap;
  checkIns: Record<number, DailyCheckIn>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const STARTER_QUESTIONS = [
  'Why is my Immune light yellow?',
  'What should I focus on today?',
  'How do my sleep and heart rate connect?',
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  day,
  isOnline,
  systems,
  missionDays,
  baseline,
  checkIns,
}) => {
  // Feature 1: Ask My Health Coach state
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Feature 2: Analyze My Data state
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [analysisDay, setAnalysisDay] = useState<number | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleSendQuestion = async (textToSend?: string) => {
    const clean = (textToSend ?? question).trim();
    if (!clean || coachLoading || !isOnline) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setQuestion('');
    setCoachError(null);
    setCoachLoading(true);

    try {
      const last7Days = buildDaySnapshots(
        missionDays,
        baseline,
        checkIns,
        Math.max(1, day - 6),
        day
      );

      const res = await askHealthCoach({
        question: clean,
        day,
        systems,
        last7Days,
        history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.answer,
        },
      ]);
    } catch (err) {
      setCoachError(
        err instanceof Error ? err.message : 'Unable to reach your AI health coach.'
      );
    } finally {
      setCoachLoading(false);
    }
  };

  const handleAnalyzeTrends = async () => {
    if (analyzeLoading || !isOnline) return;
    setAnalyzeError(null);
    setAnalyzeLoading(true);

    try {
      const full90Days = buildDaySnapshots(missionDays, baseline, checkIns, 1, 90);
      const res = await analyzeFullMissionTrends({
        selectedDay: day,
        baseline,
        full90Days,
      });
      setAnalysisText(res.analysis);
      setAnalysisDay(day);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : 'Could not analyze mission trends.'
      );
    } finally {
      setAnalyzeLoading(false);
    }
  };

  return (
    <section
      id="assistant"
      aria-labelledby="assistant-heading"
      className="scroll-mt-20 space-y-4"
    >
      <div>
        <h2 id="assistant-heading" className="text-xl font-bold tracking-tight text-slate-50">
          AI Health Assistant
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Ask plain-English questions about the last 7 days or run a full 90-day trend check.
        </p>
      </div>

      {!isOnline ? (
        <OfflineAiNotice />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 1. Ask My Health Coach */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F1623] p-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-50">Ask My Health Coach</h3>
                <span className="font-mono text-xs tabular-nums text-slate-400">
                  Context: Day {day} + last 7 days
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Uses your current system lights and 7-day drift scores to suggest 2–3 next steps.
              </p>

              {/* Starter questions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => handleSendQuestion(sample)}
                    disabled={coachLoading}
                    className="rounded-lg border border-slate-800 bg-[#0A0F18] px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-100 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="rounded-lg border border-slate-800/80 bg-[#0A0F18] p-4 text-xs text-slate-400">
                    Ask anything about your body lights, sleep, heart rate, or today’s plan.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg border p-3.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-50'
                          : 'border-slate-800 bg-[#0A0F18] text-slate-200'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="mb-2">
                          <AiAttribution />
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  ))
                )}

                {coachLoading && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0A0F18] p-3.5 text-xs text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden="true" />
                    <span>Reviewing your last 7 days...</span>
                  </div>
                )}

                {coachError && (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/25 p-3 text-xs text-rose-200">
                    {coachError}
                  </div>
                )}
              </div>
            </div>

            {/* Chat input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-4"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask e.g. Why is my Cardio light red?"
                aria-label="Ask your AI health coach"
                className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-[#0A0F18] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={coachLoading || !question.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ask</span>
              </button>
            </form>
          </div>

          {/* 2. Analyze My Data */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F1623] p-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-50">Analyze My Data</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Reviews all 90 days of indicator values and drift scores to spot linked changes and upcoming risks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeTrends}
                  disabled={analyzeLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {analyzeLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{analyzeLoading ? 'Analyzing 90 days...' : 'Analyze my trends'}</span>
                </button>
              </div>

              <div className="mt-4">
                {analyzeError && (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/25 p-3 text-xs text-rose-200">
                    {analyzeError}
                  </div>
                )}

                {!analysisText && !analyzeLoading && !analyzeError && (
                  <div className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-[#0A0F18] p-4 text-xs leading-relaxed text-slate-400">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                    <span>
                      Click <strong className="text-slate-200">Analyze my trends</strong> to summarize what changed across the 90-day mission, when each shift started, which systems moved together, and what may turn red next.
                    </span>
                  </div>
                )}

                {analyzeLoading && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0A0F18] p-4 text-xs text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden="true" />
                    <span>Scanning all 90 mission days and drift scores...</span>
                  </div>
                )}

                {analysisText && !analyzeLoading && (
                  <div className="rounded-lg border border-slate-800 bg-[#0A0F18] p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <AiAttribution />
                      {analysisDay !== null && (
                        <span className="font-mono text-[11px] text-slate-500">
                          Run at Day {analysisDay}
                        </span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                      {analysisText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
