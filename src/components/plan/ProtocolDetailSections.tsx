import { Sparkles, Brain, ListChecks, CalendarClock, AlertTriangle, Flame, ShieldCheck } from "lucide-react";
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

interface ProtocolDetailSectionsProps {
  protocol: DemoProtocol;
}

/**
 * Renders the protocol detail sections (overview, phases, benefits, rules,
 * mental reality, schedule, coach warning) as individual stacked card
 * containers — matching the original "info under the cards" layout.
 */
export function ProtocolDetailSections({ protocol }: ProtocolDetailSectionsProps) {
  const { content, accentColorClass, iconGradient } = protocol;

  return (
    <div className="mt-4 space-y-3">
      {/* How This Protocol Works */}
      {content.overview?.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <Brain className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">How This Protocol Works</h3>
          </div>
          <div className="space-y-3">
            {content.overview.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
            ))}
          </div>
        </SectionCard>
      )}

      {/* What Your Body Is Doing */}
      {content.phases?.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <Flame className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">What Your Body Is Doing</h3>
          </div>
          <ul className="space-y-2">
            {content.phases.map((p, i) => (
              <li key={i} className="rounded-xl bg-muted/40 px-3 py-2.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-xs font-extrabold ${accentColorClass}`}>{p.range}</span>
                  <span className="text-xs font-bold">— {p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{p.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* What This Does For You */}
      {content.benefits?.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">What This Does For You</h3>
          </div>
          <ul className="space-y-2">
            {content.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${iconGradient} flex-shrink-0`}
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-background" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-muted-foreground leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Execution Rules */}
      {content.rules?.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">Execution Rules</h3>
          </div>
          <ul className="space-y-2.5">
            {content.rules.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br ${iconGradient} flex-shrink-0`} />
                <span className="text-muted-foreground leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Mental Reality */}
      {content.mentalReality?.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <Brain className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">Mental Reality</h3>
          </div>
          <div className="space-y-2.5">
            {content.mentalReality.map((m, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{m}</p>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Daily Schedule */}
      {content.schedule?.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">Daily Schedule</h3>
          </div>
          <ul className="space-y-2">
            {content.schedule.map((s, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-bold text-right">{s.detail}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Coach Warning */}
      {content.coachWarning?.length > 0 && (
        <SectionCard className="border-destructive/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">Coach Warning</h3>
          </div>
          <div
            className="rounded-xl border border-destructive/30 p-3 space-y-2"
            style={{ background: "hsl(var(--destructive) / 0.05)" }}
          >
            {content.coachWarning.map((w, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">{w}</p>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Built For */}
      {content.builtFor && content.builtFor.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className={`h-4 w-4 ${accentColorClass}`} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">Built For</h3>
          </div>
          <ul className="space-y-2">
            {content.builtFor.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br ${iconGradient} flex-shrink-0`} />
                <span className="text-muted-foreground leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}