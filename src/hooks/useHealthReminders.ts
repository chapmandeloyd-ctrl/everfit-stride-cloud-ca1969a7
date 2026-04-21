import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STORAGE_KEY = 'healthReminderSettings';
const FIRED_KEY = 'healthReminderFiredToday';

type ReminderSettings = {
  enabled: boolean;
  times: string[];
};

type FiredState = {
  date: string; // YYYY-MM-DD
  times: string[]; // already-fired "HH:MM"
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

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadFired(): FiredState {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return { date: todayKey(), times: [] };
    const parsed: FiredState = JSON.parse(raw);
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), times: [] };
    }
    return parsed;
  } catch {
    return { date: todayKey(), times: [] };
  }
}

function saveFired(state: FiredState) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(state));
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

  useEffect(() => {
    const check = () => {
      const settings = loadSettings();
      if (!settings || !settings.enabled || !settings.times?.length) return;

      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const fired = loadFired();

      for (const time of settings.times) {
        if (fired.times.includes(time)) continue;
        const [h, m] = time.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const reminderMins = h * 60 + m;
        const diff = nowMins - reminderMins;
        // Fire if reminder time was within the last 5 min and not in the future
        if (diff >= 0 && diff <= 5) {
          fireReminder(time);
          fired.times = [...fired.times, time];
          saveFired(fired);
        }
      }
    };

    const fireReminder = (time: string) => {
      const message = 'Snap your Apple Health screen to update your dashboard.';
      toast('Health check-in time', {
        description: message,
        duration: 10000,
        action: {
          label: 'Log now',
          onClick: () => navigateRef.current('/client/health'),
        },
      });

      // Best-effort native notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const notif = new Notification('Health check-in time', {
            body: message,
            tag: `health-reminder-${time}`,
            icon: '/KSOM-360_LOGO-2.png',
          });
          notif.onclick = () => {
            window.focus();
            navigateRef.current('/client/health');
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
