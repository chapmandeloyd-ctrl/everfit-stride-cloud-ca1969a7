import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import AuthTransitionOverlay from "./components/AuthTransitionOverlay";

// Wrap React.lazy so a failed chunk import (stale hash after redeploy)
// triggers a one-time hard reload instead of a permanent white screen.
const lazyWithReload = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(() =>
    factory().catch((err) => {
      const msg = String(err?.message || err);
      const isChunkError =
        /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|error loading dynamically imported module/i.test(
          msg
        );
      if (isChunkError && typeof window !== "undefined") {
        const key = "__lovable_chunk_reload__";
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
        }
      }
      throw err;
    })
  );

const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const TrainerDashboard = lazyWithReload(() => import("./pages/TrainerDashboard"));
const Workouts = lazyWithReload(() => import("./pages/Workouts"));
const WorkoutDetail = lazyWithReload(() => import("./pages/WorkoutDetail"));
const CreateWorkout = lazyWithReload(() => import("./pages/CreateWorkout"));
const EditWorkout = lazyWithReload(() => import("./pages/EditWorkout"));
const WorkoutTemplates = lazyWithReload(() => import("./pages/WorkoutTemplates"));
const Exercises = lazyWithReload(() => import("./pages/Exercises"));
const Clients = lazyWithReload(() => import("./pages/Clients"));
const Messages = lazyWithReload(() => import("./pages/Messages"));
const Analytics = lazyWithReload(() => import("./pages/Analytics"));
const Goals = lazyWithReload(() => import("./pages/Goals"));
const TaskLibrary = lazyWithReload(() => import("./pages/TaskLibrary"));
const AdminDataConsole = lazyWithReload(() => import("./pages/AdminDataConsole"));
const Auth = lazyWithReload(() => import("./pages/Auth"));
const OAuthConsent = lazyWithReload(() => import("./pages/OAuthConsent"));
const Unsubscribe = lazyWithReload(() => import("./pages/Unsubscribe"));
const PortalMockup = lazyWithReload(() => import("./pages/PortalMockup"));
const ClientDashboard = lazyWithReload(() => import("./pages/client/ClientDashboardMinimal"));
const ClientRingsDemo = lazyWithReload(() => import("./pages/client/ClientRingsDemo"));
const TimerLionTest = lazyWithReload(() => import("./components/debug/TimerLionTest"));
const ClientSmartPace = lazyWithReload(() => import("./pages/client/ClientSmartPace"));
const SmartPacePreview = lazyWithReload(() => import("./pages/SmartPacePreview"));
const ClientDailyScore = lazyWithReload(() => import("./pages/client/ClientDailyScore"));
const ClientOnboarding = lazyWithReload(() => import("./pages/client/ClientOnboarding"));
const ClientResourceCollectionDetail = lazyWithReload(() => import("./pages/client/ClientResourceCollectionDetail"));
const ResourceLibrary = lazyWithReload(() => import("./pages/ResourceLibrary"));
const ResourceCollections = lazyWithReload(() => import("./pages/ResourceCollections"));
const ResourceCollectionDetail = lazyWithReload(() => import("./pages/ResourceCollectionDetail"));
const OndemandWorkouts = lazyWithReload(() => import("./pages/OndemandWorkouts"));
const WorkoutCollections = lazyWithReload(() => import("./pages/WorkoutCollections"));
const WorkoutCollectionDetail = lazyWithReload(() => import("./pages/WorkoutCollectionDetail"));
const WorkoutLabels = lazyWithReload(() => import("./pages/WorkoutLabels"));
const StudioPrograms = lazyWithReload(() => import("./pages/StudioPrograms"));
const Programs = lazyWithReload(() => import("./pages/Programs"));
const Recipes = lazyWithReload(() => import("./pages/Recipes"));
const RecipeDetail = lazyWithReload(() => import("./pages/RecipeDetail"));
const RecipeBooks = lazyWithReload(() => import("./pages/RecipeBooks"));
const RecipeBookDetail = lazyWithReload(() => import("./pages/RecipeBookDetail"));
const MealPlans = lazyWithReload(() => import("./pages/MealPlans"));
const MealPlanDetail = lazyWithReload(() => import("./pages/MealPlanDetail"));
const MacroCalculator = lazyWithReload(() => import("./pages/MacroCalculator"));
const MacroTracking = lazyWithReload(() => import("./pages/MacroTracking"));
const TrainerClientHealth = lazyWithReload(() => import("./pages/TrainerClientHealth"));
const ClientsHealth = lazyWithReload(() => import("./pages/ClientsHealth"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));
const ClientHealth = lazyWithReload(() => import("./pages/client/ClientHealth"));
const ClientTimeline = lazyWithReload(() => import("./pages/client/ClientTimeline"));
const ClientPlanHistory = lazyWithReload(() => import("./pages/client/ClientPlanHistory"));
const ClientProfile = lazyWithReload(() => import("./pages/client/ClientProfile"));
const ClientStagesTimeline = lazyWithReload(() => import("./pages/client/ClientStagesTimeline"));
const ClientExplore = lazyWithReload(() => import("./pages/client/ClientExplore"));
const ClientExploreContent = lazyWithReload(() => import("./pages/client/ClientExploreContent"));
const ClientExploreChallenge = lazyWithReload(() => import("./pages/client/ClientExploreChallenge"));
const ExploreStylePreview = lazyWithReload(() => import("./pages/client/ExploreStylePreview"));
const ClientPrograms = lazyWithReload(() => import("./pages/client/ClientPrograms"));
const ClientChooseProtocol = lazyWithReload(() => import("./pages/client/ClientChooseProtocol"));
const ClientCustomPlans = lazyWithReload(() => import("./pages/client/ClientCustomPlans"));
const ClientQuickPlans = lazyWithReload(() => import("./pages/client/ClientQuickPlans"));
const ClientQuickPlanDetail = lazyWithReload(() => import("./pages/client/ClientQuickPlanDetail"));
const ClientProtocolDetail = lazyWithReload(() => import("./pages/client/ClientProtocolDetail"));
const ClientProtocolCardDemo = lazyWithReload(() => import("./pages/client/ClientProtocolCardDemo"));
const ClientKetoTypeCardDemo = lazyWithReload(() => import("./pages/client/ClientKetoTypeCardDemo"));
const ClientFastingPlansPreview = lazyWithReload(() => import("./pages/client/ClientFastingPlansPreview"));
const WindowsCardDemo = lazyWithReload(() => import("./pages/client/WindowsCardDemo"));
const ClientFastingPlanDetailPreview = lazyWithReload(() => import("./pages/client/ClientFastingPlanDetailPreview"));
const ClientProgram = lazyWithReload(() => import("./pages/client/ClientProgram"));
const ProtocolStylesPreview = lazyWithReload(() => import("./pages/preview/ProtocolStylesPreview"));
const ClientFastComplete = lazyWithReload(() => import("./pages/client/ClientFastComplete"));
const ClientWorkoutHistory = lazyWithReload(() => import("./pages/ClientWorkoutHistory"));
const AllClientWorkouts = lazyWithReload(() => import("./pages/AllClientWorkouts"));
const ClientCommandCenter = lazyWithReload(() => import("./pages/ClientCommandCenter"));
const Scheduling = lazyWithReload(() => import("./pages/Scheduling"));
const TrainerSettings = lazyWithReload(() => import("./pages/TrainerSettings"));
const TrainerExploreManager = lazyWithReload(() => import("./pages/TrainerExploreManager"));
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FastingRouteGuard } from "./components/FastingRouteGuard";
import { ImpersonationProvider } from "./hooks/useImpersonation";
import { AuthProvider } from "./hooks/useAuth";
const PrivacyPolicy = lazyWithReload(() => import("./pages/PrivacyPolicy"));
const GuardianSummary = lazyWithReload(() => import("./pages/GuardianSummary"));
const StudioProgramDetail = lazyWithReload(() => import("./pages/StudioProgramDetail"));
const KetoTypesManager = lazyWithReload(() => import("./pages/KetoTypesManager"));
const ClientKetoTypes = lazyWithReload(() => import("./pages/client/ClientKetoTypes"));
const ClientKetoTypeDetail = lazyWithReload(() => import("./pages/client/ClientKetoTypeDetail"));
const CardStylesPreview = lazyWithReload(() => import("./pages/client/CardStylesPreview"));
const NotificationCenter = lazyWithReload(() => import("./pages/NotificationCenter"));
const ResetPassword = lazyWithReload(() => import("./pages/ResetPassword"));
const CheckoutTest = lazyWithReload(() => import("./pages/CheckoutTest"));
const SynergyCardDemo = lazyWithReload(() => import("./pages/SynergyCardDemo"));
const StepTrackerPreview = lazyWithReload(() => import("./pages/StepTrackerPreview"));

const queryClient = new QueryClient();

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
        <ImpersonationProvider>
        <AuthTransitionOverlay />
        <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/guardian/:token" element={<GuardianSummary />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/checkout-test" element={<CheckoutTest />} />
          <Route path="/portal-mockup" element={<PortalMockup />} />
          <Route path="/synergy-card-demo" element={<SynergyCardDemo />} />
          <Route path="/client/rings-demo" element={<ClientRingsDemo />} />
          <Route path="/preview/step-tracker" element={<StepTrackerPreview />} />
          
          {/* Trainer Routes */}
          <Route path="/" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["trainer"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><Workouts /></ProtectedRoute>} />
          <Route path="/workouts/create" element={<ProtectedRoute allowedRoles={["trainer"]}><CreateWorkout /></ProtectedRoute>} />
          <Route path="/workouts/edit/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><EditWorkout /></ProtectedRoute>} />
          <Route path="/workouts/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutDetail /></ProtectedRoute>} />
          <Route path="/workout-templates" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutTemplates /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute allowedRoles={["trainer"]}><Exercises /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute allowedRoles={["trainer"]}><Clients /></ProtectedRoute>} />
          <Route path="/admin/data" element={<ProtectedRoute allowedRoles={["trainer"]}><AdminDataConsole /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute allowedRoles={["trainer"]}><Messages /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allowedRoles={["trainer"]}><Analytics /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute allowedRoles={["trainer"]}><Goals /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute allowedRoles={["trainer"]}><TaskLibrary /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute allowedRoles={["trainer"]}><ResourceLibrary /></ProtectedRoute>} />
          <Route path="/resource-collections" element={<ProtectedRoute allowedRoles={["trainer"]}><ResourceCollections /></ProtectedRoute>} />
          <Route path="/resource-collections/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><ResourceCollectionDetail /></ProtectedRoute>} />
          <Route path="/ondemand-workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><OndemandWorkouts /></ProtectedRoute>} />
          <Route path="/workout-collections" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutCollections /></ProtectedRoute>} />
          <Route path="/workout-collections/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutCollectionDetail /></ProtectedRoute>} />
          <Route path="/workout-labels" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutLabels /></ProtectedRoute>} />
          <Route path="/studio-programs" element={<ProtectedRoute allowedRoles={["trainer"]}><StudioPrograms /></ProtectedRoute>} />
          <Route path="/studio-programs/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><StudioProgramDetail /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute allowedRoles={["trainer"]}><Programs /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute allowedRoles={["trainer"]}><Recipes /></ProtectedRoute>} />
          <Route path="/recipes/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><RecipeDetail /></ProtectedRoute>} />
          <Route path="/recipe-books" element={<ProtectedRoute allowedRoles={["trainer"]}><RecipeBooks /></ProtectedRoute>} />
          <Route path="/recipe-books/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><RecipeBookDetail /></ProtectedRoute>} />
          <Route path="/meal-plans" element={<ProtectedRoute allowedRoles={["trainer"]}><MealPlans /></ProtectedRoute>} />
          <Route path="/meal-plans/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><MealPlanDetail /></ProtectedRoute>} />
          <Route path="/macro-calculator" element={<ProtectedRoute allowedRoles={["trainer"]}><MacroCalculator /></ProtectedRoute>} />
          <Route path="/macro-tracking" element={<ProtectedRoute allowedRoles={["trainer"]}><MacroTracking /></ProtectedRoute>} />
          <Route path="/keto-types" element={<ProtectedRoute allowedRoles={["trainer"]}><KetoTypesManager /></ProtectedRoute>} />
          <Route path="/explore-manager" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerExploreManager /></ProtectedRoute>} />
          <Route path="/clients/:clientId/health" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerClientHealth /></ProtectedRoute>} />
          <Route path="/clients/:clientId" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientCommandCenter /></ProtectedRoute>} />
          <Route path="/clients/:clientId/workout-history" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientWorkoutHistory /></ProtectedRoute>} />
          <Route path="/client-workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><AllClientWorkouts /></ProtectedRoute>} />
          <Route path="/clients-health" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientsHealth /></ProtectedRoute>} />
          <Route path="/scheduling" element={<ProtectedRoute allowedRoles={["trainer"]}><Scheduling /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerSettings /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute allowedRoles={["trainer"]}><NotificationCenter /></ProtectedRoute>} />
          
          {/* Client Routes */}
          <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={["client"]}><ClientDashboard /></ProtectedRoute>} />
          <Route path="/client/timeline" element={<ProtectedRoute allowedRoles={["client"]}><ClientTimeline /></ProtectedRoute>} />
          <Route path="/client/plan-history" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientPlanHistory /></ProtectedRoute>} />
          <Route path="/client/pace" element={<ProtectedRoute allowedRoles={["client"]}><ClientSmartPace /></ProtectedRoute>} />
          <Route path="/dev/pace-preview" element={<SmartPacePreview />} />
          <Route path="/client/daily-score" element={<ProtectedRoute allowedRoles={["client"]}><ClientDailyScore /></ProtectedRoute>} />
          <Route path="/client/coaching" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/profile" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientProfile /></ProtectedRoute>} />
          <Route path="/client/stages" element={<ProtectedRoute allowedRoles={["client"]}><ClientStagesTimeline /></ProtectedRoute>} />
          <Route path="/client/explore" element={<ProtectedRoute allowedRoles={["client"]}><ClientExplore /></ProtectedRoute>} />
          <Route path="/client/explore/content/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientExploreContent /></ProtectedRoute>} />
          <Route path="/client/explore/challenge/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientExploreChallenge /></ProtectedRoute>} />
          <Route path="/client/explore/style-preview" element={<ProtectedRoute allowedRoles={["client"]}><ExploreStylePreview /></ProtectedRoute>} />
          <Route path="/client/onboarding" element={<ProtectedRoute allowedRoles={["client"]}><ClientOnboarding /></ProtectedRoute>} />
          <Route path="/client/workouts" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/progress" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/meal-plan" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/meal-select" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/meal-results" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/grocery" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/nutrition" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/nutrition-dashboard" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/calendar" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/settings" element={<Navigate to="/client/profile?tab=settings" replace />} />
          <Route path="/client/goals" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/tasks" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/tasks/:taskId" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/resource-hub" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/workout-hub" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/on-demand" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/resource-collection/:id" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/health" element={<ProtectedRoute allowedRoles={["client"]}><ClientHealth /></ProtectedRoute>} />
          <Route path="/client/health-connect" element={<Navigate to="/client/health" replace />} />
          <Route path="/client/health-reminders" element={<Navigate to="/client/health" replace />} />
          <Route path="/client/badges" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/habits" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/habits/:id" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/macro-setup" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/log-meal" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/recipes/:id" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/keto-types" element={<ProtectedRoute allowedRoles={["client"]}><ClientKetoTypes /></ProtectedRoute>} />
          <Route path="/client/keto-types/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientKetoTypeDetail /></ProtectedRoute>} />
          <Route path="/client/card-styles" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><CardStylesPreview /></ProtectedRoute>} />
          <Route path="/client/workouts/:id" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/workout-session/:sessionId" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/messages" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/booking" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/appointments" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/sports" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/cardio-player" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/wod-builder" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/my-workouts" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/programs" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientPrograms /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/choose-protocol" element={<ProtectedRoute allowedRoles={["client"]}><ClientChooseProtocol /></ProtectedRoute>} />
          <Route path="/client/custom-plans" element={<ProtectedRoute allowedRoles={["client"]}><ClientCustomPlans /></ProtectedRoute>} />
          <Route path="/client/begin-reset" element={<ProtectedRoute allowedRoles={["client"]}><ClientFastingPlansPreview /></ProtectedRoute>} />
          <Route path="/client/quick-plans" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientQuickPlans /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/quick-plan/:id" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientQuickPlanDetail /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/protocol/:id" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientProtocolDetail /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/program" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientProgram /></ProtectedRoute>} />
          {/* Legacy gold combined view kept as a backup, redirected to the new dark Program page. */}
          <Route path="/client/complete-plan" element={<Navigate to="/client/program" replace />} />
          <Route path="/client/protocol-card-demo" element={<ProtectedRoute allowedRoles={["client"]}><ClientProtocolCardDemo /></ProtectedRoute>} />
          {/* Trainer-accessible alias for previewing the protocol card demo without impersonation */}
          <Route path="/protocol-card-demo" element={<ClientProtocolCardDemo />} />
          <Route path="/client/keto-type-card-demo" element={<ProtectedRoute allowedRoles={["client"]}><ClientKetoTypeCardDemo /></ProtectedRoute>} />
          <Route path="/keto-type-card-demo" element={<ClientKetoTypeCardDemo />} />
          <Route path="/client/fasting-plans-preview" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientFastingPlansPreview /></ProtectedRoute>} />
          <Route path="/fasting-plans-preview" element={<ClientFastingPlansPreview />} />
          <Route path="/client/fasting-plan-detail-preview" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientFastingPlanDetailPreview /></ProtectedRoute>} />
          <Route path="/fasting-plan-detail-preview" element={<ClientFastingPlanDetailPreview />} />
          <Route path="/preview/protocol-styles" element={<ProtocolStylesPreview />} />
          <Route path="/windows-card-demo" element={<WindowsCardDemo />} />
          <Route path="/client/fast-complete" element={<ProtectedRoute allowedRoles={["client"]}><ClientFastComplete /></ProtectedRoute>} />
          <Route path="/client/vibes" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/labs" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/labs/diamond" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/labs/diamond/session" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/labs/hoops" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/client/labs/hoops/session" element={<Navigate to="/client/dashboard" replace />} />
          
          <Route path="/vibes-admin" element={<Navigate to="/settings" replace />} />
          <Route path="/client/portal" element={<Navigate to="/client/dashboard" replace />} />
          <Route path="/portal-admin" element={<Navigate to="/settings" replace />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
