import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { FastingRouteGuard } from "./components/FastingRouteGuard";
import { ImpersonationProvider } from "./hooks/useImpersonation";
import { lazyRetry } from "./lib/lazyRetry";

const Dashboard = lazyRetry(() => import("./pages/Dashboard"), "Dashboard");
const TrainerDashboard = lazyRetry(() => import("./pages/TrainerDashboard"), "TrainerDashboard");
const Workouts = lazyRetry(() => import("./pages/Workouts"), "Workouts");
const WorkoutDetail = lazyRetry(() => import("./pages/WorkoutDetail"), "WorkoutDetail");
const CreateWorkout = lazyRetry(() => import("./pages/CreateWorkout"), "CreateWorkout");
const EditWorkout = lazyRetry(() => import("./pages/EditWorkout"), "EditWorkout");
const WorkoutTemplates = lazyRetry(() => import("./pages/WorkoutTemplates"), "WorkoutTemplates");
const Exercises = lazyRetry(() => import("./pages/Exercises"), "Exercises");
const Clients = lazyRetry(() => import("./pages/Clients"), "Clients");
const Messages = lazyRetry(() => import("./pages/Messages"), "Messages");
const Analytics = lazyRetry(() => import("./pages/Analytics"), "Analytics");
const Goals = lazyRetry(() => import("./pages/Goals"), "Goals");
const TaskLibrary = lazyRetry(() => import("./pages/TaskLibrary"), "TaskLibrary");
const Auth = lazyRetry(() => import("./pages/Auth"), "Auth");
const Unsubscribe = lazyRetry(() => import("./pages/Unsubscribe"), "Unsubscribe");
const PortalMockup = lazyRetry(() => import("./pages/PortalMockup"), "PortalMockup");
import ClientDashboard from "./pages/client/ClientDashboardMinimal";
const ClientRingsDemo = lazyRetry(() => import("./pages/client/ClientRingsDemo"), "ClientRingsDemo");
const ClientSmartPace = lazyRetry(() => import("./pages/client/ClientSmartPace"), "ClientSmartPace");
const SmartPacePreview = lazyRetry(() => import("./pages/SmartPacePreview"), "SmartPacePreview");
const ClientDailyScore = lazyRetry(() => import("./pages/client/ClientDailyScore"), "ClientDailyScore");
const ClientOnboarding = lazyRetry(() => import("./pages/client/ClientOnboarding"), "ClientOnboarding");
const ResourceLibrary = lazyRetry(() => import("./pages/ResourceLibrary"), "ResourceLibrary");
const ResourceCollections = lazyRetry(() => import("./pages/ResourceCollections"), "ResourceCollections");
const ResourceCollectionDetail = lazyRetry(() => import("./pages/ResourceCollectionDetail"), "ResourceCollectionDetail");
const OndemandWorkouts = lazyRetry(() => import("./pages/OndemandWorkouts"), "OndemandWorkouts");
const WorkoutCollections = lazyRetry(() => import("./pages/WorkoutCollections"), "WorkoutCollections");
const WorkoutCollectionDetail = lazyRetry(() => import("./pages/WorkoutCollectionDetail"), "WorkoutCollectionDetail");
const WorkoutLabels = lazyRetry(() => import("./pages/WorkoutLabels"), "WorkoutLabels");
const StudioPrograms = lazyRetry(() => import("./pages/StudioPrograms"), "StudioPrograms");
const Programs = lazyRetry(() => import("./pages/Programs"), "Programs");
const Recipes = lazyRetry(() => import("./pages/Recipes"), "Recipes");
const RecipeDetail = lazyRetry(() => import("./pages/RecipeDetail"), "RecipeDetail");
const RecipeBooks = lazyRetry(() => import("./pages/RecipeBooks"), "RecipeBooks");
const RecipeBookDetail = lazyRetry(() => import("./pages/RecipeBookDetail"), "RecipeBookDetail");
const MealPlans = lazyRetry(() => import("./pages/MealPlans"), "MealPlans");
const MealPlanDetail = lazyRetry(() => import("./pages/MealPlanDetail"), "MealPlanDetail");
const MacroCalculator = lazyRetry(() => import("./pages/MacroCalculator"), "MacroCalculator");
const MacroTracking = lazyRetry(() => import("./pages/MacroTracking"), "MacroTracking");
const TrainerClientHealth = lazyRetry(() => import("./pages/TrainerClientHealth"), "TrainerClientHealth");
const ClientsHealth = lazyRetry(() => import("./pages/ClientsHealth"), "ClientsHealth");
const NotFound = lazyRetry(() => import("./pages/NotFound"), "NotFound");
const ClientHealth = lazyRetry(() => import("./pages/client/ClientHealth"), "ClientHealth");
const ClientProfile = lazyRetry(() => import("./pages/client/ClientProfile"), "ClientProfile");
const ClientStagesTimeline = lazyRetry(() => import("./pages/client/ClientStagesTimeline"), "ClientStagesTimeline");
const ClientPrograms = lazyRetry(() => import("./pages/client/ClientPrograms"), "ClientPrograms");
const ClientChooseProtocol = lazyRetry(() => import("./pages/client/ClientChooseProtocol"), "ClientChooseProtocol");
const ClientQuickPlans = lazyRetry(() => import("./pages/client/ClientQuickPlans"), "ClientQuickPlans");
const ClientQuickPlanDetail = lazyRetry(() => import("./pages/client/ClientQuickPlanDetail"), "ClientQuickPlanDetail");
const ClientProtocolCardDemo = lazyRetry(() => import("./pages/client/ClientProtocolCardDemo"), "ClientProtocolCardDemo");
const ClientKetoTypeCardDemo = lazyRetry(() => import("./pages/client/ClientKetoTypeCardDemo"), "ClientKetoTypeCardDemo");
const ClientFastingPlansPreview = lazyRetry(() => import("./pages/client/ClientFastingPlansPreview"), "ClientFastingPlansPreview");
const WindowsCardDemo = lazyRetry(() => import("./pages/client/WindowsCardDemo"), "WindowsCardDemo");
const ClientFastingPlanDetailPreview = lazyRetry(() => import("./pages/client/ClientFastingPlanDetailPreview"), "ClientFastingPlanDetailPreview");
const ProtocolStylesPreview = lazyRetry(() => import("./pages/preview/ProtocolStylesPreview"), "ProtocolStylesPreview");
const ClientFastComplete = lazyRetry(() => import("./pages/client/ClientFastComplete"), "ClientFastComplete");
const ClientWorkoutHistory = lazyRetry(() => import("./pages/ClientWorkoutHistory"), "ClientWorkoutHistory");
const AllClientWorkouts = lazyRetry(() => import("./pages/AllClientWorkouts"), "AllClientWorkouts");
const ClientCommandCenter = lazyRetry(() => import("./pages/ClientCommandCenter"), "ClientCommandCenter");
const Scheduling = lazyRetry(() => import("./pages/Scheduling"), "Scheduling");
const TrainerSettings = lazyRetry(() => import("./pages/TrainerSettings"), "TrainerSettings");
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"), "PrivacyPolicy");
const GuardianSummary = lazyRetry(() => import("./pages/GuardianSummary"), "GuardianSummary");
const StudioProgramDetail = lazyRetry(() => import("./pages/StudioProgramDetail"), "StudioProgramDetail");
const KetoTypesManager = lazyRetry(() => import("./pages/KetoTypesManager"), "KetoTypesManager");
const ClientKetoTypes = lazyRetry(() => import("./pages/client/ClientKetoTypes"), "ClientKetoTypes");
const ClientKetoTypeDetail = lazyRetry(() => import("./pages/client/ClientKetoTypeDetail"), "ClientKetoTypeDetail");
const CardStylesPreview = lazyRetry(() => import("./pages/client/CardStylesPreview"), "CardStylesPreview");
const NotificationCenter = lazyRetry(() => import("./pages/NotificationCenter"), "NotificationCenter");
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"), "ResetPassword");
const CheckoutTest = lazyRetry(() => import("./pages/CheckoutTest"), "CheckoutTest");
const SynergyCardDemo = lazyRetry(() => import("./pages/SynergyCardDemo"), "SynergyCardDemo");

const queryClient = new QueryClient();

const RouteLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <ImpersonationProvider>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/guardian/:token" element={<GuardianSummary />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/checkout-test" element={<CheckoutTest />} />
              <Route path="/portal-mockup" element={<PortalMockup />} />
              <Route path="/synergy-card-demo" element={<SynergyCardDemo />} />
              <Route path="/client/rings-demo" element={<ClientRingsDemo />} />

              <Route path="/" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerDashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["trainer"]}><Dashboard /></ProtectedRoute>} />
              <Route path="/workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><Workouts /></ProtectedRoute>} />
              <Route path="/workouts/create" element={<ProtectedRoute allowedRoles={["trainer"]}><CreateWorkout /></ProtectedRoute>} />
              <Route path="/workouts/edit/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><EditWorkout /></ProtectedRoute>} />
              <Route path="/workouts/:id" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutDetail /></ProtectedRoute>} />
              <Route path="/workout-templates" element={<ProtectedRoute allowedRoles={["trainer"]}><WorkoutTemplates /></ProtectedRoute>} />
              <Route path="/exercises" element={<ProtectedRoute allowedRoles={["trainer"]}><Exercises /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute allowedRoles={["trainer"]}><Clients /></ProtectedRoute>} />
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
              <Route path="/clients/:clientId/health" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerClientHealth /></ProtectedRoute>} />
              <Route path="/clients/:clientId" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientCommandCenter /></ProtectedRoute>} />
              <Route path="/clients/:clientId/workout-history" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientWorkoutHistory /></ProtectedRoute>} />
              <Route path="/client-workouts" element={<ProtectedRoute allowedRoles={["trainer"]}><AllClientWorkouts /></ProtectedRoute>} />
              <Route path="/clients-health" element={<ProtectedRoute allowedRoles={["trainer"]}><ClientsHealth /></ProtectedRoute>} />
              <Route path="/scheduling" element={<ProtectedRoute allowedRoles={["trainer"]}><Scheduling /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["trainer"]}><TrainerSettings /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute allowedRoles={["trainer"]}><NotificationCenter /></ProtectedRoute>} />

              <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={["client"]}><ClientDashboard /></ProtectedRoute>} />
              <Route path="/client/pace" element={<ProtectedRoute allowedRoles={["client"]}><ClientSmartPace /></ProtectedRoute>} />
              <Route path="/dev/pace-preview" element={<SmartPacePreview />} />
              <Route path="/client/daily-score" element={<ProtectedRoute allowedRoles={["client"]}><ClientDailyScore /></ProtectedRoute>} />
              <Route path="/client/coaching" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/client/profile" element={<ProtectedRoute allowedRoles={["client"]}><ClientProfile /></ProtectedRoute>} />
              <Route path="/client/stages" element={<ProtectedRoute allowedRoles={["client"]}><ClientStagesTimeline /></ProtectedRoute>} />
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
              <Route path="/client/begin-reset" element={<ProtectedRoute allowedRoles={["client"]}><ClientFastingPlansPreview /></ProtectedRoute>} />
              <Route path="/client/quick-plans" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientQuickPlans /></FastingRouteGuard></ProtectedRoute>} />
              <Route path="/client/quick-plan/:id" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientQuickPlanDetail /></FastingRouteGuard></ProtectedRoute>} />
              <Route path="/client/protocol/:id" element={<Navigate to="/client/complete-plan" replace />} />
              <Route path="/client/complete-plan" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientFastingPlanDetailPreview /></ProtectedRoute>} />
              <Route path="/client/protocol-card-demo" element={<ProtectedRoute allowedRoles={["client"]}><ClientProtocolCardDemo /></ProtectedRoute>} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ImpersonationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
