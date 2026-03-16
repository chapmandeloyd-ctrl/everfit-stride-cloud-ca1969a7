export function MessageBubble(props: any) { return <div className="p-2 rounded-lg bg-muted">{props.content || props.message?.content}</div>; }
