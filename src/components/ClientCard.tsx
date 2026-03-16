import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNavigate } from "react-router-dom";

interface ClientCardProps {
  client: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export function ClientCard({ client }: ClientCardProps) {
  const navigate = useNavigate();
  const name = client.full_name || client.email || "Client";
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/clients/${client.id}`)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={client.avatar_url || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{name}</p>
          {client.email && client.full_name && (
            <p className="text-xs text-muted-foreground">{client.email}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
