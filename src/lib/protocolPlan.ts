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
  } = input;

  if (!w || !kt) return null;

  const tdee = Math.round(w * activityMult);
  const target = Math.round(tdee * (1 + goalAdjust));
  const proteinFloor = Math.round(w * 0.7);

  const rawFastHours = Math.max(0, protocol?.fast_target_hours ?? 16);
  const isAlternateDay = rawFastHours >= 24;
  const fastHours = isAlternateDay ? 24 : Math.min(23, rawFastHours);
  const eatHours = isAlternateDay ? 24 : Math.max(1, 24 - fastHours);
  const eatEndHour = 20;
  const eatStartHour = ((eatEndHour - eatHours) % 24 + 24) % 24;
  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:00 ${period}`;
  };
  const defaultFastLabel = isAlternateDay ? "24h" : `${fastHours}:${eatHours}`;
  const defaultEatStart = fmt(eatStartHour);
  const defaultEatEnd = fmt(eatEndHour);
  const isTightWindow = !isAlternateDay && eatHours <= 4;
  const isOmad = !isAlternateDay && fastHours >= 20;
  const isCKD = kt.abbreviation === "CKD";

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
    days = Array.from({ length }).map((_, i) => {
      const d = DAYS[i % 7];
      const isRefeed = isCKD && (i === 5 || i === 6);
      const isAdFastDay = isAlternateDay && i % 2 === 0;
      const cal = isRefeed ? Math.round(target * 1.15) : target;
      const proteinG = Math.max(proteinFloor, Math.round((cal * (kt.protein_pct / 100)) / 4));
      const carbG = isRefeed ? Math.round((cal * 0.45) / 4) : Math.round((cal * (kt.carbs_pct / 100)) / 4);
      const fatG = Math.round((cal - proteinG * 4 - carbG * 4) / 9);
      const fastWindow = isRefeed
        ? "14:10 (refeed)"
        : isAlternateDay
          ? (isAdFastDay ? "24h fast" : "Eat day")
          : defaultFastLabel;
      const eatStart = isRefeed ? "10:00 AM" : defaultEatStart;
      const eatEnd = defaultEatEnd;
      const tight = !isRefeed && !isAlternateDay && isTightWindow;
      const omad = !isRefeed && !isAlternateDay && isOmad;
      const adFast = isAlternateDay && isAdFastDay;
      return {
        day: length > 7 ? `${d} ${Math.floor(i / 7) + 1}` : d,
        isRefeed,
        cal: adFast ? 0 : cal,
        proteinG: adFast ? 0 : proteinG,
        carbG: adFast ? 0 : carbG,
        fatG: adFast ? 0 : fatG,
        fastWindow, eatStart, eatEnd, tight, omad, adFast,
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
    return s + (isAlternateDay ? 0 : fastHours);
  }, 0);

  return {
    tdee, target, proteinFloor, days,
    protocolName: protocol?.name,
    extended, totalHours: totalHoursOut, needsRefeed,
    totals: { avgCal, totalFastHours, fastingDays, eatingDays, refeedDays },
  };
}