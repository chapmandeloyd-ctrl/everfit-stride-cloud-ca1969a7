import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecoveryState = async () => {
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        setIsRecovery(true);
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsRecovery(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || !!session) {
        setIsRecovery(true);
      }
    });

    void checkRecoveryState();

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/auth");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">KSOM-360</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecovery ? "Set your new password" : "Open your email reset link to continue"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Input 
              type="password" 
              placeholder="New password (min 6 chars)" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={!isRecovery || loading}
            />
            <Input 
              type="password" 
              placeholder="Confirm new password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              disabled={!isRecovery || loading}
            />
            <Button type="submit" className="w-full" disabled={!isRecovery || loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
