import { useEffect, useMemo, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ActionCardsSection } from './components/ActionCardsSection';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { DailyCheckInSection } from './components/DailyCheckInSection';
import { GroundSummaryModal } from './components/GroundSummaryModal';
import { MissionTimeline } from './components/MissionTimeline';
import { SystemCard } from './components/SystemCard';
import { TopBar } from './components/TopBar';
import { TrendChart } from './components/TrendChart';
import { INDICATORS, MISSION_LENGTH_DAYS } from './data/missionGenerator';
import { calculateBaseline, evaluateSystems } from './logic/driftEngine';
import { useOnlineStatus } from './services/aiClient';
import {
  loadCheckIns,
  loadCompletedActions,
  loadOrCreateMissionData,
  loadOutbox,
  loadSelectedDay,
  loadSelfExamChecks,
  resetAllMissionStorage,
  saveCheckIns,
  saveCompletedActions,
  saveOutbox,
  saveSelectedDay,
  saveSelfExamChecks,
} from './storage/localStore';
import {
  DailyCheckIn,
  DailyMetrics,
  GroundSummaryRecord,
  SystemKey,
} from './types/health';

type TrendFilter = 'all' | 'flagged' | SystemKey;

const TREND_FILTERS: { id: TrendFilter; label: string }[] = [
  { id: 'all', label: 'All 8 Indicators' },
  { id: 'flagged', label: 'Flagged Today' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'immune', label: 'Immune' },
  { id: 'boneMuscle', label: 'Bone / Muscle' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'radiation', label: 'Radiation' },
];

export default function App() {
  const [missionDays, setMissionDays] = useState<DailyMetrics[]>(() =>
    loadOrCreateMissionData()
  );
  const [selectedDay, setSelectedDay] = useState<number>(() => loadSelectedDay());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 3>(1);

  const [openWhySystems, setOpenWhySystems] = useState<Record<SystemKey, boolean>>({
    cardio: false,
    immune: false,
    boneMuscle: false,
    behavioral: false,
    radiation: false,
  });

  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>(() =>
    loadCompletedActions()
  );
  const [selfExamChecks, setSelfExamChecks] = useState<Record<string, boolean>>(() =>
    loadSelfExamChecks()
  );
  const [checkIns, setCheckIns] = useState<Record<number, DailyCheckIn>>(() =>
    loadCheckIns()
  );
  const [outbox, setOutbox] = useState<GroundSummaryRecord[]>(() => loadOutbox());

  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
  const [isGroundModalOpen, setIsGroundModalOpen] = useState<boolean>(false);
  const isOnline = useOnlineStatus();

  const baseline = useMemo(() => calculateBaseline(missionDays), [missionDays]);

  const { indicators, systems } = useMemo(
    () => evaluateSystems(missionDays, selectedDay - 1, baseline, checkIns[selectedDay]),
    [missionDays, selectedDay, baseline, checkIns]
  );

  // Persist day cursor
  useEffect(() => {
    saveSelectedDay(selectedDay);
  }, [selectedDay]);

  // Fast-forward mission playback
  useEffect(() => {
    if (!isPlaying) return;
    const stepMs = playSpeed === 3 ? 95 : 240;

    const timer = window.setInterval(() => {
      setSelectedDay((prev) => {
        if (prev >= MISSION_LENGTH_DAYS) {
          setIsPlaying(false);
          return MISSION_LENGTH_DAYS;
        }
        return prev + 1;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, playSpeed]);

  const handleTogglePlay = () => {
    if (!isPlaying && selectedDay >= MISSION_LENGTH_DAYS) {
      setSelectedDay(1);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSelectDay = (day: number) => {
    setIsPlaying(false);
    setSelectedDay(Math.max(1, Math.min(MISSION_LENGTH_DAYS, day)));
  };

  const handleResetMission = () => {
    setIsPlaying(false);
    const freshData = resetAllMissionStorage();
    setMissionDays(freshData);
    setSelectedDay(45);
    setCompletedActions({});
    setSelfExamChecks({});
    setCheckIns({});
  };

  const handleToggleWhy = (key: SystemKey) => {
    setOpenWhySystems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const anyWhyOpen = Object.values(openWhySystems).some(Boolean);
  const handleToggleAllWhy = () => {
    const nextState = !anyWhyOpen;
    setOpenWhySystems({
      cardio: nextState,
      immune: nextState,
      boneMuscle: nextState,
      behavioral: nextState,
      radiation: nextState,
    });
  };

  const handleToggleAction = (actionKey: string) => {
    setCompletedActions((prev) => {
      const next = { ...prev, [actionKey]: !prev[actionKey] };
      saveCompletedActions(next);
      return next;
    });
  };

  const handleToggleSelfExamItem = (examKey: string) => {
    setSelfExamChecks((prev) => {
      const next = { ...prev, [examKey]: !prev[examKey] };
      saveSelfExamChecks(next);
      return next;
    });
  };

  const handleSaveCheckIn = (record: DailyCheckIn) => {
    setCheckIns((prev) => {
      const next = { ...prev, [record.day]: record };
      saveCheckIns(next);
      return next;
    });
  };

  const handleQueueSummary = (record: GroundSummaryRecord) => {
    setOutbox((prev) => {
      const next = [record, ...prev];
      saveOutbox(next);
      return next;
    });
  };

  const visibleIndicators = useMemo(() => {
    return INDICATORS.filter((meta) => {
      if (trendFilter === 'all') return true;
      if (trendFilter === 'flagged') return indicators[meta.key].status !== 'green';
      return meta.primarySystem === trendFilter;
    });
  }, [trendFilter, indicators]);

  const redCount = systems.filter((s) => s.status === 'red').length;
  const yellowCount = systems.filter((s) => s.status === 'yellow').length;

  let headlineSummary = 'All 5 systems look steady and inside your personal normal.';
  let summaryTone = 'text-emerald-400';
  if (redCount > 0) {
    headlineSummary = `${redCount} ${
      redCount === 1 ? 'system needs' : 'systems need'
    } attention today${yellowCount > 0 ? ` · ${yellowCount} on watch` : ''}.`;
    summaryTone = 'text-rose-300';
  } else if (yellowCount > 0) {
    headlineSummary = `${yellowCount} ${
      yellowCount === 1 ? 'system is' : 'systems are'
    } drifting outside your normal band.`;
    summaryTone = 'text-amber-300';
  }

  return (
    <div id="top" className="min-h-screen bg-[#070B12] text-slate-100">
      <SpeedInsights />
      <TopBar
        queuedCount={outbox.length}
        onOpenGroundSummary={() => setIsGroundModalOpen(true)}
      />

      <main className="mx-auto max-w-[1380px] space-y-10 px-6 py-8">
        {/* Intro & Mission Timeline */}
        <div className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-50">
                Crew Health Dashboard
              </h1>
              <p className={`mt-1 text-sm font-medium ${summaryTone}`}>
                {headlineSummary}
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Offline-ready · Saved automatically on this device
            </div>
          </div>

          <MissionTimeline
            selectedDay={selectedDay}
            isPlaying={isPlaying}
            playSpeed={playSpeed}
            onSelectDay={handleSelectDay}
            onTogglePlay={handleTogglePlay}
            onToggleSpeed={() => setPlaySpeed((s) => (s === 1 ? 3 : 1))}
            onResetMission={handleResetMission}
          />
        </div>

        {/* 1. Traffic-Light Cards per System */}
        <section id="systems" aria-labelledby="systems-heading" className="scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="systems-heading" className="text-xl font-bold tracking-tight text-slate-50">
                Body Systems
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Tap Why? on any card for a plain-English explanation of today’s light.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleAllWhy}
              className="rounded-lg border border-slate-800 bg-[#0F1623] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {anyWhyOpen ? 'Hide all reasons' : 'Show all reasons'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {systems.map((sys) => (
              <SystemCard
                key={sys.key}
                system={sys}
                isOnline={isOnline}
                isWhyOpen={openWhySystems[sys.key]}
                onToggleWhy={() => handleToggleWhy(sys.key)}
              />
            ))}
          </div>
        </section>

        {/* 2. Action Cards per Flagged System */}
        <ActionCardsSection
          day={selectedDay}
          systems={systems}
          completedActions={completedActions}
          selfExamChecks={selfExamChecks}
          onToggleAction={handleToggleAction}
          onToggleSelfExamItem={handleToggleSelfExamItem}
        />

        {/* 3. Trend Charts per Indicator */}
        <section id="trends" aria-labelledby="trends-heading" className="scroll-mt-20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="trends-heading" className="text-xl font-bold tracking-tight text-slate-50">
                90-Day Health Trends
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Shaded band shows your Day 1–14 personal normal. Click any chart point to jump to that day.
              </p>
            </div>

            <div
              role="group"
              aria-label="Filter trend charts"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#0F1623] p-1"
            >
              {TREND_FILTERS.map((f) => {
                const active = trendFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTrendFilter(f.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {visibleIndicators.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-[#0F1623] p-6 text-sm text-slate-400">
              No indicators are flagged on Day {selectedDay}. Switch to All 8 Indicators to inspect every chart.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleIndicators.map((meta) => (
                <TrendChart
                  key={meta.key}
                  evaluation={indicators[meta.key]}
                  baseline={baseline[meta.key]}
                  missionDays={missionDays}
                  checkIns={checkIns}
                  selectedDay={selectedDay}
                  onSelectDay={handleSelectDay}
                />
              ))}
            </div>
          )}
        </section>

        {/* 4. AI Health Assistant (Coach + 90-Day Analyzer) */}
        <AiAssistantPanel
          day={selectedDay}
          isOnline={isOnline}
          systems={systems}
          missionDays={missionDays}
          baseline={baseline}
          checkIns={checkIns}
        />

        {/* 5. 30-Second Private Daily Check-In */}
        <DailyCheckInSection
          day={selectedDay}
          existingCheckIn={checkIns[selectedDay]}
          defaultMood={missionDays[selectedDay - 1].mood}
          onSaveCheckIn={handleSaveCheckIn}
        />
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        VitalDrift · Offline astronaut health monitoring · All data stays in local browser storage
      </footer>

      <GroundSummaryModal
        isOpen={isGroundModalOpen}
        isOnline={isOnline}
        day={selectedDay}
        systems={systems}
        missionDays={missionDays}
        baseline={baseline}
        checkIns={checkIns}
        completedActions={completedActions}
        checkIn={checkIns[selectedDay]}
        outbox={outbox}
        onClose={() => setIsGroundModalOpen(false)}
        onQueueSummary={handleQueueSummary}
      />
    </div>
  );
}
