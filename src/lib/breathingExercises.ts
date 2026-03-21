export type BreathingExercise = {
  id: string;
  name: string;
  description?: string;
  inhale: number;
  hold: number;
  exhale: number;
  rounds: number;
};
export const BREATHING_EXERCISES: BreathingExercise[] = [];
export function getBreathingExercise(id: string): BreathingExercise | null { return null; }
