import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You're now signed in.");
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a login link!");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">KSOM360</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup" ? "Create your account" : "Sign in to your account"}
          </p>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-muted-foreground hover:underline" onClick={() => setMode("signup")}>
                  Create account
                </button>
                <button type="button" className="text-muted-foreground hover:underline" onClick={() => setMode("magic")}>
                  Magic link
                </button>
              </div>
              <div className="text-center">
                <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setMode("reset")}>
                  Forgot password?
                </button>
              </div>
            </form>
          ) : mode === "signup" ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Sign Up"}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:underline" onClick={() => setMode("login")}>
                Already have an account? Sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Magic Link"}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:underline" onClick={() => setMode("login")}>
                Use password instead
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
