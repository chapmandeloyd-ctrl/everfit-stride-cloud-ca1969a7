import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoSrc from "@/assets/logo.png";

interface SportLabCardProps {
  title: string;
  subtitle: string;
  accentColor: string;
  labRoute: string;
}

/**
 * Standardized 280px sport card with lion logo and "Enter Lab" button.
 * Bottom-aligned button ensures layout symmetry.
 */
export function SportLabCard({ title, subtitle, accentColor, labRoute }: SportLabCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-border/60 overflow-hidden" style={{ minHeight: 280 }}>
      <CardContent className="p-0 flex flex-col h-full" style={{ minHeight: 280 }}>
        {/* Header accent */}
        <div
          className="h-1.5 w-full"
          style={{ background: accentColor }}
        />

        <div className="flex flex-col flex-1 p-5">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
              <img src={logoSrc} alt="KSOM" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>

          {/* Description area */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-xs text-muted-foreground">Session tracking & analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-xs text-muted-foreground">Performance trends & heatmaps</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-xs text-muted-foreground">Badges & leaderboards</span>
              </div>
            </div>
          </div>

          {/* Bottom-aligned button */}
          <Button
            className="w-full mt-4 font-semibold"
            style={{ backgroundColor: accentColor }}
            onClick={() => navigate(labRoute)}
          >
            Enter Lab
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
