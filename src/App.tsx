import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import Workouts from "./pages/Workouts";
import WorkoutDetail from "./pages/WorkoutDetail";
import CreateWorkout from "./pages/CreateWorkout";
import EditWorkout from "./pages/EditWorkout";
import WorkoutTemplates from "./pages/WorkoutTemplates";
import Exercises from "./pages/Exercises";
import Clients from "./pages/Clients";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import Goals from "./pages/Goals";
import TaskLibrary from "./pages/TaskLibrary";
import Auth from "./pages/Auth";
import Unsubscribe from "./pages/Unsubscribe";
import PortalMockup from "./pages/PortalMockup";
import ClientDashboard from "./pages/client/ClientDashboardMinimal";
import ClientRingsDemo from "./pages/client/ClientRingsDemo";
import ClientSmartPace from "./pages/client/ClientSmartPace";
import SmartPacePreview from "./pages/SmartPacePreview";
import ClientDailyScore from "./pages/client/ClientDailyScore";
import ClientOnboarding from "./pages/client/ClientOnboarding";
import ClientWorkouts from "./pages/client/ClientWorkouts";
import ClientProgress from "./pages/client/ClientProgress";
import ClientNutrition from "./pages/client/ClientNutrition";
import ClientNutritionDashboard from "./pages/client/ClientNutritionDashboard";
import ClientCalendar from "./pages/client/ClientCalendar";
import ClientSettings from "./pages/client/ClientSettings";
import ClientTaskDetail from "./pages/client/ClientTaskDetail";
import ClientGoals from "./pages/client/ClientGoals";
import ClientTasks from "./pages/client/ClientTasks";
import ClientResourceHub from "./pages/client/ClientResourceHub";
import ClientWorkoutHub from "./pages/client/ClientWorkoutHub";
import ClientOnDemand from "./pages/client/ClientOnDemand";
import ClientResourceCollectionDetail from "./pages/client/ClientResourceCollectionDetail";
import ResourceLibrary from "./pages/ResourceLibrary";
import ResourceCollections from "./pages/ResourceCollections";
import ResourceCollectionDetail from "./pages/ResourceCollectionDetail";
import OndemandWorkouts from "./pages/OndemandWorkouts";
import WorkoutCollections from "./pages/WorkoutCollections";
import WorkoutCollectionDetail from "./pages/WorkoutCollectionDetail";
import WorkoutLabels from "./pages/WorkoutLabels";
import StudioPrograms from "./pages/StudioPrograms";
import Programs from "./pages/Programs";
import Recipes from "./pages/Recipes";
import RecipeDetail from "./pages/RecipeDetail";
import RecipeBooks from "./pages/RecipeBooks";
import RecipeBookDetail from "./pages/RecipeBookDetail";
import MealPlans from "./pages/MealPlans";
import MealPlanDetail from "./pages/MealPlanDetail";
import MacroCalculator from "./pages/MacroCalculator";
import MacroTracking from "./pages/MacroTracking";
import TrainerClientHealth from "./pages/TrainerClientHealth";
import ClientsHealth from "./pages/ClientsHealth";
import NotFound from "./pages/NotFound";
import ClientHealth from "./pages/client/ClientHealth";
import ClientHealthConnect from "./pages/client/ClientHealthConnect";
import ClientBadges from "./pages/client/ClientBadges";
import ClientMealPlan from "./pages/client/ClientMealPlan";
import ClientMealSelect from "./pages/client/ClientMealSelect";
import ClientHealthReminders from "./pages/client/ClientHealthReminders";
import ClientMealResults from "./pages/client/ClientMealResults";
import ClientHabits from "./pages/client/ClientHabits";
import ClientHabitDetail from "./pages/client/ClientHabitDetail";
import ClientMacroSetup from "./pages/client/ClientMacroSetup";
import ClientLogMeal from "./pages/client/ClientLogMeal";
import ClientCoaching from "./pages/client/ClientCoaching";
import ClientProfile from "./pages/client/ClientProfile";
import ClientStagesTimeline from "./pages/client/ClientStagesTimeline";
import ClientSportsProfile from "./pages/client/ClientSportsProfile";
import ClientBooking from "./pages/client/ClientBooking";
import ClientCardioPlayer from "./pages/client/ClientCardioPlayer";
import ClientWodBuilder from "./pages/client/ClientWodBuilder";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientRecipeDetail from "./pages/client/ClientRecipeDetail";
import ClientPrograms from "./pages/client/ClientPrograms";
import ClientChooseProtocol from "./pages/client/ClientChooseProtocol";
import ClientBeginReset from "./pages/client/ClientBeginReset";
import ClientQuickPlans from "./pages/client/ClientQuickPlans";
import ClientQuickPlanDetail from "./pages/client/ClientQuickPlanDetail";
import ClientProtocolDetail from "./pages/client/ClientProtocolDetail";
import ClientProtocolCardDemo from "./pages/client/ClientProtocolCardDemo";
import ClientKetoTypeCardDemo from "./pages/client/ClientKetoTypeCardDemo";
import ClientFastingPlansPreview from "./pages/client/ClientFastingPlansPreview";
import WindowsCardDemo from "./pages/client/WindowsCardDemo";
import ClientFastingPlanDetailPreview from "./pages/client/ClientFastingPlanDetailPreview";
import ProtocolStylesPreview from "./pages/preview/ProtocolStylesPreview";
import ClientFastComplete from "./pages/client/ClientFastComplete";
import ClientLabs from "./pages/client/ClientLabs";
import ClientDiamondLab from "./pages/client/ClientDiamondLab";
import ClientHoopsLab from "./pages/client/ClientHoopsLab";
import ClientBattingSession from "./pages/client/ClientBattingSession";
import ClientShootingSession from "./pages/client/ClientShootingSession";
import ClientWorkoutHistory from "./pages/ClientWorkoutHistory";
import ClientWorkoutSession from "./pages/client/ClientWorkoutSession";
import ClientMyWorkouts from "./pages/client/ClientMyWorkouts";
import AllClientWorkouts from "./pages/AllClientWorkouts";
import ClientCommandCenter from "./pages/ClientCommandCenter";
import Scheduling from "./pages/Scheduling";
import TrainerSettings from "./pages/TrainerSettings";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FastingRouteGuard } from "./components/FastingRouteGuard";
import { ImpersonationProvider } from "./hooks/useImpersonation";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import GuardianSummary from "./pages/GuardianSummary";
import StudioProgramDetail from "./pages/StudioProgramDetail";
import KetoTypesManager from "./pages/KetoTypesManager";
import ClientKetoTypes from "./pages/client/ClientKetoTypes";
import ClientKetoTypeDetail from "./pages/client/ClientKetoTypeDetail";
import ClientGroceryList from "./pages/client/ClientGroceryList";
import CardStylesPreview from "./pages/client/CardStylesPreview";
import NotificationCenter from "./pages/NotificationCenter";
import ResetPassword from "./pages/ResetPassword";
import CheckoutTest from "./pages/CheckoutTest";
import SynergyCardDemo from "./pages/SynergyCardDemo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <ImpersonationProvider>
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
        </ImpersonationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
