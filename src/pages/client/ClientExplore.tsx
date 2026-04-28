import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Bookmark, ChevronRight, FileText, Video, Headphones, Calendar, Target } from "lucide-react";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useExploreContent,
  useChallenges,
  useUserChallenges,
  useBookmarks,
  useToggleBookmark,
  useComputedProgress,
} from "@/hooks/useExplore";
import { ChallengeBadge } from "@/components/explore/ChallengeBadge";
import type { Challenge, ExploreContent } from "@/types/explore";

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
    // Reset scroll per tab
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UpdateBanner />
      {/* Header */}
      <header
        className="bg-card border-b border-border px-4 shrink-0 sticky top-0 z-40"
        style={{
          paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)",
        }}
      >
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => setSearchOpen(true)}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Explore</h1>
          <button
            onClick={() => setBookmarksOpen(true)}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
            aria-label="Bookmarks"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented tabs */}
        <div className="grid grid-cols-3 gap-1 pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTab(t.key)}
              className={cn(
                "py-2 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase transition-colors",
                tab === t.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
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
        .sort((a, b) => (a.featured_rank! - b.featured_rank!)),
    [content]
  );
  const popular = useMemo(
    () =>
      content
        .filter((c) => c.popular_rank != null)
        .sort((a, b) => (a.popular_rank! - b.popular_rank!)),
    [content]
  );

  return (
    <div className="px-4 py-5 space-y-7">
      {/* FEATURED */}
      {featured.length > 0 && (
        <Section title="Featured">
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
            {featured.map((item) => (
              <FeaturedCard key={item.id} item={item} onClick={() => navigate(`/client/explore/content/${item.id}`)} />
            ))}
          </div>
        </Section>
      )}

      {/* CHALLENGES */}
      {challenges.length > 0 && (
        <Section title="Try a Challenge" actionLabel="See All" onAction={() => navigate("/client/explore?tab=challenges")}>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
            {challenges.slice(0, 8).map((c) => (
              <ChallengeMiniCard key={c.id} challenge={c} onClick={() => navigate(`/client/explore/challenge/${c.id}`)} />
            ))}
          </div>
        </Section>
      )}

      {/* POPULAR */}
      {popular.length > 0 && (
        <Section title="Popular Content">
          <div className="grid grid-cols-2 gap-3">
            {popular.map((item) => (
              <ContentCard key={item.id} item={item} onClick={() => navigate(`/client/explore/content/${item.id}`)} />
            ))}
          </div>
        </Section>
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
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {lead && <LeadCard item={lead} onClick={() => navigate(`/client/explore/content/${lead.id}`)} />}

      {rest.length > 0 && (
        <Section title="Latest">
          <div className="grid grid-cols-2 gap-3">
            {rest.map((item) => (
              <ContentCard key={item.id} item={item} onClick={() => navigate(`/client/explore/content/${item.id}`)} />
            ))}
          </div>
        </Section>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Nothing here yet.</p>
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
    <div className="px-4 py-5 space-y-7">
      {userChallenges.length > 0 && (
        <Section title="Your Challenges">
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {userChallenges.map((uc) => (
              <ActiveChallengeRow
                key={uc.id}
                uc={uc}
                onClick={() => navigate(`/client/explore/challenge/${uc.challenge_id}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {featured && (
        <Section title="Featured">
          <FeaturedChallengeBanner
            challenge={featured}
            onClick={() => navigate(`/client/explore/challenge/${featured.id}`)}
          />
        </Section>
      )}

      <Section title="Join a Challenge">
        <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {browse.map((c) => (
            <BrowseChallengeRow
              key={c.id}
              challenge={c}
              onClick={() => navigate(`/client/explore/challenge/${c.id}`)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ============================================================
// SHARED VISUAL COMPONENTS
// ============================================================
function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-xs font-bold tracking-[0.15em] uppercase text-primary"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function FeaturedCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start min-w-[88%] rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-left shadow-lg flex flex-col justify-between min-h-[220px]"
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary-foreground/70 mb-2">
          {item.subtitle ? "Featured" : item.type}
        </p>
        <h3 className="text-2xl font-bold text-primary-foreground leading-tight mb-2">{item.title}</h3>
        {item.author && (
          <p className="text-sm text-primary-foreground/80">{item.author}</p>
        )}
      </div>
      <span className="self-start mt-4 px-5 py-2 rounded-full bg-background/15 backdrop-blur text-primary-foreground text-sm font-semibold">
        {item.cta_label || "Read Now"}
      </span>
    </button>
  );
}

function ChallengeMiniCard({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start min-w-[160px] max-w-[160px] rounded-2xl bg-card border border-border p-4 text-left shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
    >
      <ChallengeBadge label={challenge.badge_label} color={challenge.badge_color} type={challenge.type} size="md" />
      <div>
        <p className={cn("text-[10px] font-bold tracking-[0.15em] uppercase mb-1", typeColor(challenge.type))}>
          {challenge.type}
        </p>
        <h4 className="font-bold text-foreground leading-tight text-base">{challenge.title}</h4>
      </div>
      <p className="text-xs text-muted-foreground mt-auto">
        {challenge.duration_days}d · {formatParticipants(challenge.participants)}
      </p>
    </button>
  );
}

function ContentCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;
  return (
    <button onClick={onClick} className="text-left flex flex-col gap-2">
      <div className={cn("aspect-video rounded-2xl flex items-center justify-center", categoryBg(item.category))}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-2xl" />
        ) : (
          <Icon className="h-10 w-10 text-foreground/40" />
        )}
      </div>
      <h4 className="font-bold text-sm leading-tight line-clamp-2">{item.title}</h4>
      {item.author && <p className="text-xs text-muted-foreground">{item.author}</p>}
      <Icon className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function LeadCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;
  return (
    <button onClick={onClick} className="text-left flex flex-col gap-3 w-full">
      <div className={cn("aspect-[16/10] rounded-2xl flex items-center justify-center", categoryBg(item.category))}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-2xl" />
        ) : (
          <Icon className="h-16 w-16 text-foreground/40" />
        )}
      </div>
      <h3 className="font-bold text-xl leading-tight">{item.title}</h3>
      {item.author && <p className="text-sm text-muted-foreground">{item.author}</p>}
    </button>
  );
}

function ActiveChallengeRow({
  uc,
  onClick,
}: {
  uc: any;
  onClick: () => void;
}) {
  const c: Challenge = uc.challenge;
  const { data: progress = 0 } = useComputedProgress(uc);
  const target = Number(c.target_value || 1);
  const pct = Math.min(100, Math.round((Number(progress) / target) * 100));
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/40 transition-colors">
      <ChallengeBadge label={c.badge_label} color={c.badge_color} type={c.type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className={cn("text-[10px] font-bold tracking-[0.15em] uppercase mb-0.5", typeColor(c.type))}>{c.type}</p>
        <h4 className="font-bold text-foreground leading-tight truncate">{c.title}</h4>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {progress}/{target} {c.target_unit}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function BrowseChallengeRow({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/40 transition-colors">
      <ChallengeBadge label={challenge.badge_label} color={challenge.badge_color} type={challenge.type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className={cn("text-[10px] font-bold tracking-[0.15em] uppercase mb-0.5", typeColor(challenge.type))}>
          {challenge.type}
        </p>
        <h4 className="font-bold text-foreground leading-tight truncate">{challenge.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {challenge.duration_days} days · {formatParticipants(challenge.participants)} active
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function FeaturedChallengeBanner({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-left shadow-lg flex items-center gap-4"
    >
      <div className="flex-1">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary-foreground/70 mb-2">Challenge</p>
        <h3 className="text-2xl font-bold text-primary-foreground leading-tight mb-3">{challenge.title}</h3>
        <span className="inline-block px-5 py-2 rounded-full bg-background/15 backdrop-blur text-primary-foreground text-sm font-semibold">
          Join Now
        </span>
      </div>
      <ChallengeBadge label={challenge.badge_label} color={challenge.badge_color} type={challenge.type} size="lg" className="opacity-90" />
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
      <SheetContent side="top" className="h-auto max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>Search Explore</SheetTitle>
        </SheetHeader>
        <Input
          autoFocus
          placeholder="Search content and challenges…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-4"
        />
        <div className="mt-4 space-y-4 overflow-auto">
          {matchesC.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Content</p>
              {matchesC.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/client/explore/content/${c.id}`);
                  }}
                  className="block w-full text-left py-2 hover:bg-muted/40 px-2 rounded"
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {matchesCh.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Challenges</p>
              {matchesCh.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/client/explore/challenge/${c.id}`);
                  }}
                  className="block w-full text-left py-2 hover:bg-muted/40 px-2 rounded"
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {q && matchesC.length === 0 && matchesCh.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No matches</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BookmarksSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { data: bookmarks } = useBookmarks();
  const { data: content = [] } = useExploreContent();
  const items = content.filter((c) => bookmarks?.has(c.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Saved</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
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
              className="block w-full text-left p-3 rounded-xl hover:bg-muted/40"
            >
              <p className="font-semibold leading-tight">{c.title}</p>
              {c.author && <p className="text-xs text-muted-foreground mt-0.5">{c.author}</p>}
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

function typeColor(type: string): string {
  switch (type) {
    case "fasting":
      return "text-emerald-600";
    case "sleep":
      return "text-purple-500";
    case "movement":
      return "text-pink-500";
    case "journal":
      return "text-amber-500";
    case "nutrition":
      return "text-emerald-500";
    default:
      return "text-muted-foreground";
  }
}

function categoryBg(cat: string): string {
  switch (cat) {
    case "fuel":
      return "bg-sky-100 dark:bg-sky-950/40";
    case "train":
      return "bg-orange-100 dark:bg-orange-950/40";
    case "restore":
      return "bg-purple-100 dark:bg-purple-950/40";
    default:
      return "bg-muted";
  }
}
