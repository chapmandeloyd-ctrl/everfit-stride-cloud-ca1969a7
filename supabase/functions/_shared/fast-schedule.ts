// Shared server-side computation of a client's scheduled fast-start moment.
// Mirrors the client's uniform eating-window logic:
//   eatEnd = day_start_hour + (24 - fastHours)
// so the backend can fire reminders / auto-starts even when the app is closed.

export function getTzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = dtf.formatToParts(at);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
    const hour = get('hour') % 24; // Intl can emit "24" for midnight
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
    return (asUTC - at.getTime()) / 60_000;
  } catch {
    return 0;
  }
}

export function makeDateInTz(y: number, mo: number, d: number, h: number, min: number, tz: string): Date {
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
  const asIfUTC = new Date(iso + 'Z');
  const offset = getTzOffsetMinutes(tz, asIfUTC);
  return new Date(asIfUTC.getTime() - offset * 60_000);
}

export function tzDateParts(now: Date, tz: string): { y: number; mo: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return {
    y: parseInt(parts.find((p) => p.type === 'year')?.value ?? '2000', 10),
    mo: parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10),
    d: parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10),
  };
}

/** Today's scheduled fast-start moment in the client's timezone, or null. */
export function computeScheduledFastStart(opts: {
  fastHours: number;
  dayStartHour: number | null;
  tz: string;
  now: Date;
}): Date | null {
  if (!opts.fastHours || opts.fastHours <= 0 || opts.fastHours >= 24) return null;
  const eh = Math.min(23, Math.max(1, 24 - opts.fastHours));
  let endHour: number;
  if (typeof opts.dayStartHour === 'number' && !Number.isNaN(opts.dayStartHour)) {
    endHour = (((Math.floor(opts.dayStartHour) + eh) % 24) + 24) % 24;
  } else {
    endHour = 20;
  }
  const { y, mo, d } = tzDateParts(opts.now, opts.tz);
  return makeDateInTz(y, mo, d, endHour, 0, opts.tz);
}
