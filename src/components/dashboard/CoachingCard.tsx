import { useEffect } from "react";
import { useCoachingMessage } from "@/hooks/useCoachingMessage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Flame, TrendingDown, Zap, Battery, Trophy, Check } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: typeof Sparkles; accent: string; label: string }> = {
  fasting_failure: { icon: Flame, accent: "text-orange-400", label: "Fasting" },
  macro_failure: { icon: Target, accent: "text-red-400", label: "Macros" },
  low_score: { icon: TrendingDown, accent: "text-yellow-400", label: "Recovery" },
  stall: { icon: Battery, accent: "text-blue-400", label: "Plateau" },
  tkd_training: { icon: Zap, accent: "text-purple-400", label: "Training" },
  low_energy: { icon: Battery, accent: "text-amber-400", label: "Energy" },
  strong_day: { icon: Trophy, accent: "text-emerald-400", label: "Momentum" },
};

export function CoachingCard() {
  const { message, isLoading, generateMessage, markAsRead } = useCoachingMessage();

  // Auto-trigger coaching engine if no message exists for today
  useEffect(() => {
    if (!isLoading && !message) {
      generateMessage.mutate();
    }
  }, [isLoading, message]);

  if (isLoading || !message) return null;

  const config = TYPE_CONFIG[message.coach_type] || {
    icon: Sparkles,
    accent: "text-primary",
    label: "Coaching",
  };
  const Icon = config.icon;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-muted ${config.accent}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Today's Coaching
              </p>
              <p className={`text-[10px] font-medium ${config.accent}`}>{config.label}</p>
            </div>
          </div>
          {!message.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-foreground leading-relaxed">{message.message}</p>

        {/* Action */}
        {message.action_text && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Target className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs font-medium text-foreground">{message.action_text}</p>
          </div>
        )}

        {/* Mark as read */}
        {!message.is_read && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => markAsRead.mutate(message.id)}
          >
            <Check className="h-3 w-3 mr-1" />
            Got it
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
