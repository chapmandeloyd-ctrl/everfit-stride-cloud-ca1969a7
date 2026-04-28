import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { FastingRouteGuard } from "./components/FastingRouteGuard";
import { ImpersonationProvider } from "./hooks/useImpersonation";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const Workouts = lazy(() => import("./pages/Workouts"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));
const CreateWorkout = lazy(() => import("./pages/CreateWorkout"));
const EditWorkout = lazy(() => import("./pages/EditWorkout"));
const WorkoutTemplates = lazy(() => import("./pages/WorkoutTemplates"));
const Exercises = lazy(() => import("./pages/Exercises"));
const Clients = lazy(() => import("./pages/Clients"));
const Messages = lazy(() => import("./pages/Messages"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Goals = lazy(() => import("./pages/Goals"));
const TaskLibrary = lazy(() => import("./pages/TaskLibrary"));
const Auth = lazy(() => import("./pages/Auth"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PortalMockup = lazy(() => import("./pages/PortalMockup"));
const ClientDashboard = lazy(() => import("./pages/client/ClientDashboardMinimal"));
const ClientRingsDemo = lazy(() => import("./pages/client/ClientRingsDemo"));
const ClientSmartPace = lazy(() => import("./pages/client/ClientSmartPace"));
const SmartPacePreview = lazy(() => import("./pages/SmartPacePreview"));
const ClientDailyScore = lazy(() => import("./pages/client/ClientDailyScore"));
const ClientOnboarding = lazy(() => import("./pages/client/ClientOnboarding"));
const ClientWorkouts = lazy(() => import("./pages/client/ClientWorkouts"));
const ClientProgress = lazy(() => import("./pages/client/ClientProgress"));
const ClientNutrition = lazy(() => import("./pages/client/ClientNutrition"));
const ClientNutritionDashboard = lazy(() => import("./pages/client/ClientNutritionDashboard"));
const ClientCalendar = lazy(() => import("./pages/client/ClientCalendar"));
const ClientSettings = lazy(() => import("./pages/client/ClientSettings"));
const ClientTaskDetail = lazy(() => import("./pages/client/ClientTaskDetail"));
const ClientGoals = lazy(() => import("./pages/client/ClientGoals"));
const ClientTasks = lazy(() => import("./pages/client/ClientTasks"));
const ClientResourceHub = lazy(() => import("./pages/client/ClientResourceHub"));
const ClientWorkoutHub = lazy(() => import("./pages/client/ClientWorkoutHub"));
const ClientOnDemand = lazy(() => import("./pages/client/ClientOnDemand"));
const ClientResourceCollectionDetail = lazy(() => import("./pages/client/ClientResourceCollectionDetail"));
const ResourceLibrary = lazy(() => import("./pages/ResourceLibrary"));
const ResourceCollections = lazy(() => import("./pages/ResourceCollections"));
const ResourceCollectionDetail = lazy(() => import("./pages/ResourceCollectionDetail"));
const OndemandWorkouts = lazy(() => import("./pages/OndemandWorkouts"));
const WorkoutCollections = lazy(() => import("./pages/WorkoutCollections"));
const WorkoutCollectionDetail = lazy(() => import("./pages/WorkoutCollectionDetail"));
const WorkoutLabels = lazy(() => import("./pages/WorkoutLabels"));
const StudioPrograms = lazy(() => import("./pages/StudioPrograms"));
const Programs = lazy(() => import("./pages/Programs"));
const Recipes = lazy(() => import("./pages/Recipes"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const RecipeBooks = lazy(() => import("./pages/RecipeBooks"));
const RecipeBookDetail = lazy(() => import("./pages/RecipeBookDetail"));
const MealPlans = lazy(() => import("./pages/MealPlans"));
const MealPlanDetail = lazy(() => import("./pages/MealPlanDetail"));
const MacroCalculator = lazy(() => import("./pages/MacroCalculator"));
const MacroTracking = lazy(() => import("./pages/MacroTracking"));
const TrainerClientHealth = lazy(() => import("./pages/TrainerClientHealth"));
const ClientsHealth = lazy(() => import("./pages/ClientsHealth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ClientHealth = lazy(() => import("./pages/client/ClientHealth"));
const ClientHealthConnect = lazy(() => import("./pages/client/ClientHealthConnect"));
const ClientBadges = lazy(() => import("./pages/client/ClientBadges"));
const ClientMealPlan = lazy(() => import("./pages/client/ClientMealPlan"));
const ClientMealSelect = lazy(() => import("./pages/client/ClientMealSelect"));
const ClientHealthReminders = lazy(() => import("./pages/client/ClientHealthReminders"));
const ClientMealResults = lazy(() => import("./pages/client/ClientMealResults"));
const ClientHabits = lazy(() => import("./pages/client/ClientHabits"));
const ClientHabitDetail = lazy(() => import("./pages/client/ClientHabitDetail"));
const ClientMacroSetup = lazy(() => import("./pages/client/ClientMacroSetup"));
const ClientLogMeal = lazy(() => import("./pages/client/ClientLogMeal"));
const ClientCoaching = lazy(() => import("./pages/client/ClientCoaching"));
const ClientProfile = lazy(() => import("./pages/client/ClientProfile"));
const ClientStagesTimeline = lazy(() => import("./pages/client/ClientStagesTimeline"));
const ClientSportsProfile = lazy(() => import("./pages/client/ClientSportsProfile"));
const ClientBooking = lazy(() => import("./pages/client/ClientBooking"));
const ClientCardioPlayer = lazy(() => import("./pages/client/ClientCardioPlayer"));
const ClientWodBuilder = lazy(() => import("./pages/client/ClientWodBuilder"));
const ClientAppointments = lazy(() => import("./pages/client/ClientAppointments"));
const ClientRecipeDetail = lazy(() => import("./pages/client/ClientRecipeDetail"));
const ClientPrograms = lazy(() => import("./pages/client/ClientPrograms"));
const ClientChooseProtocol = lazy(() => import("./pages/client/ClientChooseProtocol"));
const ClientBeginReset = lazy(() => import("./pages/client/ClientBeginReset"));
const ClientQuickPlans = lazy(() => import("./pages/client/ClientQuickPlans"));
const ClientQuickPlanDetail = lazy(() => import("./pages/client/ClientQuickPlanDetail"));
const ClientProtocolDetail = lazy(() => import("./pages/client/ClientProtocolDetail"));
const ClientProtocolCardDemo = lazy(() => import("./pages/client/ClientProtocolCardDemo"));
const ClientKetoTypeCardDemo = lazy(() => import("./pages/client/ClientKetoTypeCardDemo"));
const ClientFastingPlansPreview = lazy(() => import("./pages/client/ClientFastingPlansPreview"));
const WindowsCardDemo = lazy(() => import("./pages/client/WindowsCardDemo"));
const ClientFastingPlanDetailPreview = lazy(() => import("./pages/client/ClientFastingPlanDetailPreview"));
const ProtocolStylesPreview = lazy(() => import("./pages/preview/ProtocolStylesPreview"));
const ClientFastComplete = lazy(() => import("./pages/client/ClientFastComplete"));
const ClientLabs = lazy(() => import("./pages/client/ClientLabs"));
const ClientDiamondLab = lazy(() => import("./pages/client/ClientDiamondLab"));
const ClientHoopsLab = lazy(() => import("./pages/client/ClientHoopsLab"));
const ClientBattingSession = lazy(() => import("./pages/client/ClientBattingSession"));
const ClientShootingSession = lazy(() => import("./pages/client/ClientShootingSession"));
const ClientWorkoutHistory = lazy(() => import("./pages/ClientWorkoutHistory"));
const ClientWorkoutSession = lazy(() => import("./pages/client/ClientWorkoutSession"));
const ClientMyWorkouts = lazy(() => import("./pages/client/ClientMyWorkouts"));
const AllClientWorkouts = lazy(() => import("./pages/AllClientWorkouts"));
const ClientCommandCenter = lazy(() => import("./pages/ClientCommandCenter"));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const TrainerSettings = lazy(() => import("./pages/TrainerSettings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const GuardianSummary = lazy(() => import("./pages/GuardianSummary"));
const StudioProgramDetail = lazy(() => import("./pages/StudioProgramDetail"));
const KetoTypesManager = lazy(() => import("./pages/KetoTypesManager"));
const ClientKetoTypes = lazy(() => import("./pages/client/ClientKetoTypes"));
const ClientKetoTypeDetail = lazy(() => import("./pages/client/ClientKetoTypeDetail"));
const ClientGroceryList = lazy(() => import("./pages/client/ClientGroceryList"));
const CardStylesPreview = lazy(() => import("./pages/client/CardStylesPreview"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CheckoutTest = lazy(() => import("./pages/CheckoutTest"));
const SynergyCardDemo = lazy(() => import("./pages/SynergyCardDemo"));

const RouteLoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

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
          
          {/* Client Routes */}
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
