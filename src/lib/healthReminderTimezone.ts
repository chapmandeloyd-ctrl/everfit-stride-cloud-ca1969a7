/**
 * Helpers for evaluating reminder times in a user-selected IANA timezone
 * (e.g. "America/New_York"). Settings are stored in localStorage as
 * `healthReminderSettings.timezone`. When unset, we fall back to the
 * browser's resolved timezone.
 */

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns { hours, minutes, seconds, dateKey } for `date` rendered in `timezone`.
 * dateKey is YYYY-MM-DD in that zone — useful for "today" comparisons.
 */
export function getZonedParts(date: Date, timezone: string): {
  hours: number;
  minutes: number;
  seconds: number;
  dateKey: string;
} {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    let hours = parseInt(get('hour'), 10);
    if (hours === 24) hours = 0; // Intl can return "24" for midnight in some locales
    const minutes = parseInt(get('minute'), 10);
    const seconds = parseInt(get('second'), 10);
    return { hours, minutes, seconds, dateKey: `${year}-${month}-${day}` };
  } catch {
    // Invalid timezone — fall back to local time
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    };
  }
}

/** Curated list of common IANA timezones for the selector. */
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'Pacific/Honolulu', label: 'Honolulu (HST)' },
  { value: 'America/Anchorage', label: 'Anchorage (AKT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Denver', label: 'Denver (MT)' },
  { value: 'America/Phoenix', label: 'Phoenix (MST, no DST)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Athens', label: 'Athens (EET)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai / Delhi (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AET)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZT)' },
  { value: 'UTC', label: 'UTC' },
];

/**
 * Build the option list for the selector, ensuring the user's current browser
 * timezone and any custom-saved timezone always appear at the top.
 */
export function buildTimezoneOptions(currentValue: string | null | undefined): {
  value: string;
  label: string;
}[] {
  const browser = getBrowserTimezone();
  const list = [...COMMON_TIMEZONES];
  const ensure = (tz: string, label: string) => {
    if (!list.some((o) => o.value === tz)) list.unshift({ value: tz, label });
  };
  ensure(browser, `${browser} (device)`);
  if (currentValue && currentValue !== browser) ensure(currentValue, currentValue);
  return list;
}