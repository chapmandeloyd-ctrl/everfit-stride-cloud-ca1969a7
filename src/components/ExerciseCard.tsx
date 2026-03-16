export function ExerciseCard(props: any) {
  return (
    <div className="p-4 border border-border rounded-lg">
      <p className="font-medium">{props.exercise?.name || "Exercise"}</p>
    </div>
  );
}
