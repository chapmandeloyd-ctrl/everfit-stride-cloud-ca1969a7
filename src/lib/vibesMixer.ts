export function createMixer() {
  return { play: () => {}, stop: () => {}, pause: () => {}, setVolume: () => {}, loadMix: (_mix: any) => {}, restoreFromStorage: () => {} };
}
export const vibesMixer = createMixer();
export function preloadAudioUrls(_urls: string[]) {}
