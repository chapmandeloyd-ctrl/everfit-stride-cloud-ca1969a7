import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

export default function ChangeTempPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast({ title: "Too short", description: "Use at least 8 characters.", variant: "destructive" });
    if (pw !== confirm) return toast({ title: "Passwords don't match", variant: "destructive" });
    if (pw === current) return toast({ title: "Choose a new password", description: "It must be different from the temporary one.", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { must_change_password: false },
      // supported by auth server when "require current password" is on
      current_password: current,
    });
    if (error) {
      setSaving(false);
      const msg = /weak|pwned|leak/i.test(error.message)
        ? "That password is too common or appeared in a data leak. Pick a stronger, unique one."
        : error.message;
      return toast({ title: "Couldn't update password", description: msg, variant: "destructive" });
    }
    await supabase.auth.signOut();
    toast({ title: "Password updated", description: "Sign in with your new password." });
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Set your own password</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          You signed in with a temporary password. Choose your own password to continue — then sign in again with it.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cur">Temporary password</Label>
          <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf">Confirm new password</Label>
          <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save new password
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); navigate("/auth", { replace: true }); }}>
          Sign out
        </Button>
      </form>
    </div>
  );
}
