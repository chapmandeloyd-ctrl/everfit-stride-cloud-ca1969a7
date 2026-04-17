import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Mic, Square, Trash2, Play, Pause, Loader2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSaveMotivation, type GoalMotivation } from "@/hooks/useGoalMotivation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  goalId?: string | null;
  trainerId?: string | null;
  existing?: GoalMotivation | null;
}

const BUCKET = "goal-motivation-media";

export function MyWhyEditDialog({
  open,
  onOpenChange,
  clientId,
  goalId,
  trainerId,
  existing,
}: Props) {
  const { toast } = useToast();
  const save = useSaveMotivation();

  const [text, setText] = useState(existing?.why_text ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.why_image_url ?? null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existing?.why_audio_url ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [savingAudio, setSavingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when opened with new data
  useEffect(() => {
    if (open) {
      setText(existing?.why_text ?? "");
      setImageUrl(existing?.why_image_url ?? null);
      setAudioUrl(existing?.why_audio_url ?? null);
      setRecordedBlob(null);
      setPreviewObjectUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  // Get a signed URL for stored audio (private bucket)
  const [signedAudio, setSignedAudio] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!audioUrl) {
        setSignedAudio(null);
        return;
      }
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(audioUrl, 60 * 60);
      if (alive) setSignedAudio(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [audioUrl]);

  const [signedImage, setSignedImage] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!imageUrl) {
        setSignedImage(null);
        return;
      }
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(imageUrl, 60 * 60);
      if (alive) setSignedImage(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 10 MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${clientId}/why-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      setImageUrl(path);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewObjectUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err: any) {
      toast({
        title: "Microphone unavailable",
        description: err.message ?? "Please grant microphone access.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  const uploadRecording = async (): Promise<string | null> => {
    if (!recordedBlob) return null;
    setSavingAudio(true);
    try {
      const path = `${clientId}/voice-${Date.now()}.webm`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, recordedBlob, {
        contentType: "audio/webm",
        upsert: false,
      });
      if (error) throw error;
      return path;
    } finally {
      setSavingAudio(false);
    }
  };

  const handleSave = async () => {
    try {
      let nextAudio = audioUrl;
      if (recordedBlob) {
        nextAudio = await uploadRecording();
      }

      await save.mutateAsync({
        id: existing?.id,
        goal_id: goalId ?? existing?.goal_id ?? null,
        trainer_id: trainerId ?? existing?.trainer_id ?? null,
        why_text: text.trim() || null,
        why_image_url: imageUrl,
        why_audio_url: nextAudio,
      });

      toast({ title: "Your Why saved", description: "Stay strong — you've got this 💪" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Your Why
          </DialogTitle>
          <DialogDescription>
            Capture the personal reason behind your goal. We'll show it on your dashboard so you stay
            connected to it every day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Text */}
          <div className="space-y-2">
            <Label>Why does this matter to you?</Label>
            <Textarea
              placeholder="e.g., I want to feel confident in my wedding dress and have energy to dance all night with the people I love."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{text.length}/500</p>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Motivation image (optional)</Label>
            {signedImage ? (
              <Card className="overflow-hidden relative">
                <img src={signedImage} alt="My why" className="w-full h-48 object-cover" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setImageUrl(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4 mr-2" />
                )}
                {uploadingImage ? "Uploading..." : "Upload image"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Voice memo */}
          <div className="space-y-2">
            <Label>Voice memo (optional)</Label>
            {previewObjectUrl ? (
              <Card className="p-3 flex items-center gap-3">
                <Button size="icon" variant="outline" onClick={togglePlay}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm flex-1">New recording ready</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setRecordedBlob(null);
                    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
                    setPreviewObjectUrl(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <audio
                  ref={audioElRef}
                  src={previewObjectUrl}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />
              </Card>
            ) : signedAudio ? (
              <Card className="p-3 flex items-center gap-3">
                <Button size="icon" variant="outline" onClick={togglePlay}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-sm flex-1">Saved voice memo</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setAudioUrl(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <audio
                  ref={audioElRef}
                  src={signedAudio}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />
              </Card>
            ) : (
              <Button
                type="button"
                variant={recording ? "destructive" : "outline"}
                className="w-full"
                onClick={recording ? stopRecording : startRecording}
              >
                {recording ? (
                  <>
                    <Square className="h-4 w-4 mr-2" /> Stop recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" /> Record a voice memo
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Record yourself saying why this goal matters. Listen back when you need a boost.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={save.isPending || savingAudio || uploadingImage}>
            {save.isPending || savingAudio ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
