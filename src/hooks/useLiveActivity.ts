import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import LiveTimer, { type LiveTimerStartOptions, type LiveTimerUpdateOptions } from '@/plugins/LiveTimerPlugin';

/**
 * Hook to manage iOS Live Activities (lock screen / Dynamic Island timers).
 * Gracefully no-ops on web / Android.
 */
export function useLiveActivity() {
  const activeRef = useRef(false);

  const isSupported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const start = useCallback(async (options: LiveTimerStartOptions) => {
    if (!isSupported) return;
    try {
      await LiveTimer.start(options);
      activeRef.current = true;
    } catch (e) {
      console.warn('[LiveActivity] start failed:', e);
    }
  }, [isSupported]);

  const update = useCallback(async (options: LiveTimerUpdateOptions) => {
    if (!isSupported || !activeRef.current) return;
    try {
      await LiveTimer.update(options);
    } catch (e) {
      console.warn('[LiveActivity] update failed:', e);
    }
  }, [isSupported]);

  const stop = useCallback(async () => {
    if (!isSupported || !activeRef.current) return;
    try {
      await LiveTimer.stop();
      activeRef.current = false;
    } catch (e) {
      console.warn('[LiveActivity] stop failed:', e);
    }
  }, [isSupported]);

  return { start, update, stop, isSupported };
}
