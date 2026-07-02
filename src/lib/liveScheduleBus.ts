// Tiny event bus so any component (e.g. the lion FastingProtocolCard) can
// request that the Live Schedule dialog owned by TodaysWindowCard opens.
// Keeps us from threading state through many layers.

type Listener = () => void;
const listeners = new Set<Listener>();

export function openLiveSchedule() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
}

export function subscribeLiveScheduleOpen(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}