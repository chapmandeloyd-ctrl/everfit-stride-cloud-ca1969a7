import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ClientLayout } from "@/components/ClientLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TrainerDashboard from "./pages/trainer/TrainerDashboard";
import ClientDashboard from "./pages/client/ClientDashboard";
import PlansPage from "./pages/client/PlansPage";
import OnDemandPage from "./pages/client/OnDemandPage";
import ProgressPage from "./pages/client/ProgressPage";
import ProfilePage from "./pages/client/ProfilePage";
import Placeholder from "./pages/Placeholder";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, profile, loading, signOut, isTrainer } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Trainer routes with sidebar layout
  if (isTrainer) {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<AppLayout profile={profile} onSignOut={signOut} />}>
          <Route path="/" element={<TrainerDashboard />} />
          <Route path="/clients" element={<Placeholder />} />
          <Route path="/clients/:id" element={<Placeholder />} />
          <Route path="/workouts" element={<Placeholder />} />
          <Route path="/programs" element={<Placeholder />} />
          <Route path="/exercises" element={<Placeholder />} />
          <Route path="/meal-plans" element={<Placeholder />} />
          <Route path="/nutrition" element={<Placeholder />} />
          <Route path="/messages" element={<Placeholder />} />
          <Route path="/resources" element={<Placeholder />} />
          <Route path="/analytics" element={<Placeholder />} />
          <Route path="/settings" element={<Placeholder />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Client routes with bottom tab layout
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<ClientLayout profile={profile} onSignOut={signOut} />}>
        <Route path="/" element={<ClientDashboard />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/on-demand" element={<OnDemandPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/workouts" element={<Placeholder />} />
        <Route path="/nutrition" element={<Placeholder />} />
        <Route path="/recovery" element={<Placeholder />} />
        <Route path="/breathing" element={<Placeholder />} />
        <Route path="/messages" element={<Placeholder />} />
        <Route path="/settings" element={<Placeholder />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
