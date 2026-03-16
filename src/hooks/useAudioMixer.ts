export function useAudioMixer() {
  return { isPlaying: false, play: () => {}, pause: () => {}, stop: () => {}, volume: 1, setVolume: (_v: number) => {}, activeSounds: [] as any[] };
}
