import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Save, Clock } from "lucide-react";

export function FastingCardEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const trainerId = user?.id;

  const { data: fastingCard, isLoading } = useQuery({
    queryKey: ["trainer-fasting-card", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_fasting_cards")
        .select("*")
        .eq("trainer_id", trainerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });

  if (fastingCard && !initialized) {
    setMessage(fastingCard.message || "");
    setTitle((fastingCard as any).title ?? "");
    setInitialized(true);
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trainerId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${trainerId}/fasting-card.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("welcome-card-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("welcome-card-images")
        .getPublicUrl(path);

      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      if (fastingCard) {
        const { error } = await supabase
          .from("trainer_fasting_cards")
          .update({ image_url: imageUrl })
          .eq("id", fastingCard.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trainer_fasting_cards")
          .insert({ trainer_id: trainerId, image_url: imageUrl, message: message || null, title: title || null });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["trainer-fasting-card"] });
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = async () => {
    if (!fastingCard) return;
    try {
      await supabase.from("trainer_fasting_cards").update({ image_url: null }).eq("id", fastingCard.id);
      queryClient.invalidateQueries({ queryKey: ["trainer-fasting-card"] });
      toast({ title: "Image removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const saveMessage = async () => {
    if (!trainerId) return;
    setSaving(true);
    try {
      if (fastingCard) {
        const { error } = await supabase
          .from("trainer_fasting_cards")
          .update({ message: message || null, title: title || null })
          .eq("id", fastingCard.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trainer_fasting_cards")
          .insert({ trainer_id: trainerId, message: message || null, title: title || null });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["trainer-fasting-card"] });
      toast({ title: "Saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Fasting Card
        </CardTitle>
        <CardDescription>
          This card appears on every new client's dashboard until you assign them a fasting protocol.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <div className="rounded-lg overflow-hidden border">
          <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
            {fastingCard?.image_url ? (
              <img
                src={fastingCard.image_url}
                alt="Fasting card"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-sm font-bold text-white">
                {message || "Your fasting journey begins soon."}
              </p>
            </div>
          </div>
        </div>

        {/* Image controls */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImagePlus className="h-4 w-4 mr-1.5" />
            {uploading ? "Uploading..." : fastingCard?.image_url ? "Change" : "Upload"}
          </Button>
          {fastingCard?.image_url && (
            <Button variant="outline" size="sm" onClick={removeImage}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove
            </Button>
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label>Fasting Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your fasting journey begins soon."
            rows={2}
          />
          <Button size="sm" onClick={saveMessage} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Saving..." : "Save Message"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
