export function WorkoutPlayer(props: any) { return <div>Workout Player</div>; }
export function WorkoutPlayerProvider(props: any) { return <>{props.children}</>; }
export function useWorkoutPlayer() { return { isPlaying: false, start: () => {}, stop: () => {} }; }
export function unlockAudioForMobile() {}
