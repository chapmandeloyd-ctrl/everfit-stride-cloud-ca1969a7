export function ClientListItem(props: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {(props.client?.full_name || props.client?.email || "?").substring(0, 2).toUpperCase()}
      </div>
      <div>
        <p className="font-medium text-sm">{props.client?.full_name || props.client?.email}</p>
      </div>
    </div>
  );
}
