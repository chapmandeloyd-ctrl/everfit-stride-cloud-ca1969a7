---
name: AI Workout Builder
description: AI Workout Builder uses openai/gpt-5, restricted block catalog, fuzzy exercise name matching
type: feature
---
The AI Workout Builder uses `openai/gpt-5` for higher-quality reasoning. The edge function constrains every section to one of the trainer's predefined block labels (Warm-Up, Working Sets, Power / Explosive, Conditioning, Accessory / Isolation, Cool Down / Mobility, Finisher, Skill / Drill, Circuit, Superset, Interval) via a JSON-schema enum and forces `section_name = block_label` client-side so AI output never produces "Custom Block" or invented names. Exercises are matched against the trainer's library with fuzzy name matching; unmatched ones are skipped.
