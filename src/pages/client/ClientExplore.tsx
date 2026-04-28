import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Bookmark, ChevronRight, FileText, Video, Headphones } from "lucide-react";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useExploreContent,
  useChallenges,
  useUserChallenges,
  useBookmarks,
  useComputedProgress,
} from "@/hooks/useExplore";
import { ChallengeBadge } from "@/components/explore/ChallengeBadge";
import { LionWatermark } from "@/components/explore/LionWatermark";
import type { Challenge, ExploreContent } from "@/types/explore";

type TabKey = "home" | "learn" | "challenges";

const TABS: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "learn", label: "Learn" },
  { key: "challenges", label: "Challenges" },
];

// === Editorial Black & Gold tokens ===
const BG = "hsl(0 0% 4%)";
const SURFACE = "hsl(0 0% 6%)";
const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const HAIRLINE = "hsl(42 70% 55% / 0.25)";

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
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <UpdateBanner />
      {/* Header */}
      <header
        className="px-4 shrink-0 sticky top-0 z-40"
        style={{
          background: BG,
          borderBottom: `1px solid ${HAIRLINE}`,
          paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)",
        }}
      >
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => setSearchOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-full"
            style={{ border: `1px solid ${HAIRLINE}`, color: GOLD }}
            aria-label="Search"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
              The Library
            </p>
            <h1
              className="text-lg tracking-wide"
              style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
            >
              Explore
            </h1>
          </div>
          <button
            onClick={() => setBookmarksOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-full"
            style={{ border: `1px solid ${HAIRLINE}`, color: GOLD }}
            aria-label="Bookmarks"
          >
            <Bookmark className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Segmented tabs — gold underline style */}
        <div className="grid grid-cols-3 pb-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTab(t.key)}
                className="py-2 text-[10px] tracking-[0.35em] uppercase transition-colors relative"
                style={{ color: active ? GOLD : MUTED, fontFamily: "Georgia, serif" }}
              >
                {t.label}
                <span
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 h-px transition-all"
                  style={{
                    width: active ? "32px" : "0px",
                    background: GOLD,
                  }}
                />
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
    <div className="px-4 py-6 space-y-9">
      {featured.length > 0 && (
        <Section title="Featured">
          <div className="flex gap-4 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {featured.map((item) => (
              <FeaturedCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/client/explore/content/${item.id}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {challenges.length > 0 && (
        <Section
          title="Try a Challenge"
          actionLabel="See All"
          onAction={() => navigate("/client/explore?tab=challenges")}
        >
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {challenges.slice(0, 8).map((c) => (
              <ChallengeMiniCard
                key={c.id}
                challenge={c}
                onClick={() => navigate(`/client/explore/challenge/${c.id}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {popular.length > 0 && (
        <Section title="Popular">
          <div className="grid grid-cols-2 gap-3">
            {popular.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/client/explore/content/${item.id}`)}
              />
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
    <div className="px-4 py-6 space-y-6">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-5 py-2 text-[10px] tracking-[0.3em] uppercase whitespace-nowrap transition-colors"
              style={{
                background: active ? GOLD : "transparent",
                color: active ? "hsl(0 0% 4%)" : MUTED,
                border: `1px solid ${active ? GOLD : HAIRLINE}`,
                fontFamily: "Georgia, serif",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {lead && (
        <LeadCard item={lead} onClick={() => navigate(`/client/explore/content/${lead.id}`)} />
      )}

      {rest.length > 0 && (
        <Section title="Latest">
          <div className="grid grid-cols-2 gap-3">
            {rest.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/client/explore/content/${item.id}`)}
              />
            ))}
          </div>
        </Section>
      )}

      {filtered.length === 0 && (
        <p className="text-center py-12" style={{ color: MUTED }}>
          Nothing here yet.
        </p>
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
    <div className="px-4 py-6 space-y-9">
      {userChallenges.length > 0 && (
        <Section title="Your Challenges">
          <div
            className="overflow-hidden"
            style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
          >
            {userChallenges.map((uc, i) => (
              <ActiveChallengeRow
                key={uc.id}
                uc={uc}
                isLast={i === userChallenges.length - 1}
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
        <div
          className="overflow-hidden"
          style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
        >
          {browse.map((c, i) => (
            <BrowseChallengeRow
              key={c.id}
              challenge={c}
              isLast={i === browse.length - 1}
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
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <span className="h-px w-6" style={{ background: GOLD }} />
          <h2
            className="text-[11px] uppercase tracking-[0.4em]"
            style={{ color: GOLD, fontFamily: "Georgia, serif" }}
          >
            {title}
          </h2>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-[9px] tracking-[0.3em] uppercase"
            style={{ color: MUTED }}
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
      className="snap-start min-w-[86%] relative overflow-hidden text-left flex flex-col justify-between min-h-[260px] p-6"
      style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
    >
      <LionWatermark opacity={0.08} />
      <div className="relative">
        <p
          className="text-[9px] uppercase tracking-[0.4em] mb-3"
          style={{ color: GOLD }}
        >
          Featured · {item.category}
        </p>
        <h3
          className="text-2xl leading-tight tracking-tight mb-2"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {item.title}
        </h3>
        {item.author && (
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: MUTED }}>
            {item.author}
          </p>
        )}
      </div>
      <div className="relative mt-6 flex items-center gap-3">
        <span className="h-px w-6" style={{ background: GOLD }} />
        <span
          className="text-[10px] uppercase tracking-[0.35em]"
          style={{ color: GOLD, fontFamily: "Georgia, serif" }}
        >
          {item.cta_label || "Read"}
        </span>
      </div>
    </button>
  );
}

function ChallengeMiniCard({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start min-w-[170px] max-w-[170px] relative overflow-hidden text-left flex flex-col gap-4 p-4"
      style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
    >
      <LionWatermark opacity={0.05} size="w-[140%] h-[140%]" />
      <div className="relative">
        <ChallengeBadge
          label={challenge.badge_label}
          color={challenge.badge_color}
          type={challenge.type}
          size="md"
        />
      </div>
      <div className="relative">
        <p className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
          {challenge.type}
        </p>
        <h4
          className="leading-tight text-base"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {challenge.title}
        </h4>
      </div>
      <p className="relative text-[10px] mt-auto uppercase tracking-[0.2em]" style={{ color: MUTED }}>
        {challenge.duration_days}d · {formatParticipants(challenge.participants)}
      </p>
    </button>
  );
}

function ContentCard({ item, onClick }: { item: ExploreContent; onClick: () => void }) {
  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;
  return (
    <button onClick={onClick} className="text-left flex flex-col gap-3">
      <div
        className="aspect-[4/5] relative overflow-hidden flex items-center justify-center"
        style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(0.2) contrast(1.05)" }}
          />
        ) : (
          <>
            <LionWatermark opacity={0.07} />
            <Icon className="relative h-9 w-9" strokeWidth={1.25} style={{ color: GOLD }} />
          </>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
          {item.category}
        </p>
        <h4
          className="leading-tight line-clamp-2 text-sm"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {item.title}
        </h4>
        {item.author && (
          <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
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
    <button onClick={onClick} className="text-left flex flex-col gap-4 w-full">
      <div
        className="aspect-[16/10] relative overflow-hidden flex items-center justify-center"
        style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            style={{ filter: "grayscale(0.15) contrast(1.05)" }}
          />
        ) : (
          <>
            <LionWatermark opacity={0.1} />
            <Icon className="relative h-14 w-14" strokeWidth={1.25} style={{ color: GOLD }} />
          </>
        )}
      </div>
      <div className="space-y-2 px-1">
        <p className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
          The Lead · {item.category}
        </p>
        <h3
          className="text-2xl leading-tight tracking-tight"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {item.title}
        </h3>
        {item.author && (
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTED }}>
            {item.author}
          </p>
        )}
      </div>
    </button>
  );
}

function ActiveChallengeRow({
  uc,
  isLast,
  onClick,
}: {
  uc: any;
  isLast: boolean;
  onClick: () => void;
}) {
  const c: Challenge = uc.challenge;
  const { data: progress = 0 } = useComputedProgress(uc);
  const target = Number(c.target_value || 1);
  const pct = Math.min(100, Math.round((Number(progress) / target) * 100));
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 w-full text-left transition-colors"
      style={{ borderBottom: isLast ? "none" : `1px solid ${HAIRLINE}` }}
    >
      <ChallengeBadge label={c.badge_label} color={c.badge_color} type={c.type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
          {c.type}
        </p>
        <h4
          className="leading-tight truncate"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {c.title}
        </h4>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={pct} className="h-[2px] flex-1" />
          <span className="text-[10px] whitespace-nowrap uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            {progress}/{target}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={1.25} />
    </button>
  );
}

function BrowseChallengeRow({
  challenge,
  isLast,
  onClick,
}: {
  challenge: Challenge;
  isLast: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 w-full text-left transition-colors"
      style={{ borderBottom: isLast ? "none" : `1px solid ${HAIRLINE}` }}
    >
      <ChallengeBadge
        label={challenge.badge_label}
        color={challenge.badge_color}
        type={challenge.type}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
          {challenge.type}
        </p>
        <h4
          className="leading-tight truncate"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {challenge.title}
        </h4>
        <p className="text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: MUTED }}>
          {challenge.duration_days} days · {formatParticipants(challenge.participants)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: GOLD }} strokeWidth={1.25} />
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
      className="w-full relative overflow-hidden p-6 text-left flex items-center gap-5"
      style={{ background: SURFACE, border: `1px solid ${HAIRLINE}`, minHeight: "180px" }}
    >
      <LionWatermark opacity={0.08} />
      <div className="relative flex-1">
        <p className="text-[9px] uppercase tracking-[0.4em] mb-2" style={{ color: GOLD }}>
          The Challenge
        </p>
        <h3
          className="text-2xl leading-tight tracking-tight mb-3"
          style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
        >
          {challenge.title}
        </h3>
        <span
          className="inline-block px-5 py-2 text-[10px] uppercase tracking-[0.3em]"
          style={{ border: `1px solid ${GOLD}`, color: GOLD, fontFamily: "Georgia, serif" }}
        >
          Join Now
        </span>
      </div>
      <div className="relative">
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
      <SheetContent side="top" className="h-auto max-h-[80vh]" style={{ background: BG }}>
        <SheetHeader>
          <SheetTitle style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}>
            Search the Library
          </SheetTitle>
        </SheetHeader>
        <Input
          autoFocus
          placeholder="Search content and challenges…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-4"
          style={{ background: SURFACE, border: `1px solid ${HAIRLINE}`, color: IVORY }}
        />
        <div className="mt-4 space-y-4 overflow-auto">
          {matchesC.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
                Content
              </p>
              {matchesC.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/client/explore/content/${c.id}`);
                  }}
                  className="block w-full text-left py-2 px-2"
                  style={{ color: IVORY, fontFamily: "Georgia, serif" }}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {matchesCh.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
                Challenges
              </p>
              {matchesCh.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/client/explore/challenge/${c.id}`);
                  }}
                  className="block w-full text-left py-2 px-2"
                  style={{ color: IVORY, fontFamily: "Georgia, serif" }}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {q && matchesC.length === 0 && matchesCh.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: MUTED }}>
              No matches
            </p>
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
      <SheetContent side="right" className="w-full sm:max-w-md" style={{ background: BG }}>
        <SheetHeader>
          <SheetTitle style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}>
            Saved
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-center py-12" style={{ color: MUTED }}>
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
              className="block w-full text-left p-3"
              style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}
            >
              <p
                className="leading-tight"
                style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
              >
                {c.title}
              </p>
              {c.author && (
                <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: MUTED }}>
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
