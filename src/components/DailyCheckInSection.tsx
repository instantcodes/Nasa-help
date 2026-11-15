import React, { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { DailyCheckIn, SymptomId } from '../types/health';

interface DailyCheckInSectionProps {
  day: number;
  existingCheckIn?: DailyCheckIn;
  defaultMood: number;
  onSaveCheckIn: (checkIn: DailyCheckIn) => void;
}

const MOOD_OPTIONS = [
  { value: 1, label: '1 · Rough' },
  { value: 2, label: '2 · Low' },
  { value: 3, label: '3 · Okay' },
  { value: 4, label: '4 · Good' },
  { value: 5, label: '5 · Great' },
];

const SLEEP_FEEL_OPTIONS = [
  { value: 1, label: '1 · Restless' },
  { value: 2, label: '2 · Light' },
  { value: 3, label: '3 · Fair' },
  { value: 4, label: '4 · Solid' },
  { value: 5, label: '5 · Deep' },
];

const SYMPTOM_OPTIONS: { id: SymptomId; label: string }[] = [
  { id: 'headache', label: 'Headache' },
  { id: 'soreThroat', label: 'Sore throat or cough' },
  { id: 'feverish', label: 'Feverish or chills' },
  { id: 'muscleSoreness', label: 'Muscle soreness' },
  { id: 'fatigue', label: 'Fatigue or brain fog' },
];

export const DailyCheckInSection: React.FC<DailyCheckInSectionProps> = ({
  day,
  existingCheckIn,
  defaultMood,
  onSaveCheckIn,
}) => {
  const [mood, setMood] = useState<number>(Math.round(defaultMood));
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [privateNote, setPrivateNote] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (existingCheckIn) {
      setMood(existingCheckIn.mood);
      setSleepQuality(existingCheckIn.sleepQuality);
      setSymptoms(existingCheckIn.symptoms);
      setPrivateNote(existingCheckIn.privateNote);
    } else {
      setMood(Math.max(1, Math.min(5, Math.round(defaultMood))));
      setSleepQuality(4);
      setSymptoms([]);
      setPrivateNote('');
    }
    setSavedNotice(false);
  }, [day, existingCheckIn, defaultMood]);

  const toggleSymptom = (id: SymptomId) => {
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCheckIn({
      day,
      mood,
      sleepQuality,
      symptoms,
      privateNote: privateNote.trim(),
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setSavedNotice(true);
  };

  return (
    <section
      id="checkin"
      aria-labelledby="checkin-heading"
      className="scroll-mt-20 rounded-xl border border-slate-800 bg-[#0F1623] p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="checkin-heading" className="text-xl font-bold tracking-tight text-slate-50">
            30-Second Private Check-In
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Log how you feel on Day {day}. Your mood and symptom answers immediately update today’s evaluation.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Lock className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span>Saved privately on this device only</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Mood 1-5 */}
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              1. How is your mood today?
            </label>
            <div className="mt-2.5 grid grid-cols-5 gap-2">
              {MOOD_OPTIONS.map((opt) => {
                const active = mood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMood(opt.value)}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-800 bg-[#0A0F18] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep Quality 1-5 */}
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              2. How rested did you feel waking up?
            </label>
            <div className="mt-2.5 grid grid-cols-5 gap-2">
              {SLEEP_FEEL_OPTIONS.map((opt) => {
                const active = sleepQuality === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSleepQuality(opt.value)}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-800 bg-[#0A0F18] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Symptoms */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-200">
              3. Any physical symptoms right now?
            </span>
            {symptoms.length > 0 && (
              <button
                type="button"
                onClick={() => setSymptoms([])}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Clear symptoms
              </button>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {SYMPTOM_OPTIONS.map((item) => {
              const active = symptoms.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSymptom(item.id)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                      : 'border-slate-800 bg-[#0A0F18] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional private note */}
        <div>
          <label
            htmlFor="private-checkin-note"
            className="block text-sm font-semibold text-slate-200"
          >
            4. Private note (optional — stays off ground summaries unless you include it)
          </label>
          <textarea
            id="private-checkin-note"
            rows={2}
            value={privateNote}
            onChange={(e) => setPrivateNote(e.target.value)}
            placeholder="Anything else you noticed today, like cabin noise, appetite, or stiff joints..."
            className="mt-2 w-full rounded-lg border border-slate-800 bg-[#0A0F18] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Save Day {day} check-in
            </button>

            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Saved privately for Day {day}</span>
              </span>
            )}
            {!savedNotice && existingCheckIn && (
              <span className="text-xs text-slate-400">
                Last saved at {existingCheckIn.updatedAt}
              </span>
            )}
          </div>
        </div>
      </form>
    </section>
  );
};
