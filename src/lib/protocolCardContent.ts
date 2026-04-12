/**
 * Generates structured protocol card content based on fast target hours.
 * Each protocol gets a premium, phase-based breakdown.
 */

export interface ProtocolPhase {
  range: string;
  title: string;
  detail: string;
}

export interface ProtocolCardContent {
  overview: string[];
  phases: ProtocolPhase[];
  benefits: string[];
  rules: string[];
  mentalReality: string[];
  schedule: { label: string; detail: string }[];
  coachWarning: string[];
}

export function getProtocolCardContent(fastHours: number, isQuickPlan: boolean): ProtocolCardContent {
  if (fastHours >= 120) return get120hContent();
  if (fastHours >= 96) return get96hContent();
  if (fastHours >= 72) return get72hContent();
  if (fastHours >= 48) return get48hContent();
  if (fastHours >= 36) return get36hContent();
  if (fastHours >= 24) return get24hContent();
  if (fastHours >= 20) return get20hContent();
  if (fastHours >= 18) return get18hContent();
  return get16hContent();
}

function get120hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 120-hour fast is an advanced metabolic reset designed to fully transition your body into a deep, sustained fat-burning state.",
      "Within the first 24 hours, glycogen stores are fully depleted, forcing the body to rely almost entirely on stored fat for energy. As the fast extends beyond 48–72 hours, ketone production increases significantly, becoming the dominant fuel source for both the brain and body.",
      "By days 3–5, your system enters a highly efficient metabolic state where fat oxidation is maximized, inflammation is reduced, and cellular repair processes accelerate. Growth hormone rises to preserve lean tissue, while insulin remains suppressed, allowing uninterrupted fat mobilization.",
      "This is not just fat loss — this is a full metabolic recalibration.",
    ],
    phases: [
      { range: "0–24 Hours", title: "Fuel Transition", detail: "Glucose is used, insulin drops, glycogen depletion begins." },
      { range: "24–48 Hours", title: "Fat Activation", detail: "Stored fat becomes primary fuel. Ketones rise. Hunger begins to stabilize." },
      { range: "48–72 Hours", title: "Deep Ketosis", detail: "Brain shifts to ketones. Mental clarity increases. Fat oxidation accelerates." },
      { range: "72–120 Hours", title: "Cellular Reset", detail: "Autophagy increases. Inflammation decreases. Body operates in peak fat-burning mode." },
    ],
    benefits: [
      "Maximum fat mobilization",
      "Deep ketosis and metabolic efficiency",
      "Cellular repair support",
      "Reduced inflammation",
      "Appetite reset",
    ],
    rules: [
      "Hydrate aggressively (water + electrolytes)",
      "Maintain sodium, potassium, magnesium",
      "No calories — no dirty fasting",
      "Avoid intense training — light movement only",
      "Break fast strategically (no binge eating)",
    ],
    mentalReality: [
      "Days 2–3 are the hardest phase — this is where most people fail.",
      "After this point, hunger drops and energy stabilizes.",
      "This is where discipline turns into momentum.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM (Day 1)" },
      { label: "Fasting continues", detail: "Hydration + electrolytes daily" },
      { label: "Light activity", detail: "Walking, mobility" },
      { label: "Break fast", detail: "8:00 PM (Day 5)" },
    ],
    coachWarning: [
      "This protocol is not for beginners.",
      "Poor execution can lead to fatigue, electrolyte imbalance, or rebound eating.",
      "This is a controlled metabolic intervention — not just \"longer fasting.\"",
    ],
  };
}

function get96hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 96-hour fast is an extended metabolic protocol that pushes the body deep into sustained ketosis and fat oxidation.",
      "After the first 24 hours, glycogen reserves are depleted and your metabolism shifts fully to burning stored body fat. Ketone levels climb steadily, providing clean fuel for your brain and muscles.",
      "By hours 48–96, your body reaches peak metabolic efficiency — fat burning is maximized, insulin stays suppressed, and autophagy accelerates cellular cleanup.",
      "This is elite-level metabolic conditioning.",
    ],
    phases: [
      { range: "0–24 Hours", title: "Glycogen Depletion", detail: "Blood sugar normalizes, insulin drops, body transitions off glucose." },
      { range: "24–48 Hours", title: "Ketone Ramp-Up", detail: "Fat becomes primary fuel. Ketones rise. Appetite begins to fade." },
      { range: "48–72 Hours", title: "Deep Fat Burning", detail: "Peak ketone levels. Mental clarity sharpens. Fat oxidation at maximum." },
      { range: "72–96 Hours", title: "Extended Reset", detail: "Autophagy intensifies. Inflammation drops. Metabolic pathways fully optimized." },
    ],
    benefits: [
      "Sustained deep ketosis",
      "Aggressive fat mobilization",
      "Enhanced autophagy and cellular repair",
      "Inflammation reduction",
      "Hormonal optimization",
    ],
    rules: [
      "Hydrate consistently (water + electrolytes)",
      "Supplement sodium, potassium, magnesium daily",
      "Zero calories — strict water fast",
      "Light movement only — no heavy training",
      "Plan your refeed meal in advance",
    ],
    mentalReality: [
      "Hours 36–60 are the mental wall — push through this phase.",
      "Once past 72 hours, most people feel surprisingly good.",
      "Momentum builds when you commit fully.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM (Day 1)" },
      { label: "Fasting continues", detail: "Hydration + electrolytes daily" },
      { label: "Light activity", detail: "Walking, stretching" },
      { label: "Break fast", detail: "8:00 PM (Day 4)" },
    ],
    coachWarning: [
      "This is an advanced protocol — not suitable for beginners.",
      "Electrolyte management is critical to avoid fatigue and cramping.",
      "Refeeding must be controlled — start with light, protein-rich meals.",
    ],
  };
}

function get72hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 72-hour fast is a powerful metabolic reset that takes your body from glucose-burning into deep, sustained ketosis.",
      "During the first 24 hours, glycogen is depleted and insulin drops. By hours 24–48, fat becomes the dominant fuel source and ketone production accelerates.",
      "The final 24 hours bring peak autophagy, enhanced fat oxidation, and elevated growth hormone — your body is running on its own stored energy at maximum efficiency.",
    ],
    phases: [
      { range: "0–24 Hours", title: "Fuel Switch", detail: "Glycogen depletes. Insulin falls. Body begins transitioning to fat." },
      { range: "24–48 Hours", title: "Ketone Production", detail: "Fat burning ramps up. Ketones fuel the brain. Hunger fades." },
      { range: "48–72 Hours", title: "Peak Reset", detail: "Autophagy peaks. Growth hormone rises. Deep metabolic efficiency." },
    ],
    benefits: [
      "Deep ketosis activation",
      "Significant fat mobilization",
      "Autophagy and cellular cleanup",
      "Reduced systemic inflammation",
      "Mental clarity boost",
    ],
    rules: [
      "Stay hydrated — water and electrolytes throughout",
      "Supplement sodium, potassium, magnesium",
      "No calories — clean fast only",
      "Light movement encouraged, no heavy exercise",
      "Break fast with a small, protein-focused meal",
    ],
    mentalReality: [
      "Hours 24–48 are the toughest — hunger and cravings peak here.",
      "By hour 60+, most people experience a wave of clarity and calm.",
      "The hardest part is deciding to keep going — your body adapts.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM (Day 1)" },
      { label: "Fasting continues", detail: "Hydration + electrolytes" },
      { label: "Light activity", detail: "Walking, mobility work" },
      { label: "Break fast", detail: "8:00 PM (Day 3)" },
    ],
    coachWarning: [
      "This protocol requires prior fasting experience.",
      "Electrolyte depletion is the #1 risk — stay on top of supplementation.",
      "Break the fast gradually — rushing back to food can cause GI distress.",
    ],
  };
}

function get48hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 48-hour fast is a focused metabolic shift designed to push your body past glycogen depletion and into sustained fat burning.",
      "Within the first 20 hours, insulin drops and glucose reserves are exhausted. By hour 24–48, ketone production accelerates and your body operates increasingly on stored fat.",
      "This is a powerful protocol for breaking plateaus and accelerating metabolic adaptation.",
    ],
    phases: [
      { range: "0–16 Hours", title: "Post-Meal Digestion", detail: "Body processes last meal. Insulin begins to drop." },
      { range: "16–24 Hours", title: "Glycogen Depletion", detail: "Glucose reserves empty. Fat mobilization begins." },
      { range: "24–48 Hours", title: "Fat Burning Mode", detail: "Ketones rise. Appetite stabilizes. Fat oxidation increases." },
    ],
    benefits: [
      "Accelerated fat burning",
      "Ketosis activation",
      "Insulin sensitivity improvement",
      "Mental clarity",
      "Plateau breaking",
    ],
    rules: [
      "Drink plenty of water with electrolytes",
      "Keep sodium and magnesium intake up",
      "No calories during the fast",
      "Light to moderate activity is fine",
      "Break fast with a balanced, protein-rich meal",
    ],
    mentalReality: [
      "Hours 20–30 are typically the hardest stretch.",
      "Once past 30 hours, hunger often subsides significantly.",
      "Stay busy — idle time makes fasting harder.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM (Day 1)" },
      { label: "Full day fast", detail: "Hydration + electrolytes" },
      { label: "Break fast", detail: "8:00 PM (Day 2)" },
    ],
    coachWarning: [
      "Intermediate experience recommended.",
      "Monitor energy levels — if you feel dizzy, supplement electrolytes immediately.",
      "Don't overeat when breaking the fast.",
    ],
  };
}

function get36hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 36-hour fast pushes just past the one-day mark, allowing your body to fully deplete glycogen and begin meaningful fat oxidation.",
      "This protocol bridges the gap between daily intermittent fasting and extended fasting — it's long enough to trigger deeper metabolic benefits without the intensity of multi-day protocols.",
    ],
    phases: [
      { range: "0–12 Hours", title: "Digestion Phase", detail: "Body processes last meal. Insulin begins its decline." },
      { range: "12–24 Hours", title: "Glycogen Depletion", detail: "Stored glucose is used up. Fat mobilization begins." },
      { range: "24–36 Hours", title: "Fat Burning Onset", detail: "Ketone production ramps up. Hunger stabilizes." },
    ],
    benefits: [
      "Enhanced fat mobilization",
      "Improved insulin sensitivity",
      "Metabolic flexibility boost",
      "Appetite regulation",
    ],
    rules: [
      "Stay hydrated with water and electrolytes",
      "No calories during the fast",
      "Light activity is encouraged",
      "Break fast with a protein-focused meal",
    ],
    mentalReality: [
      "The evening of day 1 and morning of day 2 are the hardest.",
      "Once you wake up on day 2, the finish line is close.",
      "This fast builds confidence for longer protocols.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM (Day 1)" },
      { label: "Full day fast", detail: "Hydration throughout" },
      { label: "Break fast", detail: "8:00 AM (Day 2)" },
    ],
    coachWarning: [
      "Good entry point for those ready to go beyond 24 hours.",
      "Don't skip electrolytes — they matter even at 36 hours.",
      "Plan your break-fast meal in advance to avoid binging.",
    ],
  };
}

function get24hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 24-hour fast is the foundation of metabolic training — a full day without food that depletes glycogen and initiates fat burning.",
      "During this fast, insulin drops to baseline, growth hormone begins to rise, and your body transitions from glucose to stored fat as its primary fuel.",
    ],
    phases: [
      { range: "0–8 Hours", title: "Post-Meal State", detail: "Body digests and absorbs last meal. Insulin elevated." },
      { range: "8–16 Hours", title: "Fasting State", detail: "Insulin drops. Glycogen starts depleting. Fat mobilization begins." },
      { range: "16–24 Hours", title: "Deep Fasting", detail: "Glycogen near empty. Ketones begin rising. Fat burning accelerates." },
    ],
    benefits: [
      "Full glycogen depletion",
      "Fat burning activation",
      "Insulin sensitivity reset",
      "Growth hormone elevation",
    ],
    rules: [
      "Water, black coffee, and plain tea are allowed",
      "Stay active — walk, move, stay busy",
      "No calories during the fast",
      "Break fast with protein and vegetables",
    ],
    mentalReality: [
      "Hours 16–20 are typically the hunger peak.",
      "After 20 hours, many people feel a clarity boost.",
      "Your first 24h fast is the hardest — it gets easier with practice.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM" },
      { label: "Sleep through", detail: "8+ hours of effortless fasting" },
      { label: "Stay busy", detail: "Work, walk, hydrate" },
      { label: "Break fast", detail: "8:00 PM (next day)" },
    ],
    coachWarning: [
      "Suitable for intermediate fasters who have mastered 16–18 hour fasts.",
      "If lightheaded, add a pinch of salt to your water.",
      "Don't compensate by overeating at the break-fast meal.",
    ],
  };
}

function get20hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 20:4 protocol pushes your fasting window to 20 hours with a focused 4-hour eating window. This is where real metabolic shifting begins.",
      "At 20 hours, glycogen is nearly depleted and your body is actively mobilizing fat for fuel. This window delivers stronger fat-burning benefits than shorter protocols.",
    ],
    phases: [
      { range: "0–12 Hours", title: "Overnight Fast", detail: "Standard post-meal digestion and insulin normalization." },
      { range: "12–18 Hours", title: "Fat Mobilization", detail: "Glycogen depleting. Body begins pulling from fat stores." },
      { range: "18–20 Hours", title: "Peak Fat Burning", detail: "Ketone production starts. Maximum fasting benefit zone." },
    ],
    benefits: [
      "Stronger fat mobilization than 16:8",
      "Deeper insulin sensitivity",
      "Appetite regulation",
      "Metabolic flexibility",
    ],
    rules: [
      "Water, black coffee, plain tea during fast",
      "Eat nutrient-dense meals in your 4-hour window",
      "Prioritize protein at every meal",
      "Don't rush eating — two solid meals work well",
    ],
    mentalReality: [
      "The last 2–3 hours can feel long — stay occupied.",
      "Most people adapt within 5–7 days.",
      "This protocol trains real discipline.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM" },
      { label: "Fast through morning", detail: "Water + coffee" },
      { label: "Eating window opens", detail: "4:00 PM" },
      { label: "Window closes", detail: "8:00 PM" },
    ],
    coachWarning: [
      "Not recommended for beginners — build up from 16:8 first.",
      "Ensure adequate calories during the eating window.",
      "Monitor energy — adjust if performance drops.",
    ],
  };
}

function get18hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 18:6 protocol extends your fast to 18 hours with a 6-hour eating window. This is the sweet spot for accelerated fat loss without extreme restriction.",
      "At 18 hours, your body has moved well past glycogen stores and is actively burning fat. Insulin remains low, allowing sustained fat mobilization.",
    ],
    phases: [
      { range: "0–12 Hours", title: "Standard Fast", detail: "Post-meal digestion completes. Insulin normalizes." },
      { range: "12–16 Hours", title: "Fat Access", detail: "Glycogen low. Body begins tapping fat reserves." },
      { range: "16–18 Hours", title: "Enhanced Burning", detail: "Fat oxidation increases. Benefits compound." },
    ],
    benefits: [
      "Accelerated fat burning vs. 16:8",
      "Better insulin sensitivity",
      "Controlled appetite",
      "Improved focus and energy",
    ],
    rules: [
      "Water, black coffee, plain tea during fast",
      "Focus on protein-rich, whole food meals",
      "Eat 2–3 meals within your window",
      "Stop eating when satisfied, not stuffed",
    ],
    mentalReality: [
      "The jump from 16 to 18 hours feels small but the metabolic impact is real.",
      "Most people adapt within 3–5 days.",
      "This is a sustainable daily protocol for serious results.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM" },
      { label: "Fast through morning", detail: "Water + coffee" },
      { label: "Eating window opens", detail: "2:00 PM" },
      { label: "Window closes", detail: "8:00 PM" },
    ],
    coachWarning: [
      "Best for those comfortable with 16:8.",
      "Make sure your meals are nutrient-dense — less eating time means quality matters more.",
      "Stay hydrated throughout the morning.",
    ],
  };
}

function get16hContent(): ProtocolCardContent {
  return {
    overview: [
      "The 16:8 protocol is the foundational intermittent fasting method — 16 hours of fasting with an 8-hour eating window.",
      "This protocol trains your body to use stored energy more efficiently, improves insulin sensitivity, and builds the metabolic flexibility needed for more advanced protocols.",
    ],
    phases: [
      { range: "0–8 Hours", title: "Post-Meal", detail: "Digestion and absorption. Insulin elevated." },
      { range: "8–12 Hours", title: "Early Fasting", detail: "Insulin drops. Body begins shifting fuel sources." },
      { range: "12–16 Hours", title: "Fat Access", detail: "Glycogen depleting. Fat mobilization begins." },
    ],
    benefits: [
      "Fat burning activation",
      "Improved insulin sensitivity",
      "Sustainable daily routine",
      "Foundation for advanced protocols",
    ],
    rules: [
      "Water, black coffee, plain tea during fast",
      "Eat balanced meals with protein focus",
      "Don't overcompensate during eating window",
      "Stay consistent — daily rhythm matters",
    ],
    mentalReality: [
      "The first 3–5 days are an adjustment period.",
      "Morning hunger fades as your body adapts.",
      "This is the gateway to metabolic freedom.",
    ],
    schedule: [
      { label: "Stop eating", detail: "8:00 PM" },
      { label: "Sleep through", detail: "8 hours of easy fasting" },
      { label: "Eating window opens", detail: "12:00 PM" },
      { label: "Window closes", detail: "8:00 PM" },
    ],
    coachWarning: [
      "Great for all experience levels.",
      "Consistency matters more than perfection — aim for 5+ days per week.",
      "If you're new to fasting, start here before attempting longer protocols.",
    ],
  };
}
