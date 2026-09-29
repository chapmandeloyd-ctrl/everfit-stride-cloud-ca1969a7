import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { startAuthTransition } from "@/components/AuthTransitionOverlay";

export default function Auth() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [searchParams] = useSearchParams();
  // Preserve a same-origin relative `next` so OAuth-consent flows return home.
  const rawNext = searchParams.get("next") || "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const goPostAuth = (fallback: string) => {
    startAuthTransition();
    navigate(nextPath || fallback, { replace: true });
  };
  const [isLoading, setIsLoading] = useState(false);
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    // If the profile row can't be read, still let the user in rather than
    // stranding them on a spinning sign-in screen.
    if (!profile) {
      goPostAuth("/");
      return;
    }

    if (profile.role === "client") {
      goPostAuth(!profile.onboarding_completed ? "/client/onboarding" : "/client/dashboard");
    } else {
      goPostAuth("/");
    }
  }, [loading, user, profile]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });
      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", data.user.id)
          .single();

        toast.success("Signed in successfully!");
        if (profile?.role === "client") {
          goPostAuth(!profile.onboarding_completed ? "/client/onboarding" : "/client/dashboard");
        } else {
          goPostAuth("/");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    if (!signInData.email) {
      toast.error("Please enter your email address first");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(signInData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Branding */}
        <div className="text-center mb-8">
          <img
            src="/apexbeast-logo.png"
            alt="APEXBEAST-IF"
            className="h-24 w-24 object-contain mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">APEXBEAST-IF</h1>
          <p className="text-muted-foreground mt-1 text-sm">APEXBEAST-IF Fitness Coaching Platform</p>
          <p className="text-foreground text-xs font-semibold tracking-wider mt-2 uppercase">
            YOU ARE{" "}
            <span className="relative inline-block px-0.5">
              WHAT
              <span className="absolute left-[-2px] right-[-2px] top-1/2 -translate-y-1/2 h-[3px] bg-destructive rounded-full rotate-[-3deg]" />
            </span>{" "}
            <span className="text-primary">WHEN</span> YOU EAT
          </p>



        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome</h2>
            <p className="text-muted-foreground text-sm mt-0.5">Sign in to your account</p>
          </div>

          {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    className="pr-10 rounded-xl h-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                      : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                onClick={handleForgotPassword}
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </form>
        </div>
      </div>
    </div>
  );
}
