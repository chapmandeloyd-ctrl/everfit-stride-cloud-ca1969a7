import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

export default function Placeholder() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).replace(/-/g, " ").replace(/\//g, " › ");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold capitalize">{pageName || "Page"}</h2>
      <p className="text-muted-foreground mt-2 text-sm max-w-md">
        This section is being rebuilt. Your data is safe and ready to go.
      </p>
    </div>
  );
}
