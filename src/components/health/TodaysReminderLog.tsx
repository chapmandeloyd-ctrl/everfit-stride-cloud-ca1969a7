import { useEffect, useState } from 'react';
import { CheckCircle2, Camera } from 'lucide-react';
import {
  getTodaysLog,
  formatReminderTimeLabel,
  formatTappedAt,
  type ReminderLogEntry,
} from '@/lib/healthReminderLog';

export function TodaysReminderLog() {
  const [entries, setEntries] = useState<ReminderLogEntry[]>([]);

  useEffect(() => {
    const load = () => setEntries(getTodaysLog());
    load();
    const onUpdate = () => load();
    window.addEventListener('health-reminder-log-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('health-reminder-log-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Today's reminder log
      </p>
      <ul className="space-y-1.5">
        {entries.map((e, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            {e.reminderTime ? (
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Camera className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-foreground">
              {e.reminderTime ? (
                <>
                  Snapped for{' '}
                  <span className="font-semibold">
                    {formatReminderTimeLabel(e.reminderTime)}
                  </span>{' '}
                  check-in
                </>
              ) : (
                <>Manual snap</>
              )}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatTappedAt(e.tappedAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
