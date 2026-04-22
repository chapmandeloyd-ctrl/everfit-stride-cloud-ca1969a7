import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Save, Eye } from "lucide-react";
import {
  useTrainerPdfBranding,
  type TrainerPdfBranding,
  DEFAULT_PDF_BRANDING,
} from "@/hooks/useTrainerPdfBranding";
import { exportKetoPlanPdf } from "@/lib/pdf/exportKetoPlan";

const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: "KSOM Red", value: "#CC181E" },
  { label: "HPKD Red", value: "#E4572E" },
  { label: "SKD Orange", value: "#F59E0B" },
  { label: "CKD Teal", value: "#0EA5A4" },
  { label: "TKD Purple", value: "#8B5CF6" },
  { label: "Graphite", value: "#1F2937" },
];

const PREVIEW_KETO = {
  abbreviation: "KSOM",
  name: "Standard Keto",
  subtitle: "Sample preview",
  description: "This is what your clients' exported PDFs will look like.",
  difficulty: "intermediate" as const,
  fat_pct: 70,
  protein_pct: 25,
  carbs_pct: 5,
  carb_limit_grams: 30,
  built_for: ["Steady fat loss", "Stable energy", "Mental clarity"],
  how_it_works: null,
  color: null,
};

export function PdfBrandingEditor() {
  const { branding, isLoading, save } = useTrainerPdfBranding();
  const { toast } = useToast();
  const [draft, setDraft] = useState<TrainerPdfBranding>(DEFAULT_PDF_BRANDING);
  const [hydrated, setHydrated] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!isLoading && !hydrated) {
      setDraft(branding);
      setHydrated(true);
    }
  }, [branding, isLoading, hydrated]);

  const dirty =
    draft.show_logo !== branding.show_logo ||
    draft.accent_color.toLowerCase() !== branding.accent_color.toLowerCase() ||
    (draft.footer_text ?? "") !== (branding.footer_text ?? "") ||
    (draft.document_label_override ?? "") !== (branding.document_label_override ?? "");

  const handleSave = () => {
    save.mutate(draft, {
      onSuccess: () => {
        toast({ title: "PDF branding saved", description: "All client exports will use these settings." });
      },
      onError: (err) => {
        console.error("[pdf branding] save failed", err);
        toast({
          title: "Save failed",
          description: "Could not save PDF branding. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handlePreview = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      await exportKetoPlanPdf({
        ketoType: PREVIEW_KETO,
        themeColor: null,
        clientName: "Sample Client",
        coachRead: "This preview reflects your saved PDF branding settings.",
        brandingAccentHex: draft.accent_color,
        branding: {
          showLogo: draft.show_logo,
          footerText: draft.footer_text,
          documentLabelOverride: draft.document_label_override,
        },
      });
    } catch (err) {
      console.error("[pdf branding] preview failed", err);
      toast({
        title: "Preview failed",
        description: "Could not generate the preview PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          PDF Branding
        </CardTitle>
        <CardDescription>
          Controls how every PDF your clients export looks (keto plans, protocols, future exports). Set it
          once — clients just tap Export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo toggle */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="show-logo" className="text-sm font-semibold">Show lion logo in header</Label>
            <p className="text-xs text-muted-foreground">
              Recommended for full brand presence. Turn off for a cleaner, text-only header.
            </p>
          </div>
          <Switch
            id="show-logo"
            checked={draft.show_logo}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, show_logo: v }))}
          />
        </div>

        {/* Accent color */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Accent color</Label>
            <p className="text-xs text-muted-foreground">
              Used for the header rule, section bars, and quote highlights.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const selected = draft.accent_color.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, accent_color: preset.value }))}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                  aria-pressed={selected}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: preset.value }}
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="accent-hex" className="text-xs text-muted-foreground w-24">Custom hex</Label>
            <Input
              id="accent-hex"
              value={draft.accent_color}
              onChange={(e) => setDraft((d) => ({ ...d, accent_color: e.target.value }))}
              placeholder="#CC181E"
              className="font-mono text-sm w-32"
              maxLength={7}
            />
            <span
              className="h-7 w-7 rounded-md border border-border"
              style={{ backgroundColor: draft.accent_color }}
              aria-hidden
            />
          </div>
        </div>

        {/* Footer text */}
        <div className="space-y-2">
          <Label htmlFor="footer-text" className="text-sm font-semibold">Footer text (optional)</Label>
          <Input
            id="footer-text"
            value={draft.footer_text ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, footer_text: e.target.value || null }))}
            placeholder='Default: "Prepared for {client name}"'
          />
          <p className="text-xs text-muted-foreground">
            Replaces the bottom-left footer line on every page. Leave blank to keep the default.
          </p>
        </div>

        {/* Document label override */}
        <div className="space-y-2">
          <Label htmlFor="doc-label" className="text-sm font-semibold">Header eyebrow (optional)</Label>
          <Input
            id="doc-label"
            value={draft.document_label_override ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, document_label_override: e.target.value || null }))}
            placeholder='Default: the document title (e.g. "PERSONALIZED KETO PLAN")'
            maxLength={48}
          />
          <p className="text-xs text-muted-foreground">
            Small uppercase line in the top-right of every page.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!dirty || save.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? "Saving…" : "Save Branding"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={previewing}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {previewing ? "Generating…" : "Preview Sample PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
