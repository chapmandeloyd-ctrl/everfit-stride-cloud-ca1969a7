import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, AlarmClock, Check, ChevronDown, Send, Camera, FileText, Download } from "lucide-react";

export default function ClientTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentViewerUrl, setDocumentViewerUrl] = useState<string | null>(null);
  const [documentViewerName, setDocumentViewerName] = useState<string>("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { data: task } = useQuery({
    queryKey: ["client-task-detail", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("id", taskId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });

  const { data: comments } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments" as any)
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!taskId,
  });

  useEffect(() => {
    if (!taskId) return;
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "task_comments",
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  useEffect(() => {
    if (commentsOpen) {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [commentsOpen, comments?.length]);

  useEffect(() => {
    return () => {
      if (documentViewerUrl) {
        URL.revokeObjectURL(documentViewerUrl);
      }
    };
  }, [documentViewerUrl]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const newCompleted = task.completed_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from("client_tasks")
        .update({ completed_at: newCompleted })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-task-detail"] });
      queryClient.invalidateQueries({ queryKey: ["client-tasks"] });
      toast({ title: task?.completed_at ? "Task reopened" : "Task completed! 🎉" });
    },
  });

  const sendCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("task_comments" as any)
        .insert({ task_id: taskId, user_id: user?.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoComment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);

    if (upErr) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path);

    await supabase.from("task_comments" as any).insert({
      task_id: taskId,
      user_id: user.id,
      attachment_url: urlData.publicUrl,
      attachment_type: "image",
    });

    queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
    e.target.value = "";
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    sendCommentMutation.mutate(commentText.trim());
  };

  const closeDocumentViewer = () => {
    setDocumentViewerOpen(false);
    setDocumentLoading(false);
    if (documentViewerUrl) {
      URL.revokeObjectURL(documentViewerUrl);
      setDocumentViewerUrl(null);
    }
    setDocumentViewerName("");
  };

  const handleOpenDocument = async (url: string, fileName?: string) => {
    setDocumentLoading(true);
    setDocumentViewerOpen(true);
    setDocumentViewerName(fileName || "Document");

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Unable to open document");

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);

      if (documentViewerUrl) {
        URL.revokeObjectURL(documentViewerUrl);
      }

      setDocumentViewerUrl(nextUrl);
    } catch (error) {
      setDocumentViewerOpen(false);
      toast({
        title: "Couldn’t open document",
        description: "This browser is blocking the external file tab, so I switched to an in-app viewer.",
        variant: "destructive",
      });
    } finally {
      setDocumentLoading(false);
    }
  };

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isCompleted = !!task.completed_at;
  const attachments = task.attachments as any[] | null;
  const mediaAttachment = attachments?.find((a: any) => a.type === "media");
  const docAttachment = attachments?.find((a: any) => a.type === "document");
  const mediaName = mediaAttachment?.mediaName || mediaAttachment?.fileName;
  const docName = docAttachment?.fileName || docAttachment?.mediaName;

  const isDocType = (name: string | undefined) => {
    if (!name) return false;
    return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(name);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {!isCompleted && (
          <button className="p-1">
            <AlarmClock className="h-5 w-5 text-primary" />
          </button>
        )}
      </div>

      <h1 className="text-xl font-bold text-center px-4 pb-4">{task.name}</h1>

      <div className="flex-1 px-4 space-y-4">
        {mediaAttachment?.url && !isDocType(mediaAttachment?.fileName) && (
          <div className="rounded-xl overflow-hidden">
            <img
              src={mediaAttachment.url}
              alt={mediaName || "Task media"}
              className="w-full object-cover max-h-[400px]"
            />
          </div>
        )}

        {(docAttachment?.url || (mediaAttachment?.url && isDocType(mediaAttachment?.fileName))) && (() => {
          const att = docAttachment || mediaAttachment;
          const name = docAttachment ? docName : mediaName;

          return (
            <div className="rounded-xl bg-muted/50 py-8 px-4 flex flex-col items-center gap-3">
              <div className="w-20 h-20 flex items-center justify-center">
                <FileText className="h-16 w-16 text-muted-foreground/50" />
              </div>
              {name && <p className="text-sm text-center font-medium">{name}</p>}
              <button
                type="button"
                onClick={() => handleOpenDocument(att.url, name)}
                className="text-sm font-semibold text-primary"
              >
                Open document
              </button>
            </div>
          );
        })()}

        {mediaAttachment?.url && !isDocType(mediaAttachment?.fileName) && (
          <p className="text-xs text-muted-foreground text-center underline">Offer Details</p>
        )}

        {mediaName && !isDocType(mediaAttachment?.fileName) && (
          <p className="text-sm text-center font-medium">{mediaName}</p>
        )}

        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}

        <button
          onClick={() => setCommentsOpen(true)}
          className="text-sm font-medium text-primary mx-auto block"
        >
          Add comment
        </button>
      </div>

      <div className="flex justify-center pb-8 pt-4">
        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isCompleted
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
          }`}
        >
          <Check className="h-8 w-8" />
        </button>
      </div>

      <Sheet open={documentViewerOpen} onOpenChange={(open) => (open ? setDocumentViewerOpen(true) : closeDocumentViewer())}>
        <SheetContent side="bottom" className="h-[92vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <div className="flex items-center gap-2">
              <button onClick={closeDocumentViewer}>
                <ChevronDown className="h-5 w-5" />
              </button>
              <SheetTitle className="flex-1 text-center truncate px-2">{documentViewerName || "Document"}</SheetTitle>
              {documentViewerUrl ? (
                <a
                  href={documentViewerUrl}
                  download={documentViewerName || "document"}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-5 w-5" />
                </a>
              ) : (
                <div className="w-7" />
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 bg-muted/30">
            {documentLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Loading document...
              </div>
            ) : documentViewerUrl ? (
              <iframe
                src={documentViewerUrl}
                title={documentViewerName || "Document viewer"}
                className="h-full w-full border-0 bg-background"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Unable to load document.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="h-[60vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <div className="flex items-center gap-2">
              <button onClick={() => setCommentsOpen(false)}>
                <ChevronDown className="h-5 w-5" />
              </button>
              <SheetTitle className="flex-1 text-center">Comments</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!comments || comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                  <Send className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold">No comments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c: any) => (
                  <div
                    key={c.id}
                    className={`flex ${c.user_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        c.user_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {c.attachment_url && (
                        <img src={c.attachment_url} alt="" className="rounded-lg mb-1 max-h-48" />
                      )}
                      {c.content && <p className="text-sm">{c.content}</p>}
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t bg-background">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              {user?.email?.substring(0, 2).toUpperCase()}
            </div>
            <Input
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder="Type message..."
              className="flex-1 rounded-full"
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim()}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-primary-foreground" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoComment}
              className="hidden"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
