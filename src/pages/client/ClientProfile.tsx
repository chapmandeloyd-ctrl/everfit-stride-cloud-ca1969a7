import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Settings, Clock, Star, Bookmark, Dumbbell, Play, Upload, Trash2, Info } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useSavedWorkouts } from "@/hooks/useSavedWorkouts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettings } from "@/components/NotificationSettings";
import { NudgeSettings } from "@/components/NudgeSettings";
import { ClientRemindersSection } from "@/components/ClientRemindersSection";
import { HabitLoopSettings } from "@/components/notifications/HabitLoopSettings";
import { useState } from "react";
import { toast } from "sonner";

export default function ClientProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signOut, userRole, user } = useAuth();
  const clientId = useEffectiveClientId();
  const isImpersonating = userRole === "trainer";
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const activeTab = searchParams.get("tab") === "settings" ? "settings" : "profile";

  const { data: profile } = useQuery({
    queryKey: ["profile", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: fastingData } = useQuery({
    queryKey: ["fasting-profile-data", clientId],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("selected_quick_plan_id, selected_protocol_id, last_fast_completed_at")
        .eq("client_id", clientId)
        .maybeSingle();
      if (!settings) return { saved: null, lastUsedAt: null };

      let saved: { name: string; type: "quick" | "protocol"; fast_hours?: number; eat_hours?: number } | null = null;

      if (settings.selected_quick_plan_id) {
        const { data } = await supabase
          .from("quick_fasting_plans")
          .select("name, fast_hours, eat_hours")
          .eq("id", settings.selected_quick_plan_id)
          .maybeSingle();
        if (data) saved = { ...data, type: "quick" };
      } else if (settings.selected_protocol_id) {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name")
          .eq("id", settings.selected_protocol_id)
          .maybeSingle();
        if (data) saved = { ...data, type: "protocol" };
      }

      return {
        saved,
        lastUsedAt: settings.last_fast_completed_at,
      };
    },
    enabled: !!clientId,
  });

  const menuItems = [
    { label: "My Workouts", to: "/client/my-workouts" },
    { label: "Sports Profile", to: "/client/sports" },
    { label: "Activity history", to: "/client/workouts" },
    { label: "Your exercises", to: "/client/workouts" },
    { label: "Progress photos", to: "/client/progress" },
    { label: "Recipe Collections", to: "/client/meal-plan" },
    { label: "Badges", to: "/client/badges" },
    { label: "Health", to: "/client/health" },
  ];

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
      }
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Avatar updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user?.id || !profile?.avatar_url) return;
    try {
      const oldPath = profile.avatar_url.split('/').pop();
      if (oldPath) await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Avatar removed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove avatar");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File size must be less than 5MB");
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file");
    uploadAvatar(file);
  };

  return (
    <ClientLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">You</h1>
            <p className="text-sm text-muted-foreground">Set your fitness goal <button className="text-primary">(add)</button></p>
          </div>
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clientId}`} />
              <AvatarFallback>{(profile?.full_name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-muted"
              onClick={() => setSearchParams({ tab: "settings" })}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams(v === "profile" ? {} : { tab: v })}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            {/* Stats */}
            <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Training min</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Streak days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fasting & menu section */}
        <div className="divide-y divide-border">

          {menuItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center justify-between w-full py-4 text-left"
              onClick={() => navigate(item.to)}
            >
              <span className="text-foreground">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        {!isImpersonating && (
          <button
            onClick={signOut}
            className="w-full text-center py-3 text-destructive font-medium"
          >
            Logout
          </button>
        )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a custom avatar for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                    <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input type="file" id="avatar-upload" className="hidden" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} disabled={isUploading} />
                    <Button onClick={() => document.getElementById("avatar-upload")?.click()} disabled={isUploading} size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                    {profile?.avatar_url && (
                      <Button variant="outline" size="sm" onClick={deleteAvatar} disabled={isUploading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Photo
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Max 5MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Workout Reminders</AlertTitle>
              <AlertDescription>
                Enable notifications to get reminded about your upcoming scheduled workouts.
              </AlertDescription>
            </Alert>

            <NotificationSettings />
            <HabitLoopSettings />
            <NudgeSettings />
            <ClientRemindersSection />
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}

function SavedWorkoutsSection() {
  const navigate = useNavigate();
  const { savedWorkouts, isLoading } = useSavedWorkouts();

  if (isLoading) return null;
  if (savedWorkouts.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        My Workouts
      </p>
      <div className="space-y-2">
        {savedWorkouts.map((sw: any) => {
          const plan = sw.workout_plans;
          return (
            <button
              key={sw.id}
              onClick={() => navigate(`/client/workouts/${sw.workout_plan_id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{plan?.name || "Workout"}</p>
                <p className="text-xs text-muted-foreground">
                  {plan?.duration_minutes && `${plan.duration_minutes} min`}
                  {plan?.duration_minutes && " · "}
                  Saved {format(new Date(sw.saved_at), "MMM d")}
                </p>
              </div>
              <Play className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
