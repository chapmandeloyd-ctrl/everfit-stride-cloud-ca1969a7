import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";
import { Progress } from "./ui/progress";

interface ClientCardProps {
  client?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  // Legacy props from Dashboard
  key?: string;
  name?: string;
  avatar?: string;
  program?: string;
  progress?: number;
  lastCheckIn?: string;
  status?: "active" | "paused" | "pending";
  [key: string]: any;
}

export function ClientCard(props: ClientCardProps) {
  const navigate = useNavigate();
  const name = props.client?.full_name || props.name || props.client?.email || "Client";
  const avatar = props.client?.avatar_url || props.avatar;
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => props.client?.id && navigate(`/clients/${props.client.id}`)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatar || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{name}</p>
          {props.program && (
            <p className="text-xs text-muted-foreground">{props.program}</p>
          )}
          {props.progress !== undefined && (
            <Progress value={props.progress} className="h-1.5 mt-1" />
          )}
        </div>
        {props.status && (
          <Badge variant={props.status === "active" ? "default" : "secondary"} className="text-xs">
            {props.status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
