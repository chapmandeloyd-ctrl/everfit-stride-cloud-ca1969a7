import { useEffect, useMemo, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBrowserTimezone, getZonedParts } from '@/lib/healthReminderTimezone';

const STORAGE_KEY = 'healthReminderSettings';

type ReminderSettings = {
  enabled: boolean;
  times: string[];
  timezone?: string;
};

function loadSettings(): ReminderSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function getNextReminder(times: string[]): { time: string; minutesUntil: number } | null {
  if (!times.length) return null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sorted = times
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      return { time: t, mins: h * 60 + m };
    })
    .sort((a, b) => a.mins - b.mins);

  const next = sorted.find((s) => s.mins > nowMins) ?? sorted[0]; // wrap to tomorrow
  let diff = next.mins - nowMins;
  if (diff <= 0) diff += 24 * 60;
  return { time: next.time, minutesUntil: diff };
}

function getNextReminderSeconds(
  times: string[],
  timezone: string,
): { time: string; secondsUntil: number } | null {
  if (!times.length) return null;
  const { hours, minutes, seconds } = getZonedParts(new Date(), timezone);
  const nowSecs = hours * 3600 + minutes * 60 + seconds;
  const sorted = times
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      return { time: t, secs: h * 3600 + m * 60 };
    })
    .sort((a, b) => a.secs - b.secs);

  const next = sorted.find((s) => s.secs > nowSecs) ?? sorted[0];
  let diff = next.secs - nowSecs;
  if (diff <= 0) diff += 24 * 3600;
  return { time: next.time, secondsUntil: diff };
}

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const totalMins = Math.floor(seconds / 60);
  if (totalMins < 60) {
    const s = seconds % 60;
    if (totalMins < 10 && s > 0) return `${totalMins}m ${s}s`;
    return `${totalMins} min`;
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface Props {
  /** True when user arrived via reminder (e.g. ?snap=1) — shows highlight for HIGHLIGHT_MS */
  fromReminder: boolean;
  onSnap: () => void;
}

const HIGHLIGHT_MS = 30_000;

export function ReminderStatusBanner({ fromReminder, onSnap }: Props) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [showHighlight, setShowHighlight] = useState(fromReminder);
  const [countdownSeconds, setCountdownSeconds] = useState(HIGHLIGHT_MS / 1000);
  const [tick, setTick] = useState(0);

  // Load settings once + tick every second so countdown stays live as time passes
  useEffect(() => {
    setSettings(loadSettings());
    const settingsRefresh = window.setInterval(() => {
      setSettings(loadSettings());
    }, 30_000);
    const tickInterval = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => {
      window.clearInterval(settingsRefresh);
      window.clearInterval(tickInterval);
    };
  }, []);

  // Highlight countdown
  useEffect(() => {
    if (!fromReminder) return;
    setShowHighlight(true);
    setCountdownSeconds(HIGHLIGHT_MS / 1000);
    const tick = window.setInterval(() => {
      setCountdownSeconds((s) => {
        if (s <= 1) {
          setShowHighlight(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [fromReminder]);

  const next = useMemo(() => {
    if (!settings?.enabled || !settings.times?.length) return null;
    const tz = settings.timezone || getBrowserTimezone();
    return getNextReminderSeconds(settings.times, tz);
  }, [settings, tick]);

  // Active reminder highlight (pulse + countdown bar)
  if (showHighlight) {
    const pct = (countdownSeconds / (HIGHLIGHT_MS / 1000)) * 100;
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-primary bg-primary/10 p-4 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Today's check-in is ready</p>
            <p className="text-xs text-muted-foreground">
              Snap your Apple Health screen to lock in today's totals.
            </p>
          </div>
          <Button size="sm" onClick={onSnap}>
            Snap now
          </Button>
        </div>
        {/* Countdown bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // Quiet mode: show next scheduled reminder
  if (next) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>
          Next check-in reminder at{' '}
          <span className="font-semibold text-foreground">{formatTimeLabel(next.time)}</span>
          {' · in '}
          <span className="font-semibold text-foreground">{formatCountdown(next.secondsUntil)}</span>
        </span>
      </div>
    );
  }

  return null;
}
