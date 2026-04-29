import { useState } from "react";
import { Plus, Pencil, Smile, Apple, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTodayDailyJournal } from "@/hooks/useDailyJournal";
import { DailyJournalSheet } from "./DailyJournalSheet";
import { cn } from "@/lib/utils";

export function DailyJournalCard() {
  const [open, setOpen] = useState(false);
  const { data: today } = useTodayDailyJournal();
  const done = !!today;

  const Icon = ({ children, filled }: { children: React.ReactNode; filled?: boolean }) => (
    <div
      className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center ring-1 transition",
        filled
          ? "bg-primary/20 ring-primary/40 text-primary"
          : "bg-teal-500/15 ring-teal-400/30 text-teal-300"
      )}
    >
      {children}
    </div>
  );

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="cursor-pointer hover:bg-white/[0.02] transition border-white/10"
      >
        <CardContent className="p-4 flex items-center gap-4">
          {/* 2x2 icon cluster */}
          <div className="grid grid-cols-2 gap-1.5 shrink-0">
            <Icon filled={done}><Pencil className="h-4 w-4" /></Icon>
            <Icon filled={done && !!today?.mood}><Smile className="h-4 w-4" /></Icon>
            <Icon filled={done && (today?.body_feelings?.length ?? 0) > 0}>
              <LotusMini />
            </Icon>
            <Icon filled={done && !!today?.meals_quality}><Apple className="h-4 w-4" /></Icon>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-foreground">Daily Journal</h3>
              {done && (
                <span className="text-[10px] flex items-center gap-1 text-teal-300 bg-teal-400/10 ring-1 ring-teal-400/30 rounded-full px-2 py-0.5">
                  <Check className="h-3 w-3" /> Logged
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {done ? "Tap to edit today's entry" : "How was your day?"}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="h-12 w-12 rounded-full bg-teal-500 hover:bg-teal-400 text-black flex items-center justify-center shrink-0 transition shadow-lg shadow-teal-500/20"
            aria-label="Open journal"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </CardContent>
      </Card>

      <DailyJournalSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function LotusMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 14c-4 0-7-3-7-3s3-3 7-3 7 3 7 3-3 3-7 3z" />
      <path d="M12 14c0 3-3 5-3 5s-1-3 0-5" />
      <path d="M12 14c0 3 3 5 3 5s1-3 0-5" />
      <circle cx="12" cy="14" r="1" />
    </svg>
  );
}