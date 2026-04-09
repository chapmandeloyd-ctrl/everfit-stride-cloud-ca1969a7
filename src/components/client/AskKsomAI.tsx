import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, X, Bot, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface AskKsomAIProps {
  clientId: string;
}

export function AskKsomAI({ clientId }: AskKsomAIProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch client context for AI
  const { data: clientContext } = useQuery({
    queryKey: ["ai-client-context", clientId],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level")
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", clientId)
        .maybeSingle();

      // Get assigned keto type with full details
      const { data: ketoAssign } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types(name, abbreviation, description, how_it_works, built_for, coach_notes, difficulty, carb_limit_grams, protein_pct, fat_pct, carbs_pct, subtitle)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();

      // Get assigned protocol with full details
      const { data: protocolSettings } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, fasting_protocols(name, description, fast_target_hours, duration_days, category, difficulty_level, intensity_tier)")
        .eq("client_id", clientId)
        .maybeSingle();

      const keto = (ketoAssign as any)?.keto_types;
      const proto = (protocolSettings as any)?.fasting_protocols;

      return {
        engine_mode: settings?.engine_mode || "metabolic",
        current_level: settings?.current_level || 1,
        first_name: profile?.full_name?.split(" ")[0] || "there",
        // Keto type full details
        keto_type: keto?.name || "Standard",
        keto_abbreviation: keto?.abbreviation || "",
        keto_description: keto?.description || "",
        keto_how_it_works: keto?.how_it_works || "",
        keto_built_for: keto?.built_for || [],
        keto_coach_notes: keto?.coach_notes || [],
        keto_difficulty: keto?.difficulty || "",
        keto_carb_limit: keto?.carb_limit_grams || null,
        keto_macros: {
          protein_pct: keto?.protein_pct || 0,
          fat_pct: keto?.fat_pct || 0,
          carbs_pct: keto?.carbs_pct || 0,
        },
        keto_subtitle: keto?.subtitle || "",
        // Protocol full details
        protocol_name: proto?.name || "your assigned protocol",
        protocol_description: proto?.description || "",
        protocol_fast_hours: proto?.fast_target_hours || null,
        protocol_duration_days: proto?.duration_days || null,
        protocol_category: proto?.category || "",
        protocol_difficulty: proto?.difficulty_level || "",
        protocol_intensity: proto?.intensity_tier || "",
      };
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-client-chat`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          client_context: clientContext,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error("Too many requests. Please wait a moment.");
        } else if (resp.status === 402) {
          toast.error("AI credits depleted. Contact your coach.");
        } else {
          throw new Error(errData.error || `Error ${resp.status}`);
        }
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Chat failed");
      if (!assistantSoFar) {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const quickPrompts = [
    "Explain my keto type",
    "Explain my fasting program",
    "What foods fit my macros?",
    "How do my keto + fasting work together?",
  ];

  return (
    <>
      {/* Floating AI Button */}
      <div className="fixed bottom-20 left-4 z-30">
        <button
          onClick={() => setOpen(true)}
          className="group relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-black text-white transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Ask KSOM-360 AI"
        >
          <Sparkles className="h-5 w-5" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-ping" style={{ animationDuration: "3s", backgroundColor: "rgba(240, 36, 36, 0.3)" }} />
        </button>
      </div>

      {/* Chat Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl h-[85vh] flex flex-col p-0 gap-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: "linear-gradient(to right, rgba(240,36,36,0.08), rgba(0,0,0,0.05))" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-heading">Ask KSOM-360 AI</h3>
                <p className="text-[10px] text-muted-foreground">
                  Your personal coaching assistant
                </p>
              </div>
              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider border-0 px-1.5 py-0.5" style={{ backgroundColor: "rgba(240,36,36,0.1)", color: "#F02424" }}>
                Beta
              </Badge>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(240,36,36,0.1)" }}>
                  <Sparkles className="h-7 w-7" style={{ color: "#F02424" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Hey {clientContext?.first_name || "there"}! 👋</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    I know your program inside and out.<br />Ask me anything!
                  </p>
                </div>
                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt);
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-black text-white rounded-br-md"
                      : "bg-muted/60 border border-border text-foreground rounded-bl-md"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5 [&>p:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                  {msg.role === "assistant" && i === messages.length - 1 && isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-full" style={{ backgroundColor: "rgba(240,36,36,0.6)" }} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 space-y-2 bg-background">
            {messages.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setMessages([])}
                  className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                placeholder="Ask me anything..."
                className="flex-1 text-sm rounded-full bg-muted/40 border-border"
                disabled={isStreaming}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="rounded-full bg-black hover:bg-neutral-800 shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
