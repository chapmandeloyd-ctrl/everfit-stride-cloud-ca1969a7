import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getBrowserTimezone, getZonedParts } from '@/lib/healthReminderTimezone';
import { useHealthReminderSettings, type ReminderSettings } from '@/hooks/useHealthReminderSettings';

// Per-client "already fired today" cache keyed by client id so trainer
// impersonation doesn't bleed into the trainer's own device state.
const FIRED_KEY_PREFIX = 'healthReminderFiredToday::';

type FiredState = {
  date: string; // YYYY-MM-DD
  times: string[]; // already-fired "HH:MM"
};

function todayKey(timezone?: string): string {
  const tz = timezone || getBrowserTimezone();
  return getZonedParts(new Date(), tz).dateKey;
}

function loadFired(clientId: string, timezone?: string): FiredState {
  try {
    const today = todayKey(timezone);
    const raw = localStorage.getItem(FIRED_KEY_PREFIX + clientId);
    if (!raw) return { date: today, times: [] };
    const parsed: FiredState = JSON.parse(raw);
    if (parsed.date !== today) {
      return { date: today, times: [] };
    }
    return parsed;
  } catch {
    return { date: todayKey(timezone), times: [] };
  }
}

function saveFired(clientId: string, state: FiredState) {
  localStorage.setItem(FIRED_KEY_PREFIX + clientId, JSON.stringify(state));
}

/**
 * Polls every 30s while the app is open. If a configured reminder time has passed
 * within the last 5 minutes and hasn't been fired today, shows a toast + native
 * notification (if permission granted) prompting the user to log Apple Health.
 */
export function useHealthReminders() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Pull the (effective) client's reminder schedule from the database. The
  // hook handles impersonation, caching, and refetch on focus.
  const { data: settings } = useHealthReminderSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const check = () => {
      const current = settingsRef.current;
      if (!current || !current.enabled || !current.times?.length) return;
      // We need a stable per-client key for the "already fired today" cache.
      // Use the timezone + times signature as a fallback when no client id is
      // available (shouldn't happen in practice — the query is gated on it).
      const cacheKey = (current as ReminderSettings & { _clientId?: string })._clientId
        || `${current.timezone}|${current.times.join(',')}`;

      const tz = current.timezone || getBrowserTimezone();
      const { hours, minutes } = getZonedParts(new Date(), tz);
      const nowMins = hours * 60 + minutes;
      const fired = loadFired(cacheKey, tz);

      for (const time of current.times) {
        if (fired.times.includes(time)) continue;
        const [h, m] = time.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const reminderMins = h * 60 + m;
        const diff = nowMins - reminderMins;
        if (diff >= 0 && diff <= 5) {
          fireReminder(time);
          fired.times = [...fired.times, time];
          saveFired(cacheKey, fired);
        }
      }
    };

    const fireReminder = (time: string) => {
      const message = 'Snap your Apple Health screen to update your dashboard.';
      const [hh, mm] = time.split(':').map(Number);
      const period = hh >= 12 ? 'PM' : 'AM';
      const hour12 = hh % 12 === 0 ? 12 : hh % 12;
      const timeLabel = `${hour12}:${String(mm).padStart(2, '0')} ${period}`;
      const actionLabel = `Snap Now (${timeLabel})`;
      toast('Health check-in time', {
        description: message,
        duration: 10000,
        action: {
          label: actionLabel,
          onClick: () => navigateRef.current('/client/health?snap=1'),
        },
      });

      // Best-effort native notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const notif = new Notification(`Health check-in — ${timeLabel}`, {
            body: `${message} Tap to ${actionLabel}.`,
            tag: `health-reminder-${time}`,
            icon: '/KSOM-360_LOGO-2.png',
          });
          notif.onclick = () => {
            window.focus();
            navigateRef.current('/client/health?snap=1');
            notif.close();
          };
        } catch {
          /* ignored */
        }
      }
    };

    // Run once on mount, then poll
    check();
    const interval = window.setInterval(check, 30_000);

    // Re-check when tab becomes visible (catches missed reminders)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
