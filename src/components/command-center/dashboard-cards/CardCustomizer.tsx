import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Save } from "lucide-react";

export interface CardField {
  /** Field key — informational; the parent owns persistence */
  key: "title" | "message" | "image" | "textColor" | "overlayOpacity";
}

export interface CardCustomizerValues {
  title?: string | null;
  message?: string | null;
  imageUrl?: string | null;
  textColor?: string | null;
  overlayOpacity?: number | null;
}

interface CardCustomizerProps {
  /** Which fields to show. Cards may opt out of any. */
  fields: Array<CardField["key"]>;
  /** Current persisted values */
  values: CardCustomizerValues;
  /** Save handler — only called when user clicks "Save" (text fields) or after upload (image/color) */
  onSave: (next: CardCustomizerValues) => Promise<void> | void;
  /** Storage bucket for image uploads */
  bucket?: string;
  /** Folder prefix inside bucket (e.g. clientId, or `${clientId}/sport-game`) */
  storagePathPrefix: string;
  /** Placeholders */
  titlePlaceholder?: string;
  messagePlaceholder?: string;
  /** Optional preview renderer — receives current local values */
  renderPreview?: (v: CardCustomizerValues) => React.ReactNode;
  /** Disable Save while parent mutation pending */
  saving?: boolean;
}

export function CardCustomizer({
  fields,
  values,
  onSave,
  bucket = "rest-day-images",
  storagePathPrefix,
  titlePlaceholder = "REST DAY",
  messagePlaceholder = "Enjoy your rest!",
  renderPreview,
  saving = false,
}: CardCustomizerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Local editable state (only synced when `values` reference changes)
  const [title, setTitle] = useState(values.title ?? "");
  const [message, setMessage] = useState(values.message ?? "");
  const [textColor, setTextColor] = useState(values.textColor ?? "");
  const [overlay, setOverlay] = useState<number>(values.overlayOpacity ?? 50);

  useEffect(() => {
    setTitle(values.title ?? "");
    setMessage(values.message ?? "");
    setTextColor(values.textColor ?? "");
    setOverlay(values.overlayOpacity ?? 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.title, values.message, values.textColor, values.overlayOpacity, values.imageUrl]);

  const has = (k: CardField["key"]) => fields.includes(k);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${storagePathPrefix}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      await onSave({ imageUrl: publicUrl });
    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSaveText = async () => {
    const payload: CardCustomizerValues = {};
    if (has("title")) payload.title = title || null;
    if (has("message")) payload.message = message || null;
    if (has("textColor")) payload.textColor = textColor || null;
    if (has("overlayOpacity")) payload.overlayOpacity = overlay;
    await onSave(payload);
  };

  // Auto-save text fields on blur so trainers don't have to remember the Save button
  const handleBlurSave = () => {
    // Only save if something actually differs from persisted values
    const changed =
      (has("title") && (title || "") !== (values.title || "")) ||
      (has("message") && (message || "") !== (values.message || "")) ||
      (has("textColor") && (textColor || "") !== (values.textColor || ""));
    if (changed) handleSaveText();
  };

  const livePreviewValues: CardCustomizerValues = {
    title: has("title") ? title : values.title,
    message: has("message") ? message : values.message,
    imageUrl: values.imageUrl,
    textColor: has("textColor") ? textColor : values.textColor,
    overlayOpacity: has("overlayOpacity") ? overlay : values.overlayOpacity,
  };

  return (
    <div className="space-y-4">
      {renderPreview && (
        <div className="rounded-lg overflow-hidden border">
          {renderPreview(livePreviewValues)}
        </div>
      )}

      {has("image") && (
        <div>
          <Label className="text-sm font-medium">Cover Image (optional)</Label>
          <div className="flex gap-2 mt-1.5">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImagePlus className="h-4 w-4 mr-1.5" />
              {uploading ? "Uploading..." : values.imageUrl ? "Change" : "Upload"}
            </Button>
            {values.imageUrl && (
              <Button variant="outline" size="sm" onClick={() => onSave({ imageUrl: null })}>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {has("title") && (
        <div>
          <Label className="text-sm font-medium">Title (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlurSave}
            placeholder={titlePlaceholder}
            className="mt-1.5"
          />
        </div>
      )}

      {has("message") && (
        <div>
          <Label className="text-sm font-medium">Message (optional)</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={handleBlurSave}
            placeholder={messagePlaceholder}
            rows={2}
            className="mt-1.5"
          />
        </div>
      )}

      {has("textColor") && (
        <div>
          <Label className="text-sm font-medium">Text Color (optional)</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="color"
              value={textColor || "#ffffff"}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-10 w-14 rounded border border-input bg-background cursor-pointer"
              aria-label="Pick text color"
            />
            <Input
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              onBlur={handleBlurSave}
              placeholder="#ffffff"
              className="max-w-[140px]"
            />
            {textColor && (
              <Button variant="ghost" size="sm" onClick={() => setTextColor("")}>Reset</Button>
            )}
          </div>
        </div>
      )}

      {has("overlayOpacity") && (
        <div>
          <Label className="text-sm font-medium">Overlay Darkness ({overlay}%)</Label>
          <Slider
            value={[overlay]}
            onValueChange={([v]) => setOverlay(v)}
            onValueCommit={([v]) => {
              if (v !== (values.overlayOpacity ?? 50)) onSave({ overlayOpacity: v });
            }}
            min={0}
            max={90}
            step={5}
            className="mt-2"
          />
        </div>
      )}

      {(has("title") || has("message") || has("textColor") || has("overlayOpacity")) && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">Auto-saves when you click outside the field.</p>
          <Button size="sm" onClick={handleSaveText} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Saving..." : "Save now"}
          </Button>
        </div>
      )}
    </div>
  );
}