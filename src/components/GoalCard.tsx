export function GoalCard(props: any) {
  return <div className="p-4 border border-border rounded-lg"><p>{props.goal?.title || "Goal"}</p></div>;
}
