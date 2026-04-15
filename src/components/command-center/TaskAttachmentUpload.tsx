import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Image, FileIcon, Link2, X, Upload, Loader2 } from "lucide-react";

export type AttachmentType = "media" | "document" | "link" | null;

export interface TaskAttachment {
  type: AttachmentType;
  url: string;
  fileName?: string;
  fileSize?: number;
}

interface TaskAttachmentUploadProps {
  attachment: TaskAttachment | null;
  onAttachmentChange: (attachment: TaskAttachment | null) => void;
}

const MEDIA_ACCEPT = "image/*,video/*,audio/*";
const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

export function TaskAttachmentUpload({ attachment, onAttachmentChange }: TaskAttachmentUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeType, setActiveType] = useState<AttachmentType>(attachment?.type || null);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState(attachment?.type === "link" ? attachment.url : "");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectType = (type: AttachmentType) => {
    if (activeType === type) return;
    setActiveType(type);
    onAttachmentChange(null);
    setLinkUrl("");
  };

  const handleClear = () => {
    setActiveType(null);
    onAttachmentChange(null);
    setLinkUrl("");
  };

  const uploadFile = useCallback(async (file: File, type: "media" | "document") => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("task-attachments")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(path);

      onAttachmentChange({
        type,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
      });

      toast({ title: "Uploaded", description: file.name });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [user, onAttachmentChange, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeType && activeType !== "link") {
      uploadFile(file, activeType);
    }
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && activeType && activeType !== "link") {
      uploadFile(file, activeType);
    }
  }, [activeType, uploadFile]);

  const handleLinkSave = () => {
    if (!linkUrl.trim()) return;
    onAttachmentChange({ type: "link", url: linkUrl.trim() });
  };

  // No type selected — show 3 buttons
  if (!activeType) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Attachment</Label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleSelectType("media")}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
          >
            <Image className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Media</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectType("document")}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
          >
            <FileIcon className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Document</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectType("link")}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
          >
            <Link2 className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Link</span>
          </button>
        </div>
      </div>
    );
  }

  // Link type
  if (activeType === "link") {
    return (
      <div className="space-y-1.5 relative">
        <button
          type="button"
          onClick={handleClear}
          className="absolute -top-1 -right-1 z-10 bg-foreground text-background rounded-full p-0.5 hover:opacity-80"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-4 rounded-xl bg-muted/50 space-y-3">
          <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Link</Label>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onBlur={handleLinkSave}
            onKeyDown={(e) => e.key === "Enter" && handleLinkSave()}
            placeholder="http://example.com"
            className="border-primary/30 focus:border-primary"
          />
        </div>
      </div>
    );
  }

  // Media or Document — show upload zone
  const isMedia = activeType === "media";
  const label = isMedia ? "UPLOAD MEDIA FILE" : "UPLOAD DOCUMENT";
  const accept = isMedia ? MEDIA_ACCEPT : DOCUMENT_ACCEPT;
  const hint = isMedia
    ? "Drag and drop your media here,"
    : "Drag and drop a .xls .doc .pdf here";

  // If file already uploaded, show preview
  if (attachment && attachment.type === activeType) {
    return (
      <div className="space-y-1.5 relative">
        <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{label}</Label>
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-0 -right-1 z-10 bg-foreground text-background rounded-full p-0.5 hover:opacity-80"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
          {isMedia && attachment.url && (
            <img src={attachment.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
          )}
          {!isMedia && <FileIcon className="h-8 w-8 text-muted-foreground" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.fileName}</p>
            {attachment.fileSize && (
              <p className="text-xs text-muted-foreground">
                {(attachment.fileSize / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 relative">
      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{label}</Label>
      <button
        type="button"
        onClick={handleClear}
        className="absolute top-0 -right-1 z-10 bg-foreground text-background rounded-full p-0.5 hover:opacity-80"
      >
        <X className="h-4 w-4" />
      </button>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">
              {hint}{" "}
              <span className="text-primary underline cursor-pointer">
                {isMedia ? "Choose a file" : "Choose file"}
              </span>
              {isMedia && (
                <>, or <span className="text-primary underline cursor-pointer">Add video link</span></>
              )}
            </p>
            <p className="text-xs text-muted-foreground">No file chosen</p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
