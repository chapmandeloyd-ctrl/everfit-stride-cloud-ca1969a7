import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Copy, Check, UserCheck, MessageSquare, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogStep = "form" | "preview" | "success";

interface EmailPreview {
  id: string;
  label: string;
  subject: string;
  description: string;
  content: string[];
}

function getEmailPreviews(name: string, coachName: string): EmailPreview[] {
  return [
    {
      id: "invitation",
      label: "1. Invitation",
      subject: `${coachName} invited you to KSOM-360`,
      description: "Login credentials and welcome",
      content: [
        "You're in! 🎉",
        `Hey ${name}, ${coachName} has set up your KSOM-360 account. Log in to access your personalized training, nutrition, and progress tracking.`,
        "Your temporary password: ••••••••",
        "[Log In to KSOM-360] button",
      ],
    },
    {
      id: "getting-started",
      label: "2. Getting Started",
      subject: "Here's How to Get Started with KSOM-360 🚀",
      description: "Step-by-step onboarding guide",
      content: [
        "Let's Get Started! 🚀",
        `Hey ${name}, welcome to KSOM-360! Here's a quick guide:`,
        "Step 1: Log in and explore your dashboard",
        "Step 2: Check out your assigned workouts and meal plans",
        "Step 3: Log your first check-in",
        "Step 4: Message your coach if you have questions!",
        "[Open Your Dashboard] button",
      ],
    },
    {
      id: "meet-coach",
      label: "3. Meet Your Coach",
      subject: `${coachName} welcomes you to KSOM-360!`,
      description: "Personal introduction from you",
      content: [
        "Meet Your Coach 🤝",
        `Hey ${name}! I'm ${coachName}, your coach on KSOM-360.`,
        `"I'm excited to work with you! Together we'll build a plan that fits your life, push through plateaus, and celebrate every win along the way. Let's do this!"`,
        `Have a question? You can message ${coachName} anytime through the app.`,
        "[Say Hello 👋] button",
      ],
    },
    {
      id: "what-to-expect",
      label: "4. What to Expect",
      subject: "Here's What to Expect with KSOM-360 🎯",
      description: "Platform features overview",
      content: [
        "What to Expect 🎯",
        `${name}, here's what you can look forward to:`,
        "🏋️ Custom Workouts — Personalized training plans",
        "🥗 Meal Plans & Nutrition — Balanced plans with macro tracking",
        "📊 Progress Tracking — Detailed charts and metrics",
        "💬 Coach Messaging — Direct access to your coach",
        "📸 Progress Photos — Visual timeline of your transformation",
        "🏆 Goals & Badges — Set targets and earn achievements",
        "[Explore KSOM-360] button",
      ],
    },
  ];
}

function EmailPreviewCard({ email }: { email: EmailPreview }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{email.label}</div>
            <div className="text-xs text-muted-foreground truncate">{email.description}</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-border bg-muted/30 p-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            <strong>Subject:</strong> {email.subject}
          </div>
          <div className="space-y-1">
            {email.content.map((line, i) => (
              <p key={i} className={`text-xs ${i === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<DialogStep>("form");
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const coachName = user?.user_metadata?.full_name || "Your Coach";

  const addClientMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !fullName.trim() || !password.trim()) {
        throw new Error("All fields are required");
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const loginUrl = "https://ksom-360.app/auth";
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: {
          email: email.trim(),
          fullName: fullName.trim(),
          password: password.trim(),
          loginUrl,
        },
      });
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to create client");
      }
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      const creds = { email: email.trim(), password: password.trim(), name: fullName.trim() };
      setCreatedCredentials(creds);
      setStep("success");

      const loginUrl = "https://ksom-360.app/auth";
      const ts = Date.now();
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "client-invitation",
            recipientEmail: creds.email,
            idempotencyKey: `invite-${creds.email}-${ts}`,
            templateData: {
              name: creds.name,
              trainerName: coachName,
              loginUrl,
              tempPassword: creds.password,
            },
          },
        });
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome-getting-started",
            recipientEmail: creds.email,
            idempotencyKey: `getting-started-${creds.email}-${ts}`,
            templateData: { name: creds.name, loginUrl },
          },
        });
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome-meet-coach",
            recipientEmail: creds.email,
            idempotencyKey: `meet-coach-${creds.email}-${ts}`,
            templateData: { name: creds.name, coachName, loginUrl },
          },
        });
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome-what-to-expect",
            recipientEmail: creds.email,
            idempotencyKey: `what-to-expect-${creds.email}-${ts}`,
            templateData: { name: creds.name, loginUrl },
          },
        });
      } catch (e) {
        console.error("Failed to send welcome email sequence", e);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setStep("form");
    setCreatedCredentials(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || !password.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setStep("preview");
  };

  const handleConfirmAndSend = () => {
    addClientMutation.mutate();
  };

  const productionUrl = "https://ksom-360.app";

  const getShareText = () => {
    if (!createdCredentials) return "";
    return `Hey ${createdCredentials.name}! Your KSOM-360 account is ready 💪\n\nLogin here: ${productionUrl}/auth\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
  };

  const handleCopy = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(getShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareViaText = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard!", description: "Paste it into your messaging app" });
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!", description: "Paste it into your messaging app to send via text" });
    }
  };

  const emailPreviews = getEmailPreviews(fullName.trim() || "Client", coachName);

  return (
    <Dialog open={open} onOpenChange={step === "success" ? handleClose : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "success" && createdCredentials ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-center">Client Created!</DialogTitle>
              <DialogDescription className="text-center">
                Share these credentials with <strong>{createdCredentials.name}</strong>. All 4 welcome emails have been sent.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3 text-sm font-mono">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Login URL</div>
                <div className="select-all break-all">https://ksom-360.app/auth</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Email</div>
                <div className="select-all break-all">{createdCredentials.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Password</div>
                <div className="select-all">{createdCredentials.password}</div>
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={handleCopy} className="gap-2 flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" onClick={handleShareViaText} className="gap-2 flex-1">
                  <MessageSquare className="h-4 w-4" />
                  Share via Text
                </Button>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : step === "preview" ? (
          <>
            <DialogHeader>
              <DialogTitle>Review Welcome Emails</DialogTitle>
              <DialogDescription>
                These 4 emails will be sent to <strong>{fullName.trim()}</strong> ({email.trim()}) when you confirm.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[340px] pr-2">
              <div className="space-y-2">
                {emailPreviews.map((ep) => (
                  <EmailPreviewCard key={ep.id} email={ep} />
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="flex flex-row gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setStep("form")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirmAndSend} disabled={addClientMutation.isPending} className="flex-1">
                {addClientMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  "Confirm & Send"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client account. You'll get login credentials to share with them.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                <p className="text-xs text-muted-foreground">Client will use this password to log in</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit">Next: Review Emails</Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
