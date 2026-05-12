import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Bookmark,
  ChevronRight,
  FileText,
  Video,
  Headphones,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  useExploreContent,
  useChallenges,
  useUserChallenges,
  useBookmarks,
  useComputedProgress,
} from "@/hooks/useExplore";
import { ChallengeBadge } from "@/components/explore/ChallengeBadge";
import type { Challenge, ExploreContent } from "@/types/explore";

/* ──────────────────────────────────────────────────────────────────────
   /client/explore — Restyled to match the new Program/Recap card system.
   Pure-black canvas, red-bordered gradient section panels, Space-Grotesk
   typography via the global stack. Drops the gold editorial theme.
   ────────────────────────────────────────────────────────────────────── */

type TabKey = "home" | "learn" | "challenges";

const TABS: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "learn", label: "Learn" },
  { key: "challenges", label: "Challenges" },
];

export default function ClientExplore() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "home";
  const [tab, setTab] = useState<TabKey>(initial);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const { updateAvailable } = useAppUpdate();

  const handleTab = (k: TabKey) => {
    setTab(k);
    setParams({ tab: k }, { replace: true });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <UpdateBanner />
      {/* Header */}
      <header
        className="px-4 shrink-0 sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border"
        style={{
          paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)",
        }}
      >
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => setSearchOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-border text-foreground/80 hover:text-primary hover:border-primary/40 transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.4em] font-bold text-primary">
              The Library
            </p>
            <h1 className="text-lg font-black tracking-tight text-foreground">Explore</h1>
          </div>
          <button
            onClick={() => setBookmarksOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-border text-foreground/80 hover:text-primary hover:border-primary/40 transition-colors"
            aria-label="Bookmarks"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented tabs — pill style */}
        <div className="grid grid-cols-3 gap-2 pb-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTab(t.key)}
                className={
                  "py-2 text-[10px] tracking-[0.3em] uppercase font-bold rounded-full border transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/40 text-muted-foreground border-border hover:text-foreground")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main
        className="flex-1 overflow-auto"
        style={{ paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom, 0px), 4px))" }}
      >
        <div className="animate-fade-in">
          {tab === "home" && <HomeTab />}
          {tab === "learn" && <LearnTab />}
          {tab === "challenges" && <ChallengesTab />}
        </div>
      </main>

      <ClientBottomNav />

      <SearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
      <BookmarksSheet open={bookmarksOpen} onOpenChange={setBookmarksOpen} />
    </div>
  );
}

// ============================================================
// HOME TAB
// ============================================================
function HomeTab() {
  const navigate = useNavigate();
  const { data: content = [] } = useExploreContent();
  const { data: challenges = [] } = useChallenges();

  const featured = useMemo(
    () =>
      content
        .filter((c) => c.featured_rank != null)
        .sort((a, b) => a.featured_rank! - b.featured_rank!),
    [content],
  );
  const popular = useMemo(
    () =>
      content
        .filter((c) => c.popular_rank != null)
        .sort((a, b) => a.popular_rank! - b.popular_rank!),
    [content],
  );

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Why-it-works style intro */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
            Today in The Library
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Hand-picked reads, audio, and challenges to sharpen your protocol — pulled fresh for you every day.
        </p>
      </div>

      {featured.length > 0 && (
        <PanelSection eyebrow="Featured" icon={Sparkles}>
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1 snap-x snap-mandatory scrollbar-hide pb-1">
            {featured.map((item) => (
              <FeaturedCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/client/explore/content/${item.id}`)}
              />
            ))}
          </div>
        </PanelSection>
      )}

      {challenges.length > 0 && (
        <PanelSection
          eyebrow="Try a Challenge"
          icon={Flame}
          actionLabel="See All"
          onAction={() => navigate("/client/explore?tab=challenges")}
        >
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1 snap-x snap-mandatory scrollbar-hide pb-1">
            {challenges.slice(0, 8).map((c) => (
              <ChallengeMiniCard
                key={c.id}
                challenge={c}
                onClick={() => navigate(`/client/explore/challenge/${c.id}`)}
              />
            ))}
          </div>
        </PanelSection>
      )}

      {popular.length > 0 && (
        <PanelSection eyebrow="Popular" icon={Trophy}>
          <div className="grid grid-cols-2 gap-3">
            {popular.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/client/explore/content/${item.id}`)}
              />
            ))}
          </div>
        </PanelSection>
      )}
    </div>
  );
}

// ============================================================
// LEARN TAB
// ============================================================
type LearnFilter = "all" | "video" | "audio" | "article";

function LearnTab() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<LearnFilter>("all");
  const { data: content = [] } = useExploreContent();

  const filtered = useMemo(() => {
    if (filter === "all") return content;
    return content.filter((c) => c.type === filter);
  }, [content, filter]);

  const lead = filtered[0];
  const rest = filtered.slice(1);

  const FILTERS: { key: LearnFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "video", label: "Videos" },
    { key: "audio", label: "Audio" },
    { key: "article", label: "Articles" },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "px-4 py-2 text-[10px] tracking-[0.3em] uppercase font-bold whitespace-nowrap rounded-full border transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/40 text-muted-foreground border-border hover:text-foreground")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {lead && (
        <PanelSection eyebrow="The Lead" icon={Sparkles}>
          <LeadCard item={lead} onClick={() => navigate(`/client/explore/content/${lead.id}`)} />
        </PanelSection>
      )}

      {rest.length > 0 && (
        <PanelSection eyebrow="Latest" icon={FileText}>
          <div className="grid grid-cols-2 gap-3">
            {rest.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/client/explore/content/${item.id}`)}
              />
            ))}
          </div>
        </PanelSection>
      )}

      {filtered.length === 0 && (
        <p className="text-center py-12 text-muted-foreground text-sm">Nothing here yet.</p>
      )}
    </div>
  );
}

// ============================================================
// CHALLENGES TAB
// ============================================================
function ChallengesTab() {
  const navigate = useNavigate();
  const { data: challenges = [] } = useChallenges();
  const { data: userChallenges = [] } = useUserChallenges();

  const joinedIds = new Set(userChallenges.map((uc) => uc.challenge_id));
  const browse = challenges.filter((c) => !joinedIds.has(c.id));
  const featured = challenges.find((c) => c.featured_rank != null);

  return (
    <div className="px-4 py-5 space-y-5">
      {userChallenges.length > 0 && (
        <PanelSection eyebrow="Your Challenges" icon={Trophy}>
          <div className="rounded-xl border border-border bg-card/60 overflow-hidden divide-y divide-border">
            {userChallenges.map((uc) => (
              <ActiveChallengeRow
                key={uc.id}
                uc={uc}
                onClick={() => navigate(`/client/explore/challenge/${uc.challenge_id}`)}
              />
            ))}
          </div>
        </PanelSection>
      )}

      {featured && (
        <PanelSection eyebrow="The Challenge" icon={Flame}>
          <FeaturedChallengeBanner
            challenge={featured}
            onClick={() => navigate(`/client/explore/challenge/${featured.id}`)}
          />
        </PanelSection>
      )}

      <PanelSection eyebrow="Join a Challenge" icon={Sparkles}>
        <div className="rounded-xl border border-border bg-card/60 overflow-hidden divide-y divide-border">
          {browse.map((c) => (
            <BrowseChallengeRow
              key={c.id}
              challenge={c}
              onClick={() => navigate(`/client/explore/challenge/${c.id}`)}
            />
          ))}
          {browse.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              You're crushing them all — check back soon for new challenges.
            </p>
          )}
        </div>
      </PanelSection>
    </div>
  );
}

// ============================================================
// PANEL — red-bordered gradient section (matches Program Recap)
// ============================================================
function PanelSection({
  eyebrow,
  icon: Icon,
  actionLabel,
  onAction,
  children,
}: {
  eyebrow: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
          <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
            {eyebrow}
          </h2>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-[9px] tracking-[0.25em] uppercase font-bold text-foreground/70 hover:text-primary"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// ============================================================
// CARDS
// ============================================================
function FeaturedCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start min-w-[82%] relative overflow-hidden text-left flex flex-col justify-between min-h-[220px] p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
    >
      {item.image_url && (
        <div className="absolute inset-0">
          <img
            src={item.image_url}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
        </div>
      )}
      <div className="relative">
        <p className="text-[9px] uppercase tracking-[0.3em] mb-2 font-bold text-primary">
          Featured · {item.category}
        </p>
        <h3 className="text-xl leading-tight font-black tracking-tight text-foreground mb-1.5">
          {item.title}
        </h3>
        {item.author && (
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
            {item.author}
          </p>
        )}
      </div>
      <div className="relative mt-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] uppercase tracking-[0.2em] font-bold">
          {item.cta_label || "Read"}
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

function ChallengeMiniCard({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start min-w-[170px] max-w-[170px] relative overflow-hidden text-left flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
    >
      <div>
        <ChallengeBadge
          label={challenge.badge_label}
          color={challenge.badge_color}
          type={challenge.type}
          size="md"
        />
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-[0.25em] mb-1 font-bold text-primary">
          {challenge.type}
        </p>
        <h4 className="leading-tight text-sm font-bold text-foreground line-clamp-2">
          {challenge.title}
        </h4>
      </div>
      <p className="text-[10px] mt-auto uppercase tracking-[0.2em] font-bold text-muted-foreground">
        {challenge.duration_days}d · {formatParticipants(challenge.participants)}
      </p>
    </button>
  );
}

function ContentCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;
  return (
    <button onClick={onClick} className="text-left flex flex-col gap-2 group">
      <div className="aspect-[4/5] relative overflow-hidden rounded-xl border border-border bg-card flex items-center justify-center group-hover:border-primary/40 transition-colors">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Icon className="h-9 w-9 text-primary/70" strokeWidth={1.5} />
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[8px] uppercase tracking-[0.2em] font-bold text-foreground/80 border border-border">
          {item.type}
        </span>
      </div>
      <div className="space-y-1 px-0.5">
        <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-primary">
          {item.category}
        </p>
        <h4 className="leading-tight line-clamp-2 text-sm font-bold text-foreground">
          {item.title}
        </h4>
        {item.author && (
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
            {item.author}
          </p>
        )}
      </div>
    </button>
  );
}

function LeadCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;
  return (
    <button onClick={onClick} className="text-left flex flex-col gap-3 w-full">
      <div className="aspect-[16/10] relative overflow-hidden rounded-xl border border-border bg-card flex items-center justify-center">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Icon className="h-12 w-12 text-primary/70" strokeWidth={1.5} />
        )}
      </div>
      <div className="space-y-1.5 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
          {item.category}
        </p>
        <h3 className="text-xl leading-tight font-black tracking-tight text-foreground">
          {item.title}
        </h3>
        {item.author && (
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
            {item.author}
          </p>
        )}
      </div>
    </button>
  );
}

function ActiveChallengeRow({ uc, onClick }: { uc: any; onClick: () => void }) {
  const c: Challenge = uc.challenge;
  const { data: progress = 0 } = useComputedProgress(uc);
  const target = Number(c.target_value || 1);
  const pct = Math.min(100, Math.round((Number(progress) / target) * 100));
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 w-full text-left hover:bg-primary/5 transition-colors"
    >
      <ChallengeBadge label={c.badge_label} color={c.badge_color} type={c.type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.25em] mb-0.5 font-bold text-primary">
          {c.type}
        </p>
        <h4 className="leading-tight truncate text-sm font-bold text-foreground">{c.title}</h4>
        <div className="flex items-center gap-2 mt-1.5">
          <Progress value={pct} className="h-1 flex-1" />
          <span className="text-[10px] whitespace-nowrap uppercase tracking-[0.2em] font-bold text-muted-foreground tabular-nums">
            {progress}/{target}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
    </button>
  );
}

function BrowseChallengeRow({
  challenge,
  onClick,
}: {
  challenge: Challenge;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 w-full text-left hover:bg-primary/5 transition-colors"
    >
      <ChallengeBadge
        label={challenge.badge_label}
        color={challenge.badge_color}
        type={challenge.type}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.25em] mb-0.5 font-bold text-primary">
          {challenge.type}
        </p>
        <h4 className="leading-tight truncate text-sm font-bold text-foreground">
          {challenge.title}
        </h4>
        <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5 font-bold text-muted-foreground">
          {challenge.duration_days} days · {formatParticipants(challenge.participants)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
    </button>
  );
}

function FeaturedChallengeBanner({
  challenge,
  onClick,
}: {
  challenge: Challenge;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full relative overflow-hidden p-5 text-left flex items-center gap-4 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card hover:border-primary transition-colors"
      style={{ minHeight: "160px" }}
    >
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.3em] mb-2 font-bold text-primary">
          The Challenge
        </p>
        <h3 className="text-xl leading-tight font-black tracking-tight text-foreground mb-3">
          {challenge.title}
        </h3>
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] uppercase tracking-[0.2em] font-bold">
          Join Now
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <div className="shrink-0">
        <ChallengeBadge
          label={challenge.badge_label}
          color={challenge.badge_color}
          type={challenge.type}
          size="lg"
        />
      </div>
    </button>
  );
}

// ============================================================
// SEARCH + BOOKMARKS SHEETS
// ============================================================
function SearchSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: content = [] } = useExploreContent();
  const { data: challenges = [] } = useChallenges();

  const matchesC = q
    ? content.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];
  const matchesCh = q
    ? challenges.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-auto max-h-[80vh] bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground font-black tracking-tight">
            Search the Library
          </SheetTitle>
        </SheetHeader>
        <Input
          autoFocus
          placeholder="Search content and challenges…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-4 bg-card border-border"
        />
        <div className="mt-4 space-y-4 overflow-auto">
          {matchesC.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2 font-bold text-primary">
                Content
              </p>
              {matchesC.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/client/explore/content/${c.id}`);
                  }}
                  className="block w-full text-left py-2 px-2 text-foreground hover:text-primary transition-colors text-sm"
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {matchesCh.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2 font-bold text-primary">
                Challenges
              </p>
              {matchesCh.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/client/explore/challenge/${c.id}`);
                  }}
                  className="block w-full text-left py-2 px-2 text-foreground hover:text-primary transition-colors text-sm"
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {q && matchesC.length === 0 && matchesCh.length === 0 && (
            <p className="text-sm text-center py-8 text-muted-foreground">No matches</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BookmarksSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: bookmarks } = useBookmarks();
  const { data: content = [] } = useExploreContent();
  const items = content.filter((c) => bookmarks?.has(c.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground font-black tracking-tight">Saved</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-center py-12 text-muted-foreground">
              Nothing saved yet. Tap the bookmark on any article to save it.
            </p>
          )}
          {items.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onOpenChange(false);
                navigate(`/client/explore/content/${c.id}`);
              }}
              className="block w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
            >
              <p className="leading-tight text-sm font-bold text-foreground">{c.title}</p>
              {c.author && (
                <p className="text-[10px] uppercase tracking-[0.25em] mt-1 font-bold text-muted-foreground">
                  {c.author}
                </p>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// HELPERS
// ============================================================
function formatParticipants(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
