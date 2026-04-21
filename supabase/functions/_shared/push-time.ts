// Shared timezone helper for all dispatchers.

export function nowInZone(tz: string): {
  hhmm: string;
  date: string;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun..6=Sat
} {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
    );
    const hour = parseInt(parts.hour, 10);
    const minute = parseInt(parts.minute, 10);
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return {
      hhmm: `${parts.hour}:${parts.minute}`,
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour,
      minute,
      weekday: weekdayMap[parts.weekday] ?? 0,
    };
  } catch {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return {
      hhmm: `${hh}:${mm}`,
      date: d.toISOString().slice(0, 10),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      weekday: d.getUTCDay(),
    };
  }
}

// Get a user's timezone from client_health_reminders, fallback "UTC".
export async function getClientTimezone(
  supabase: any,
  clientId: string,
): Promise<string> {
  const { data } = await supabase
    .from("client_health_reminders")
    .select("timezone")
    .eq("client_id", clientId)
    .maybeSingle();
  return data?.timezone || "UTC";
}