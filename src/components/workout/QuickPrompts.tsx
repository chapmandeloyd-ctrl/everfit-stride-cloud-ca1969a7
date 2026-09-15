import { useState } from "react";
// Adult-focused quick prompts — no youth/sport-specific framing
import { Sparkles } from "lucide-react";

/* ---------------- Quick Prompts (AI Builder presets) ---------------- */

export type QuickPreset = {
  label: string;
  prompt: string;
  duration?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
};

export const QUICK_PROMPT_GROUPS: { group: string; items: QuickPreset[] }[] = [
  {
    group: "Strength",
    items: [
      { label: "Full-Body 45m", prompt: "45-min intermediate full-body strength session for an adult, lower-body biased, full gym", duration: 45, difficulty: "intermediate" },
      { label: "Lower Power 60m", prompt: "60-min advanced lower-body strength day for an adult: squat pattern, hinge pattern, single-leg, core", duration: 60, difficulty: "advanced" },
      { label: "Upper Push/Pull", prompt: "50-min upper-body push/pull session for an adult, intermediate, gym equipment", duration: 50, difficulty: "intermediate" },
      { label: "Posterior Chain", prompt: "40-min posterior chain focus for an adult — RDLs, hip thrusts, hamstring accessories, intermediate", duration: 40, difficulty: "intermediate" },
      { label: "Beginner Intro", prompt: "45-min beginner full-body intro to strength for an adult, dumbbells only", duration: 45, difficulty: "beginner" },
    ],
  },
  {
    group: "Fat Loss",
    items: [
      { label: "Metabolic Circuit", prompt: "30-min fat-loss metabolic circuit for an adult: full-body compound moves, short rest, conditioning finish, intermediate", duration: 30, difficulty: "intermediate" },
      { label: "HIIT Burn 25m", prompt: "25-min HIIT fat-loss workout for an adult: alternating high-intensity intervals with bodyweight and dumbbells, intermediate", duration: 25, difficulty: "intermediate" },
      { label: "Strength + Cardio", prompt: "45-min fat-loss session for an adult: strength supersets paired with cardio bursts, intermediate", duration: 45, difficulty: "intermediate" },
      { label: "Beginner Fat Loss", prompt: "30-min beginner fat-loss circuit for an adult: low-impact moves, longer rest, bodyweight only", duration: 30, difficulty: "beginner" },
    ],
  },
  {
    group: "Muscle Building",
    items: [
      { label: "Hypertrophy Upper", prompt: "50-min upper-body hypertrophy session for an adult: chest, back, shoulders, arms, 8-12 rep ranges, intermediate", duration: 50, difficulty: "intermediate" },
      { label: "Hypertrophy Lower", prompt: "50-min lower-body hypertrophy session for an adult: quads, hamstrings, glutes, calves, 8-12 rep ranges, intermediate", duration: 50, difficulty: "intermediate" },
      { label: "Push Day", prompt: "45-min push hypertrophy day for an adult: chest, shoulders, triceps, progressive sets, intermediate", duration: 45, difficulty: "intermediate" },
      { label: "Pull Day", prompt: "45-min pull hypertrophy day for an adult: back, rear delts, biceps, progressive sets, intermediate", duration: 45, difficulty: "intermediate" },
      { label: "Arms Finisher", prompt: "25-min arm-building finisher for an adult: biceps and triceps supersets, high volume, intermediate", duration: 25, difficulty: "intermediate" },
    ],
  },
  {
    group: "Power & Plyos",
    items: [
      { label: "Lower Power", prompt: "30-min lower-body power day for an adult with plyos, bounds, and box jumps, intermediate", duration: 30, difficulty: "intermediate" },
      { label: "Explosive Full Body", prompt: "35-min explosive full-body session for an adult: jumps, throws, and Olympic-style variations, advanced", duration: 35, difficulty: "advanced" },
      { label: "Med Ball Explosive", prompt: "25-min explosive med ball circuit for an adult + short sprints, intermediate", duration: 25, difficulty: "intermediate" },
    ],
  },
  {
    group: "Prehab & Joints",
    items: [
      { label: "Knee & Ankle", prompt: "25-min knee and ankle prehab circuit for an adult, bodyweight + bands, beginner", duration: 25, difficulty: "beginner" },
      { label: "Shoulder Health", prompt: "25-min shoulder health and rotator cuff session for an adult: band work, scap control, beginner", duration: 25, difficulty: "beginner" },
      { label: "Lower-Back Friendly", prompt: "30-min lower-back friendly core and stability session for an adult, beginner", duration: 30, difficulty: "beginner" },
      { label: "Single-Leg Stability", prompt: "35-min single-leg stability and balance day for an adult, intermediate, minimal equipment", duration: 35, difficulty: "intermediate" },
    ],
  },
  {
    group: "At-Home",
    items: [
      { label: "Bodyweight Only", prompt: "30-min bodyweight strength session for an adult, no equipment, beginner", duration: 30, difficulty: "beginner" },
      { label: "One Pair DBs", prompt: "40-min dumbbell-only full-body workout for an adult, intermediate, one pair of DBs", duration: 40, difficulty: "intermediate" },
      { label: "Bands Only", prompt: "25-min resistance band lower-body session for an adult, beginner", duration: 25, difficulty: "beginner" },
    ],
  },
  {
    group: "Mobility",
    items: [
      { label: "Full Mobility Flow", prompt: "20-min full-body mobility flow for adults", duration: 20, difficulty: "beginner" },
      { label: "Desk Worker Reset", prompt: "15-min mobility reset for desk workers: hips, thoracic spine, neck, shoulders, beginner", duration: 15, difficulty: "beginner" },
      { label: "Foam Roll + Stretch", prompt: "25-min foam roll and stretch recovery session for an adult", duration: 25, difficulty: "beginner" },
    ],
  },
  {
    group: "Body Part",
    items: [
      { label: "Core Anti-Rotation", prompt: "30-min core and anti-rotation circuit, intermediate", duration: 30, difficulty: "intermediate" },
      { label: "Glutes", prompt: "35-min glute-focused session, barbell + bands, intermediate", duration: 35, difficulty: "intermediate" },
      { label: "Shoulder Health", prompt: "30-min upper-body pull day for shoulder health, intermediate", duration: 30, difficulty: "intermediate" },
      { label: "Biceps", prompt: "30-min biceps-focused session: dumbbell curls, hammer curls, incline curls, cable curls, concentration curls. 3-4 exercises, 3-4 sets each. Intermediate.", duration: 30, difficulty: "intermediate" },
      { label: "Chest", prompt: "40-min chest-focused session: dumbbell bench press, incline DB press, push-ups, cable chest fly, dumbbell pullover. 4-5 exercises with progressive sets. Intermediate.", duration: 40, difficulty: "intermediate" },
      { label: "Back", prompt: "45-min back-focused session: lat pulldowns, seated cable rows, dumbbell rows, face pulls, straight-arm pulldowns. Hit lats, mid-back, and rear delts. Intermediate.", duration: 45, difficulty: "intermediate" },
      { label: "Triceps", prompt: "30-min triceps-focused session: cable tricep pushdowns, overhead DB extensions, close-grip push-ups, dips, kickbacks. 4 exercises, 3-4 sets. Intermediate.", duration: 30, difficulty: "intermediate" },
      { label: "Quads", prompt: "45-min quad-focused session: goblet squats, front squats, walking lunges, leg press, Bulgarian split squats, leg extensions. Heavy compound + accessory. Intermediate.", duration: 45, difficulty: "intermediate" },
      { label: "Forearms", prompt: "20-min forearm and grip training: wrist curls, reverse wrist curls, farmer carries, dead hangs, plate pinches. Intermediate.", duration: 20, difficulty: "intermediate" },
      { label: "Hamstrings", prompt: "40-min hamstring-focused session: Romanian deadlifts, single-leg RDLs, hamstring curls, good mornings, glute-ham raises. Posterior chain focus. Intermediate.", duration: 40, difficulty: "intermediate" },
      { label: "Calves", prompt: "20-min calf-focused session: standing calf raises, seated calf raises, single-leg calf raises, donkey calf raises. High volume, multiple rep ranges. Intermediate.", duration: 20, difficulty: "intermediate" },
      { label: "Shoulders", prompt: "40-min shoulder-focused session: dumbbell shoulder press, lateral raises, front raises, rear delt flys, face pulls, upright rows. Hit all three delt heads. Intermediate.", duration: 40, difficulty: "intermediate" },
      { label: "Traps", prompt: "25-min trap-focused session: dumbbell shrugs, barbell shrugs, farmer carries, face pulls, upright rows, Y-raises. Upper and mid-trap emphasis. Intermediate.", duration: 25, difficulty: "intermediate" },
    ],
  },
  {
    group: "Circuit & Tabata",
    items: [
      { label: "Classic Tabata 4m", prompt: "Strict Tabata protocol: ONE circuit block only with 8 rounds of 20 seconds work / 10 seconds rest (4 minutes total). Bodyweight, no equipment. Pick ONE high-intensity exercise (e.g. squat jumps). Coaching-timer style only — no warm-up, no cooldown, no strength sets. Intermediate.", duration: 4, difficulty: "intermediate" },
      { label: "Tabata 4-Move 16m", prompt: "Tabata-style workout: 4 separate circuit blocks back-to-back, each 8 rounds of 20s work / 10s rest (4 min per block, 16 min total). One bodyweight exercise per block (e.g. burpees, mountain climbers, squat jumps, push-ups). 1 min rest between blocks. Strict timer-based, no strength accessory work. Advanced.", duration: 16, difficulty: "advanced" },
      { label: "Tabata Lower Body", prompt: "Tabata lower-body: 4 circuit blocks of 8 rounds × 20s work / 10s rest. Bodyweight only — jump squats, alternating lunges, skater jumps, glute bridges. Coaching-timer format only. Intermediate.", duration: 20, difficulty: "intermediate" },
      { label: "Tabata Core", prompt: "Tabata core: 3 circuit blocks of 8 rounds × 20s work / 10s rest. Bodyweight core moves — mountain climbers, plank shoulder taps, bicycle crunches. Timer-based only. Intermediate.", duration: 14, difficulty: "intermediate" },
      { label: "AMRAP Circuit 20m", prompt: "20-min AMRAP circuit: ONE circuit block, 5 bodyweight exercises (e.g. air squats x15, push-ups x10, lunges x10, sit-ups x15, burpees x5). Continuous rounds with minimal rest, 20 min total cap. Coaching-timer style, no strength sets, no warm-up included. Intermediate.", duration: 20, difficulty: "intermediate" },
      { label: "EMOM Circuit 12m", prompt: "12-min EMOM circuit: ONE circuit block, 3 exercises rotating every minute on the minute (squats, push-ups, sit-ups). Work to the rep target, rest the remainder of the minute. Strict timer-based, no warm-up or cooldown blocks. Intermediate.", duration: 12, difficulty: "intermediate" },
      { label: "40/20 HIIT 24m", prompt: "HIIT circuit: 3 circuit blocks of 6 rounds × 40s work / 20s rest. 6 bodyweight exercises rotating (jumping jacks, high knees, squat jumps, push-ups, mountain climbers, burpees). Timer-driven only. Advanced.", duration: 24, difficulty: "advanced" },
      { label: "Court Conditioning Circuit", prompt: "25-min basketball conditioning circuit: ONE circuit block, 5 rounds, 5 court-based exercises (defensive slides 30s, suicides 30s, lateral bounds 30s, jump rope 30s, line touches 30s) with 60s rest between rounds. Pure coaching-timer format, no strength accessory work. Intermediate.", duration: 25, difficulty: "intermediate" },
      { label: "Beginner Bodyweight Circuit", prompt: "20-min beginner bodyweight circuit: ONE circuit block, 4 rounds of 30s work / 30s rest, 5 exercises (squats, knee push-ups, glute bridges, plank, marching in place). Timer-based only, no warm-up or cooldown blocks. Beginner.", duration: 20, difficulty: "beginner" },
    ],
  },
  ...(() => {
    const EQUIP: Array<{
      key: string;
      label: string;
      moves: string;
      exclude: string;
      duration: number;
      difficulty: "beginner" | "intermediate" | "advanced";
    }> = [
      { key: "Dumbbell", label: "Dumbbell", moves: "dumbbells (DB goblet squat, DB RDL, DB bench, DB row, DB shoulder press, DB lunge, DB curl, etc.)", exclude: "No barbells, cables, or machines.", duration: 45, difficulty: "intermediate" },
      { key: "Cable", label: "Cable", moves: "the cable machine (cable row, cable chest press, cable pulldown, cable squat, cable pull-through, cable chop, cable curl, cable triceps pushdown, etc.)", exclude: "No dumbbells, barbells, or machines.", duration: 45, difficulty: "intermediate" },
      { key: "Barbell", label: "Barbell", moves: "a barbell (back squat, front squat, deadlift, RDL, bench press, overhead press, bent row, hip thrust, barbell lunge)", exclude: "No dumbbells, cables, or machines.", duration: 50, difficulty: "intermediate" },
      { key: "Kettlebell", label: "Kettlebell", moves: "kettlebells (KB goblet squat, KB swing, KB deadlift, KB clean, KB press, KB row, KB Turkish get-up, KB carry)", exclude: "No other equipment.", duration: 40, difficulty: "intermediate" },
      { key: "Machines", label: "Machines", moves: "selectorized machines (leg press, leg curl, leg extension, chest press machine, lat pulldown, seated row, shoulder press machine, pec deck)", exclude: "No free weights, no cables, no bodyweight.", duration: 45, difficulty: "intermediate" },
      { key: "DBs+Cables", label: "DBs + Cables", moves: "dumbbells and cables (mix DB compounds with cable accessories)", exclude: "No barbells, no machines.", duration: 50, difficulty: "intermediate" },
      { key: "Bands", label: "Bands", moves: "resistance bands (band squats, band rows, band presses, band pull-aparts, band hip thrusts, band lateral walks)", exclude: "Bands only.", duration: 30, difficulty: "beginner" },
      { key: "Smith", label: "Smith Machine", moves: "the Smith machine (Smith squat, Smith RDL, Smith bench, Smith row, Smith shoulder press, Smith lunge)", exclude: "Smith machine only.", duration: 45, difficulty: "intermediate" },
      { key: "Landmine", label: "Landmine", moves: "the landmine attachment (landmine squat-to-press, landmine row, landmine RDL, landmine rotation, landmine press, Meadows row)", exclude: "Landmine only.", duration: 40, difficulty: "intermediate" },
      { key: "MedBall", label: "Medicine Ball", moves: "a medicine ball (med ball slams, rotational throws, chest pass, overhead throws, squat-to-press, Russian twists, wall ball, V-up med ball pass, lunge with twist)", exclude: "Medicine ball only.", duration: 35, difficulty: "intermediate" },
    ];
    const SPLITS: Array<{ suffix: string; focus: string; detail: string }> = [
      { suffix: "Full Body", focus: "full-body", detail: "Hit lower (squat/hinge), upper push, upper pull, and core in one balanced session." },
      { suffix: "Upper", focus: "upper-body", detail: "Chest, back, shoulders, and arms only. No lower-body work." },
      { suffix: "Lower", focus: "lower-body", detail: "Quads, hamstrings, glutes, and calves only. No upper-body pressing or pulling." },
    ];
    return EQUIP.map((e) => ({
      group: `${e.label} Only`,
      items: SPLITS.map((s) => ({
        label: `${e.label} — ${s.suffix}`,
        prompt: `${e.duration}-min ${s.focus} strength workout using ${e.moves} ONLY. ${s.detail} ${e.exclude} STRICT EQUIPMENT RULE: every single exercise in EVERY block — warmup, working sets, supersets, conditioning, and cooldown — MUST use ${e.label.toLowerCase()} (or be a bodyweight mobility/stretch with NO other equipment). Do NOT include any exercise that requires equipment other than ${e.label.toLowerCase()}. The warmup should be ${e.label.toLowerCase()}-specific movement prep (e.g. light ${e.label.toLowerCase()} variations, bodyweight dynamic stretches) — no jump rope, no bands, no kettlebells, no other tools. ${e.difficulty.charAt(0).toUpperCase() + e.difficulty.slice(1)}.`,
        duration: e.duration,
        difficulty: e.difficulty,
      })),
    }));

  })(),

];



export function QuickPrompts({
  onPick,
}: {
  onPick: (prompt: string, duration?: number, difficulty?: "beginner" | "intermediate" | "advanced") => void;
}) {
  const [activeGroup, setActiveGroup] = useState(QUICK_PROMPT_GROUPS[0].group);
  const items = QUICK_PROMPT_GROUPS.find((g) => g.group === activeGroup)?.items ?? [];
  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-gradient-to-b from-primary/5 to-transparent p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quick Prompts
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{items.length} presets</span>
      </div>

      {/* Category chips — wrap to fit */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PROMPT_GROUPS.map((g) => (
          <button
            key={g.group}
            type="button"
            onClick={() => setActiveGroup(g.group)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition active:scale-95 ${
              activeGroup === g.group
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background border border-border text-foreground/80 hover:border-primary/50"
            }`}
          >
            {g.group}
          </button>
        ))}
      </div>


      {/* Preset grid — 2 columns on mobile, looks like cards */}
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => onPick(it.prompt, it.duration, it.difficulty)}
            className="group text-left rounded-lg bg-background/80 border border-border hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition p-2"
            title={it.prompt}
          >
            <div className="text-[11px] font-bold leading-tight text-foreground group-hover:text-primary line-clamp-2">
              {it.label}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
              {it.duration ? <span>{it.duration}m</span> : null}
              {it.duration && it.difficulty ? <span>·</span> : null}
              {it.difficulty ? <span className="capitalize">{it.difficulty}</span> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
