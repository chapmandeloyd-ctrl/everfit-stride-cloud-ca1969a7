// Shared protocol-plan calculator used by trainer Command Center + client Complete Plan

export type PlanType = "recurring" | "extended";

export interface KetoTypeLite {
  abbreviation: string;
  name?: string;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  carb_limit_grams?: number;
}

export interface ProtocolLite {
  name?: string;
  fast_target_hours: number;
}

export interface ComputePlanInput {
  weightLbs: number;
  ketoType: KetoTypeLite;
  protocol?: ProtocolLite | null;
  activityMult?: number; // BMR-ish multiplier (13..19)
  goalAdjust?: number;   // e.g. -0.20 cut, 0 maintain, +0.10 bulk, or -custom%
  planType?: PlanType;
  planLengthDays?: number;   // recurring
  extendedTotalHours?: number; // extended
  /**
   * Anchor hour (0-23) for the START of the eating window. When provided,
   * the eating window opens at this hour and closes at eatStart + eatHours.
   * Defaults to a fixed 8 PM close (legacy behavior) when omitted.
   */
  eatStartHour?: number;
}

export interface PlanDay {
  day: string;
  isRefeed: boolean;
  cal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fastWindow: string;
  eatStart: string;
  eatEnd: string;
  tight: boolean;
  omad: boolean;
  adFast: boolean;
}

export interface ComputedPlan {
  tdee: number;
  target: number;
  proteinFloor: number;
  days: PlanDay[];
  protocolName?: string;
  extended: boolean;
  totalHours?: number;
  needsRefeed?: boolean;
  totals: {
    avgCal: number;
    totalFastHours: number;
    fastingDays: number;
    eatingDays: number;
    refeedDays: number;
  };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function computePlan(input: ComputePlanInput): ComputedPlan | null {
  const {
    weightLbs: w,
    ketoType: kt,
    protocol,
    activityMult = 16,
    goalAdjust = 0,
    planType = "recurring",
    planLengthDays = 7,
    extendedTotalHours = 48,
    eatStartHour,
  } = input;

  if (!w || !kt) return null;

  const tdee = Math.round(w * activityMult);
  const target = Math.round(tdee * (1 + goalAdjust));
  const proteinFloor = Math.round(w * 0.7);

  const rawFastHours = Math.max(0, protocol?.fast_target_hours ?? 16);
  const protoName = (protocol?.name ?? "").toLowerCase();

  // Classify protocol pattern by name (falls back to uniform daily window).
  type PatternKind = "5_2" | "4_3" | "eat_stop_eat" | "alternate_day" | "weekend_warrior" | "uniform";
  const pattern: PatternKind =
    /\b5\s*[:\-x/]\s*2\b/.test(protoName) || protoName.includes("5:2")
      ? "5_2"
      : /\b4\s*[:\-x/]\s*3\b/.test(protoName) || protoName.includes("4:3")
      ? "4_3"
      : protoName.includes("eat-stop-eat") || protoName.includes("eat stop eat")
      ? "eat_stop_eat"
      : protoName.includes("alternate")
      ? "alternate_day"
      : protoName.includes("weekend warrior")
      ? "weekend_warrior"
      : "uniform";

  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:00 ${period}`;
  };
  const windowFor = (fastH: number) => {
    const fh = Math.min(23, Math.max(1, fastH));
    const eh = 24 - fh;
    // If a day-start anchor is provided, open the window at that hour and
    // slide the close forward by the eating length. Otherwise fall back to
    // the legacy fixed 8 PM close.
    let startHour: number;
    let endHour: number;
    if (typeof eatStartHour === "number" && !Number.isNaN(eatStartHour)) {
      startHour = ((Math.floor(eatStartHour) % 24) + 24) % 24;
      endHour = (startHour + eh) % 24;
    } else {
      endHour = 20;
      startHour = ((endHour - eh) % 24 + 24) % 24;
    }
    return {
      label: `${fh}:${eh}`,
      eatStart: fmt(startHour),
      eatEnd: fmt(endHour),
      tight: eh <= 4,
      omad: fh >= 20,
      eatHours: eh,
      fastHours: fh,
    };
  };

  // Uniform daily window (used by non-patterned protocols + non-fast days in patterns).
  const uniformFastHours = rawFastHours >= 24 ? 16 : Math.min(23, rawFastHours || 16);
  const uniformWin = windowFor(uniformFastHours);
  // Normal (16:8) eating day used within 5:2 / 4:3 / Eat-Stop-Eat / Weekend Warrior weekdays
  const normalWin = windowFor(16);
  const isCKD = kt.abbreviation === "CKD";

  // 5:2 / 4:3 "low-calorie fast" day target (women ~500, men ~600 — split difference: 550)
  const lowCalTarget = 550;
  const lowCalProteinFloor = Math.round(w * 0.5);

  const buildLowCalDay = (label: string, dayName: string): PlanDay => {
    const cal = lowCalTarget;
    const proteinG = Math.max(lowCalProteinFloor, Math.round((cal * (kt.protein_pct / 100)) / 4));
    const carbG = Math.round((cal * (kt.carbs_pct / 100)) / 4);
    const fatG = Math.max(0, Math.round((cal - proteinG * 4 - carbG * 4) / 9));
    return {
      day: dayName,
      isRefeed: false,
      cal, proteinG, carbG, fatG,
      fastWindow: label,
      eatStart: "12:00 PM",
      eatEnd: "1:00 PM",
      tight: true,
      omad: true,
      adFast: false,
    };
  };

  let days: PlanDay[] = [];
  let extended = false;
  let totalHoursOut: number | undefined;
  let needsRefeed: boolean | undefined;

  if (planType === "extended") {
    extended = true;
    const totalHours = Math.max(12, Math.min(240, extendedTotalHours));
    totalHoursOut = totalHours;
    const fastDayCount = Math.max(1, Math.ceil(totalHours / 24));
    needsRefeed = totalHours >= 36;
    const refeedCal = Math.round(target * 0.7);
    const refeedProteinG = Math.round(w * 1.0);
    const refeedCarbG = 30;
    const refeedFatG = Math.max(0, Math.round((refeedCal - refeedProteinG * 4 - refeedCarbG * 4) / 9));
    const totalDays = fastDayCount + (needsRefeed ? 1 : 0);
    days = Array.from({ length: totalDays }).map((_, i) => {
      const isRefeedDay = !!needsRefeed && i === totalDays - 1;
      if (isRefeedDay) {
        return {
          day: `Day ${i + 1}`, isRefeed: true,
          cal: refeedCal, proteinG: refeedProteinG, carbG: refeedCarbG, fatG: refeedFatG,
          fastWindow: "Refeed", eatStart: "12:00 PM", eatEnd: "6:00 PM",
          tight: false, omad: false, adFast: false,
        };
      }
      const hoursLeft = totalHours - i * 24;
      const hoursThisDay = Math.min(24, hoursLeft);
      return {
        day: `Day ${i + 1}`, isRefeed: false,
        cal: 0, proteinG: 0, carbG: 0, fatG: 0,
        fastWindow: `${hoursThisDay}h fast · water + electrolytes`,
        eatStart: "", eatEnd: "",
        tight: false, omad: false, adFast: true,
      };
    });
  } else {
    const length = Math.max(1, Math.min(30, planLengthDays));
    // Per-day classification: 0..6 (Mon..Sun) index within the week
    // Kinds: "normal" (default eat day), "lowcal" (5:2 / 4:3 low-cal day),
    // "fullfast" (24h fast day), "refeed" (CKD carb refeed), "long" (20h+ specific day)
    type DayKind = "normal" | "lowcal" | "fullfast" | "refeed" | "long20";
    const kindForWeekIdx = (wi: number): DayKind => {
      if (pattern === "5_2") {
        // Mon (0) + Thu (3) non-consecutive low-cal days
        return wi === 0 || wi === 3 ? "lowcal" : "normal";
      }
      if (pattern === "4_3") {
        // Mon / Wed / Fri low-cal (non-consecutive)
        return wi === 0 || wi === 2 || wi === 4 ? "lowcal" : "normal";
      }
      if (pattern === "eat_stop_eat") {
        // One full 24h fast midweek (Wed)
        return wi === 2 ? "fullfast" : "normal";
      }
      if (pattern === "alternate_day") {
        return wi % 2 === 0 ? "fullfast" : "normal";
      }
      if (pattern === "weekend_warrior") {
        return wi === 5 || wi === 6 ? "long20" : "normal";
      }
      return "normal";
    };

    days = Array.from({ length }).map((_, i) => {
      const weekIdx = i % 7;
      const d = DAYS[weekIdx];
      const dayName = length > 7 ? `${d} ${Math.floor(i / 7) + 1}` : d;
      const isRefeed = isCKD && pattern === "uniform" && (weekIdx === 5 || weekIdx === 6);
      let kind: DayKind = isRefeed ? "refeed" : kindForWeekIdx(weekIdx);

      if (kind === "refeed") {
        const cal = Math.round(target * 1.15);
        const proteinG = Math.max(proteinFloor, Math.round((cal * (kt.protein_pct / 100)) / 4));
        const carbG = Math.round((cal * 0.45) / 4);
        const fatG = Math.round((cal - proteinG * 4 - carbG * 4) / 9);
        return {
          day: dayName, isRefeed: true,
          cal, proteinG, carbG, fatG,
          fastWindow: "14:10 (refeed)",
          eatStart: "10:00 AM", eatEnd: "8:00 PM",
          tight: false, omad: false, adFast: false,
        };
      }
      if (kind === "lowcal") {
        return buildLowCalDay("Low-cal day (~550 cal)", dayName);
      }
      if (kind === "fullfast") {
        return {
          day: dayName, isRefeed: false,
          cal: 0, proteinG: 0, carbG: 0, fatG: 0,
          fastWindow: "24h fast · water + electrolytes",
          eatStart: "", eatEnd: "",
          tight: false, omad: false, adFast: true,
        };
      }
      // "normal" or "long20" — build an eating day with the appropriate window
      const win = kind === "long20" ? windowFor(20) : (pattern === "uniform" ? uniformWin : normalWin);
      const cal = target;
      const proteinG = Math.max(proteinFloor, Math.round((cal * (kt.protein_pct / 100)) / 4));
      const carbG = Math.round((cal * (kt.carbs_pct / 100)) / 4);
      const fatG = Math.round((cal - proteinG * 4 - carbG * 4) / 9);
      return {
        day: dayName, isRefeed: false,
        cal, proteinG, carbG, fatG,
        fastWindow: win.label,
        eatStart: win.eatStart, eatEnd: win.eatEnd,
        tight: win.tight, omad: win.omad, adFast: false,
      };
    });
  }

  // Totals
  const refeedDays = days.filter((d) => d.isRefeed).length;
  const fastingDays = days.filter((d) => d.adFast).length;
  const eatingDays = days.length - fastingDays;
  const eatingRows = days.filter((d) => !d.adFast);
  const avgCal = eatingRows.length
    ? Math.round(eatingRows.reduce((s, d) => s + d.cal, 0) / eatingRows.length)
    : 0;
  const totalFastHours = days.reduce((s, d) => {
    if (d.adFast) {
      const m = /(\d+)h/.exec(d.fastWindow);
      return s + (m ? parseInt(m[1], 10) : 24);
    }
    if (d.isRefeed) return s + 14;
    // Derive from label "H:E" if present
    const m = /^(\d+):(\d+)$/.exec(d.fastWindow);
    if (m) return s + parseInt(m[1], 10);
    return s + uniformWin.fastHours;
  }, 0);

  return {
    tdee, target, proteinFloor, days,
    protocolName: protocol?.name,
    extended, totalHours: totalHoursOut, needsRefeed,
    totals: { avgCal, totalFastHours, fastingDays, eatingDays, refeedDays },
  };
}