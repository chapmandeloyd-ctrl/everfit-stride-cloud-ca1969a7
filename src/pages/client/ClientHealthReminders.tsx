import { useEffect, useMemo, useState } from 'react';
import { ClientLayout } from '@/components/ClientLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Bell, Plus, Trash2, ArrowLeft, Smartphone, FlaskConical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type ReminderSettings = {
  enabled: boolean;
  times: string[]; // "HH:MM" 24h
};

const STORAGE_KEY = 'healthReminderSettings';
const DEFAULTS: ReminderSettings = {
  enabled: false,
  times: ['08:00', '13:00', '20:00'],
};

function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      times: Array.isArray(parsed.times) && parsed.times.length > 0 ? parsed.times : DEFAULTS.times,
    };
  } catch {
    return DEFAULTS;
  }
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ClientHealthReminders() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULTS);
  const [hasChanges, setHasChanges] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const sortedTimes = useMemo(
    () => [...settings.times].sort((a, b) => a.localeCompare(b)),
    [settings.times],
  );

  const updateSettings = (next: Partial<ReminderSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
    setHasChanges(true);
  };

  const addTime = () => {
    if (settings.times.length >= 8) {
      toast.info('Maximum of 8 daily reminders.');
      return;
    }
    // Pick a default new time that isn't already in the list
    const candidates = ['07:00', '10:00', '12:00', '15:00', '18:00', '21:00', '22:00'];
    const next = candidates.find((t) => !settings.times.includes(t)) ?? '12:00';
    updateSettings({ times: [...settings.times, next] });
  };

  const updateTime = (index: number, value: string) => {
    const next = [...settings.times];
    next[index] = value;
    updateSettings({ times: next });
  };

  const removeTime = (index: number) => {
    if (settings.times.length <= 1) {
      toast.info('Keep at least one reminder time.');
      return;
    }
    const next = settings.times.filter((_, i) => i !== index);
    updateSettings({ times: next });
  };

  /**
   * Test mode: schedule a reminder N minutes from now and immediately persist
   * + enable reminders so the banner countdown can be verified end-to-end.
   */
  const scheduleTestReminder = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60_000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    const newTime = `${hh}:${mm}`;

    const mergedTimes = Array.from(new Set([...settings.times, newTime])).sort((a, b) =>
      a.localeCompare(b),
    );
    const toSave: ReminderSettings = { enabled: true, times: mergedTimes };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    setSettings(toSave);
    setHasChanges(false);

    toast.success(
      `Test reminder set for ${formatTimeLabel(newTime)} (in ~${minutesFromNow} min). Head to the Health page to watch the countdown.`,
    );
  };

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notifications are not supported in this browser.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled. Reminders will pop up at your scheduled times.');
      } else {
        toast.info('Reminders will appear in-app only. Enable notifications in your browser settings for pop-ups.');
      }
    } catch {
      toast.error('Could not request notification permission.');
    }
  };

  const handleSave = () => {
    // Dedupe + sort
    const cleaned = Array.from(new Set(settings.times)).sort((a, b) => a.localeCompare(b));
    const toSave: ReminderSettings = { enabled: settings.enabled, times: cleaned };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    setSettings(toSave);
    setHasChanges(false);
    toast.success(
      toSave.enabled
        ? `Saved — ${cleaned.length} daily reminder${cleaned.length === 1 ? '' : 's'} scheduled.`
        : 'Reminders saved (currently turned off).',
    );
  };

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/client/health')}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Health Check-In Reminders
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Get nudged to snap your Apple Health screen at the times you choose.
            </p>
          </div>
        </div>

        <Card className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Enable daily reminders</p>
              <p className="text-xs text-muted-foreground">
                Turn on to receive nudges throughout the day.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>

          {settings.enabled && permission !== 'granted' && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-start gap-3">
              <Smartphone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Allow notifications for pop-up reminders</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Without permission, reminders only show when the app is open.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void requestNotifPermission()}>
                Allow
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Reminder times</p>
              <Button size="sm" variant="outline" onClick={addTime}>
                <Plus className="h-4 w-4 mr-1" />
                Add time
              </Button>
            </div>

            <div className="space-y-2">
              {sortedTimes.map((time) => {
                const originalIndex = settings.times.indexOf(time);
                return (
                  <div
                    key={`${time}-${originalIndex}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(originalIndex, e.target.value)}
                      className="bg-transparent text-base font-mono focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
                    />
                    <span className="text-sm text-muted-foreground flex-1">
                      {formatTimeLabel(time)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeTime(originalIndex)}
                      aria-label="Remove time"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              Tip: 3 reminders (morning, afternoon, evening) catches your full daily activity.
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 space-y-3 border-dashed">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Test mode</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Add a one-off reminder a minute or two from now to verify the banner countdown and pop-up. The time is saved and reminders are turned on immediately.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => scheduleTestReminder(1)}>
              Test in 1 min
            </Button>
            <Button size="sm" variant="outline" onClick={() => scheduleTestReminder(2)}>
              Test in 2 min
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/client/health">Open Health page</Link>
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" asChild>
            <Link to="/client/health">Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="min-w-32">
            Save reminders
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}
