import { registerPlugin } from '@capacitor/core';

export interface LiveTimerStartOptions {
  /** Activity type: 'workout' | 'fasting' | 'cardio' | 'breathing' | 'rest' */
  activityType: string;
  /** Display title, e.g. "Upper Body Workout" */
  title: string;
  /** Optional subtitle, e.g. "Round 3 of 5" */
  subtitle?: string;
  /** Timer mode: 'countUp' (elapsed) or 'countDown' */
  mode: 'countUp' | 'countDown';
  /** For countDown: total seconds remaining. For countUp: seconds already elapsed (default 0). */
  seconds: number;
  /** Optional hex color for the accent, e.g. "#7C3AED" */
  accentColor?: string;
  /** Optional emoji or SF Symbol name for the icon */
  icon?: string;
}

export interface LiveTimerUpdateOptions {
  /** Updated seconds (remaining for countDown, elapsed for countUp) */
  seconds?: number;
  /** Updated title */
  title?: string;
  /** Updated subtitle */
  subtitle?: string;
  /** Optional: mark as paused */
  isPaused?: boolean;
}

export interface LiveTimerPlugin {
  /** Start a Live Activity on the lock screen / Dynamic Island */
  start(options: LiveTimerStartOptions): Promise<{ activityId: string }>;
  /** Update the running Live Activity */
  update(options: LiveTimerUpdateOptions): Promise<void>;
  /** End / dismiss the Live Activity */
  stop(): Promise<void>;
  /** Check if a Live Activity is currently running */
  isRunning(): Promise<{ running: boolean }>;
}

const LiveTimer = registerPlugin<LiveTimerPlugin>('LiveTimer');

export default LiveTimer;
