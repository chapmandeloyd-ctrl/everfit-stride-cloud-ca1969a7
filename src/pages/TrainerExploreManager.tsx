import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image as ImageIcon, Compass, BookOpen, Loader2 } from "lucide-react";
import type { ExploreContent, Challenge, ExploreCategory, ExploreContentType, ChallengeType, ChallengeBadgeColor, ChallengeDifficulty } from "@/types/explore";

const CATEGORIES: ExploreCategory[] = ["fuel", "train", "restore", "general"];
const CONTENT_TYPES: ExploreContentType[] = ["article", "video", "audio"];
const CHALLENGE_TYPES: ChallengeType[] = ["fasting", "sleep", "movement", "journal", "nutrition"];
const BADGE_COLORS: ChallengeBadgeColor[] = ["green", "purple", "pink", "red"];
const DIFFICULTIES: ChallengeDifficulty[] = ["beginner", "intermediate", "advanced"];

type ArticleDraft = Partial<ExploreContent> & { _imageFile?: File | null };
type ChallengeDraft = Partial<Challenge> & { _tipsText?: string };

const blankArticle: ArticleDraft = {
  title: "",
  subtitle: "",
  type: "article",
  category: "fuel",
  image_url: "",
  author: "",
  body: "",
  cta_label: "Read",
  is_premium: false,
  is_published: true,
  featured_rank: null,
  popular_rank: null,
};

const blankChallenge: ChallengeDraft = {
  title: "",
  subtitle: "",
  type: "fasting",
  duration_days: 7,
  target_value: 7,
  target_unit: "fasts",
  fast_minimum_hours: 16,
  description: "",
  badge_label: "",
  badge_color: "green",
  difficulty: "beginner",
  participants: 0,
  featured_rank: null,
  is_published: true,
  _tipsText: "",
};

export default function TrainerExploreManager() {
  const [tab, setTab] = useState<"articles" | "challenges">("articles");
  const [articles, setArticles] = useState<ExploreContent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const [articleOpen, setArticleOpen] = useState(false);
  const [articleDraft, setArticleDraft] = useState<ArticleDraft>(blankArticle);
  const [savingArticle, setSavingArticle] = useState(false);

  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft>(blankChallenge);
  const [savingChallenge, setSavingChallenge] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [a, c] = await Promise.all([
      supabase.from("explore_content").select("*").order("created_at", { ascending: false }),
      supabase.from("challenges").select("*").order("created_at", { ascending: false }),
    ]);
    if (a.error) toast.error("Failed to load articles");
    if (c.error) toast.error("Failed to load challenges");
    setArticles((a.data ?? []) as ExploreContent[]);
    setChallenges((c.data ?? []) as Challenge[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // ---------- ARTICLES ----------
  const openNewArticle = () => { setArticleDraft(blankArticle); setArticleOpen(true); };
  const openEditArticle = (a: ExploreContent) => { setArticleDraft({ ...a }); setArticleOpen(true); };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("explore-content").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error(`Upload failed: ${error.message}`); return null; }
    const { data } = supabase.storage.from("explore-content").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveArticle = async () => {
    if (!articleDraft.title?.trim()) { toast.error("Title is required"); return; }
    setSavingArticle(true);
    try {
      let imageUrl = articleDraft.image_url ?? null;
      if (articleDraft._imageFile) {
        const uploaded = await uploadImage(articleDraft._imageFile);
        if (!uploaded) { setSavingArticle(false); return; }
        imageUrl = uploaded;
      }
      const payload = {
        title: articleDraft.title!.trim(),
        subtitle: articleDraft.subtitle?.trim() || null,
        type: articleDraft.type ?? "article",
        category: articleDraft.category ?? "fuel",
        image_url: imageUrl,
        author: articleDraft.author?.trim() || null,
        body: articleDraft.body?.trim() || null,
        cta_label: articleDraft.cta_label?.trim() || "Read",
        is_premium: !!articleDraft.is_premium,
        is_published: articleDraft.is_published ?? true,
        featured_rank: articleDraft.featured_rank ?? null,
        popular_rank: articleDraft.popular_rank ?? null,
      };
      const { error } = articleDraft.id
        ? await supabase.from("explore_content").update(payload).eq("id", articleDraft.id)
        : await supabase.from("explore_content").insert(payload);
      if (error) throw error;
      toast.success(articleDraft.id ? "Article updated" : "Article created");
      setArticleOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSavingArticle(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("explore_content").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadAll(); }
  };

  // ---------- CHALLENGES ----------
  const openNewChallenge = () => { setChallengeDraft(blankChallenge); setChallengeOpen(true); };
  const openEditChallenge = (c: Challenge) => {
    setChallengeDraft({ ...c, _tipsText: (c.tips ?? []).join("\n") });
    setChallengeOpen(true);
  };

  const saveChallenge = async () => {
    if (!challengeDraft.title?.trim()) { toast.error("Title is required"); return; }
    setSavingChallenge(true);
    try {
      const tipsArr = (challengeDraft._tipsText ?? "")
        .split("\n").map((t) => t.trim()).filter(Boolean);
      const payload = {
        title: challengeDraft.title!.trim(),
        subtitle: challengeDraft.subtitle?.trim() || null,
        type: challengeDraft.type ?? "fasting",
        duration_days: Number(challengeDraft.duration_days ?? 7),
        target_value: challengeDraft.target_value != null ? Number(challengeDraft.target_value) : null,
        target_unit: challengeDraft.target_unit?.trim() || null,
        fast_minimum_hours: challengeDraft.fast_minimum_hours != null ? Number(challengeDraft.fast_minimum_hours) : null,
        description: challengeDraft.description?.trim() || null,
        tips: tipsArr.length ? tipsArr : null,
        badge_label: challengeDraft.badge_label?.trim() || null,
        badge_color: challengeDraft.badge_color ?? "green",
        difficulty: challengeDraft.difficulty ?? "beginner",
        participants: Number(challengeDraft.participants ?? 0),
        featured_rank: challengeDraft.featured_rank ?? null,
        is_published: challengeDraft.is_published ?? true,
      };
      const { error } = challengeDraft.id
        ? await supabase.from("challenges").update(payload).eq("id", challengeDraft.id)
        : await supabase.from("challenges").insert(payload);
      if (error) throw error;
      toast.success(challengeDraft.id ? "Challenge updated" : "Challenge created");
      setChallengeOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSavingChallenge(false);
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Delete this challenge? Participant data will be removed.")) return;
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadAll(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="h-6 w-6" /> Explore Manager</h1>
            <p className="text-muted-foreground text-sm">Create & edit Learn articles and Challenges shown in the client Explore tab.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="articles"><BookOpen className="h-4 w-4 mr-2" /> Learn Articles</TabsTrigger>
            <TabsTrigger value="challenges"><Compass className="h-4 w-4 mr-2" /> Challenges</TabsTrigger>
          </TabsList>

          {/* ARTICLES */}
          <TabsContent value="articles" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNewArticle}><Plus className="h-4 w-4 mr-1" /> New Article</Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : articles.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No articles yet. Click "New Article".</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {articles.map((a) => (
                  <Card key={a.id} className="overflow-hidden">
                    <div className="flex gap-3 p-3">
                      <div className="h-20 w-28 flex-shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                        {a.image_url ? <img src={a.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{a.title}</h3>
                          <Badge variant="outline" className="capitalize text-[10px]">{a.category}</Badge>
                          <Badge variant="outline" className="capitalize text-[10px]">{a.type}</Badge>
                          {!a.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                          {a.is_premium && <Badge className="text-[10px]">Premium</Badge>}
                        </div>
                        {a.subtitle && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.subtitle}</p>}
                        {a.author && <p className="text-[11px] text-muted-foreground mt-1">By {a.author}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditArticle(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteArticle(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CHALLENGES */}
          <TabsContent value="challenges" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNewChallenge}><Plus className="h-4 w-4 mr-1" /> New Challenge</Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : challenges.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No challenges yet.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {challenges.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{c.title}</h3>
                          <Badge variant="outline" className="capitalize text-[10px]">{c.type}</Badge>
                          <Badge variant="outline" className="capitalize text-[10px]">{c.difficulty}</Badge>
                          <Badge variant="outline" className="text-[10px]">{c.duration_days}d</Badge>
                          {!c.is_published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                        </div>
                        {c.subtitle && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.subtitle}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">{c.participants} participants</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditChallenge(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteChallenge(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ARTICLE DIALOG */}
      <Dialog open={articleOpen} onOpenChange={setArticleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{articleDraft.id ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={articleDraft.title ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={articleDraft.subtitle ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, subtitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={articleDraft.category} onValueChange={(v) => setArticleDraft({ ...articleDraft, category: v as ExploreCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={articleDraft.type} onValueChange={(v) => setArticleDraft({ ...articleDraft, type: v as ExploreContentType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTENT_TYPES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Cover Image</Label>
              {articleDraft.image_url && <img src={articleDraft.image_url} alt="" className="h-32 rounded-md object-cover" />}
              <Input type="file" accept="image/*" onChange={(e) => setArticleDraft({ ...articleDraft, _imageFile: e.target.files?.[0] ?? null })} />
              <Input placeholder="…or paste image URL" value={articleDraft.image_url ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, image_url: e.target.value, _imageFile: null })} />
            </div>
            <div className="grid gap-2">
              <Label>Author</Label>
              <Input value={articleDraft.author ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, author: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Body (Markdown supported)</Label>
              <Textarea rows={8} value={articleDraft.body ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>CTA Label</Label>
                <Input value={articleDraft.cta_label ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, cta_label: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Featured Rank (lower = first)</Label>
                <Input type="number" value={articleDraft.featured_rank ?? ""} onChange={(e) => setArticleDraft({ ...articleDraft, featured_rank: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Published</Label>
              <Switch checked={!!articleDraft.is_published} onCheckedChange={(v) => setArticleDraft({ ...articleDraft, is_published: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Premium</Label>
              <Switch checked={!!articleDraft.is_premium} onCheckedChange={(v) => setArticleDraft({ ...articleDraft, is_premium: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArticleOpen(false)}>Cancel</Button>
            <Button onClick={saveArticle} disabled={savingArticle}>{savingArticle && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHALLENGE DIALOG */}
      <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{challengeDraft.id ? "Edit Challenge" : "New Challenge"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={challengeDraft.title ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={challengeDraft.subtitle ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, subtitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={challengeDraft.type} onValueChange={(v) => setChallengeDraft({ ...challengeDraft, type: v as ChallengeType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHALLENGE_TYPES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Difficulty</Label>
                <Select value={challengeDraft.difficulty} onValueChange={(v) => setChallengeDraft({ ...challengeDraft, difficulty: v as ChallengeDifficulty })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Duration (days)</Label>
                <Input type="number" value={challengeDraft.duration_days ?? 7} onChange={(e) => setChallengeDraft({ ...challengeDraft, duration_days: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Target Value</Label>
                <Input type="number" value={challengeDraft.target_value ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, target_value: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Target Unit</Label>
                <Input placeholder="fasts / hours / days" value={challengeDraft.target_unit ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, target_unit: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Min Fast Hours</Label>
                <Input type="number" value={challengeDraft.fast_minimum_hours ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, fast_minimum_hours: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={4} value={challengeDraft.description ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Tips (one per line)</Label>
              <Textarea rows={4} value={challengeDraft._tipsText ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, _tipsText: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Badge Label</Label>
                <Input value={challengeDraft.badge_label ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, badge_label: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Badge Color</Label>
                <Select value={challengeDraft.badge_color} onValueChange={(v) => setChallengeDraft({ ...challengeDraft, badge_color: v as ChallengeBadgeColor })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BADGE_COLORS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Featured Rank</Label>
                <Input type="number" value={challengeDraft.featured_rank ?? ""} onChange={(e) => setChallengeDraft({ ...challengeDraft, featured_rank: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Published</Label>
              <Switch checked={!!challengeDraft.is_published} onCheckedChange={(v) => setChallengeDraft({ ...challengeDraft, is_published: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChallengeOpen(false)}>Cancel</Button>
            <Button onClick={saveChallenge} disabled={savingChallenge}>{savingChallenge && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}