import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import ClientDashboard from "./pages/client/ClientDashboard";
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
import ClientMealResults from "./pages/client/ClientMealResults";
import ClientHabits from "./pages/client/ClientHabits";
import ClientHabitDetail from "./pages/client/ClientHabitDetail";
import ClientMacroSetup from "./pages/client/ClientMacroSetup";
import ClientLogMeal from "./pages/client/ClientLogMeal";
import ClientCoaching from "./pages/client/ClientCoaching";
import ClientProfile from "./pages/client/ClientProfile";
import ClientSportsProfile from "./pages/client/ClientSportsProfile";
import ClientBooking from "./pages/client/ClientBooking";
import ClientCardioPlayer from "./pages/client/ClientCardioPlayer";
import ClientWodBuilder from "./pages/client/ClientWodBuilder";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientRecipeDetail from "./pages/client/ClientRecipeDetail";
import ClientPrograms from "./pages/client/ClientPrograms";
import ClientChooseProtocol from "./pages/client/ClientChooseProtocol";
import ClientQuickPlans from "./pages/client/ClientQuickPlans";
import ClientQuickPlanDetail from "./pages/client/ClientQuickPlanDetail";
import ClientProtocolDetail from "./pages/client/ClientProtocolDetail";
import ClientCompletePlan from "./pages/client/ClientCompletePlan";
import ClientFastComplete from "./pages/client/ClientFastComplete";
import ClientVibes from "./pages/client/ClientVibes";
import ClientLabs from "./pages/client/ClientLabs";
import ClientDiamondLab from "./pages/client/ClientDiamondLab";
import ClientHoopsLab from "./pages/client/ClientHoopsLab";
import ClientBattingSession from "./pages/client/ClientBattingSession";
import ClientShootingSession from "./pages/client/ClientShootingSession";
import ClientWorkoutHistory from "./pages/ClientWorkoutHistory";
import ClientWorkoutSession from "./pages/client/ClientWorkoutSession";
import ClientMyWorkouts from "./pages/client/ClientMyWorkouts";
import VibesAdmin from "./pages/VibesAdmin";
import ClientPortal from "./pages/client/ClientPortal";
import PortalAdmin from "./pages/PortalAdmin";
import AllClientWorkouts from "./pages/AllClientWorkouts";
import ClientCommandCenter from "./pages/ClientCommandCenter";
import Scheduling from "./pages/Scheduling";
import TrainerSettings from "./pages/TrainerSettings";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FastingRouteGuard } from "./components/FastingRouteGuard";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/guardian/:token" element={<GuardianSummary />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/checkout-test" element={<CheckoutTest />} />
          <Route path="/portal-mockup" element={<PortalMockup />} />
          
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
          <Route path="/client/coaching" element={<ProtectedRoute allowedRoles={["client"]}><ClientCoaching /></ProtectedRoute>} />
          <Route path="/client/profile" element={<ProtectedRoute allowedRoles={["client"]}><ClientProfile /></ProtectedRoute>} />
          <Route path="/client/onboarding" element={<ProtectedRoute allowedRoles={["client"]}><ClientOnboarding /></ProtectedRoute>} />
          <Route path="/client/workouts" element={<ProtectedRoute allowedRoles={["client"]}><ClientWorkouts /></ProtectedRoute>} />
          <Route path="/client/progress" element={<ProtectedRoute allowedRoles={["client"]}><ClientProgress /></ProtectedRoute>} />
          <Route path="/client/meal-plan" element={<ProtectedRoute allowedRoles={["client"]}><ClientMealPlan /></ProtectedRoute>} />
          <Route path="/client/meal-select" element={<ProtectedRoute allowedRoles={["client"]}><ClientMealSelect /></ProtectedRoute>} />
          <Route path="/client/meal-results" element={<ProtectedRoute allowedRoles={["client"]}><ClientMealResults /></ProtectedRoute>} />
          <Route path="/client/grocery" element={<ProtectedRoute allowedRoles={["client"]}><ClientGroceryList /></ProtectedRoute>} />
          <Route path="/client/nutrition" element={<ProtectedRoute allowedRoles={["client"]}><ClientNutrition /></ProtectedRoute>} />
          <Route path="/client/nutrition-dashboard" element={<ProtectedRoute allowedRoles={["client"]}><ClientNutritionDashboard /></ProtectedRoute>} />
          <Route path="/client/calendar" element={<ProtectedRoute allowedRoles={["client"]}><ClientCalendar /></ProtectedRoute>} />
          <Route path="/client/settings" element={<Navigate to="/client/profile?tab=settings" replace />} />
          <Route path="/client/goals" element={<ProtectedRoute allowedRoles={["client"]}><ClientGoals /></ProtectedRoute>} />
          <Route path="/client/tasks" element={<ProtectedRoute allowedRoles={["client"]}><ClientTasks /></ProtectedRoute>} />
          <Route path="/client/tasks/:taskId" element={<ProtectedRoute allowedRoles={["client"]}><ClientTaskDetail /></ProtectedRoute>} />
          <Route path="/client/resource-hub" element={<ProtectedRoute allowedRoles={["client"]}><ClientResourceHub /></ProtectedRoute>} />
          <Route path="/client/workout-hub" element={<ProtectedRoute allowedRoles={["client"]}><ClientWorkoutHub /></ProtectedRoute>} />
          <Route path="/client/on-demand" element={<ProtectedRoute allowedRoles={["client"]}><ClientOnDemand /></ProtectedRoute>} />
          <Route path="/client/resource-collection/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientResourceCollectionDetail /></ProtectedRoute>} />
          <Route path="/client/health" element={<ProtectedRoute allowedRoles={["client"]}><ClientHealth /></ProtectedRoute>} />
          <Route path="/client/health-connect" element={<ProtectedRoute allowedRoles={["client"]}><ClientHealthConnect /></ProtectedRoute>} />
          <Route path="/client/badges" element={<ProtectedRoute allowedRoles={["client"]}><ClientBadges /></ProtectedRoute>} />
          <Route path="/client/habits" element={<ProtectedRoute allowedRoles={["client"]}><ClientHabits /></ProtectedRoute>} />
          <Route path="/client/habits/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientHabitDetail /></ProtectedRoute>} />
          <Route path="/client/macro-setup" element={<ProtectedRoute allowedRoles={["client"]}><ClientMacroSetup /></ProtectedRoute>} />
          <Route path="/client/log-meal" element={<ProtectedRoute allowedRoles={["client"]}><ClientLogMeal /></ProtectedRoute>} />
          <Route path="/client/recipes/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientRecipeDetail /></ProtectedRoute>} />
          <Route path="/client/keto-types" element={<ProtectedRoute allowedRoles={["client"]}><ClientKetoTypes /></ProtectedRoute>} />
          <Route path="/client/keto-types/:id" element={<ProtectedRoute allowedRoles={["client"]}><ClientKetoTypeDetail /></ProtectedRoute>} />
          <Route path="/client/card-styles" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><CardStylesPreview /></ProtectedRoute>} />
          <Route path="/client/workouts/:id" element={<ProtectedRoute allowedRoles={["client"]}><WorkoutDetail /></ProtectedRoute>} />
          <Route path="/client/workout-session/:sessionId" element={<ProtectedRoute allowedRoles={["client"]}><ClientWorkoutSession /></ProtectedRoute>} />
          <Route path="/client/messages" element={<ProtectedRoute allowedRoles={["client"]}><Messages /></ProtectedRoute>} />
          <Route path="/client/booking" element={<ProtectedRoute allowedRoles={["client"]}><ClientBooking /></ProtectedRoute>} />
          <Route path="/client/appointments" element={<ProtectedRoute allowedRoles={["client"]}><ClientAppointments /></ProtectedRoute>} />
          <Route path="/client/sports" element={<ProtectedRoute allowedRoles={["client"]}><ClientSportsProfile /></ProtectedRoute>} />
          <Route path="/client/cardio-player" element={<ProtectedRoute allowedRoles={["client"]}><ClientCardioPlayer /></ProtectedRoute>} />
          <Route path="/client/wod-builder" element={<ProtectedRoute allowedRoles={["client"]}><ClientWodBuilder /></ProtectedRoute>} />
          <Route path="/client/my-workouts" element={<ProtectedRoute allowedRoles={["client"]}><ClientMyWorkouts /></ProtectedRoute>} />
          <Route path="/client/programs" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientPrograms /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/choose-protocol" element={<ProtectedRoute allowedRoles={["client"]}><ClientChooseProtocol /></ProtectedRoute>} />
          <Route path="/client/quick-plans" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientQuickPlans /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/quick-plan/:id" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientQuickPlanDetail /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/protocol/:id" element={<ProtectedRoute allowedRoles={["client"]}><FastingRouteGuard><ClientProtocolDetail /></FastingRouteGuard></ProtectedRoute>} />
          <Route path="/client/complete-plan" element={<ProtectedRoute allowedRoles={["client"]}><ClientCompletePlan /></ProtectedRoute>} />
          <Route path="/client/fast-complete" element={<ProtectedRoute allowedRoles={["client"]}><ClientFastComplete /></ProtectedRoute>} />
          <Route path="/client/vibes" element={<ProtectedRoute allowedRoles={["client"]}><ClientVibes /></ProtectedRoute>} />
          <Route path="/client/labs" element={<ProtectedRoute allowedRoles={["client"]}><ClientLabs /></ProtectedRoute>} />
          <Route path="/client/labs/diamond" element={<ProtectedRoute allowedRoles={["client"]}><ClientDiamondLab /></ProtectedRoute>} />
          <Route path="/client/labs/diamond/session" element={<ProtectedRoute allowedRoles={["client"]}><ClientBattingSession /></ProtectedRoute>} />
          <Route path="/client/labs/hoops" element={<ProtectedRoute allowedRoles={["client"]}><ClientHoopsLab /></ProtectedRoute>} />
          <Route path="/client/labs/hoops/session" element={<ProtectedRoute allowedRoles={["client"]}><ClientShootingSession /></ProtectedRoute>} />
          
          {/* Trainer: Vibes Admin */}
          <Route path="/vibes-admin" element={<ProtectedRoute allowedRoles={["trainer"]}><VibesAdmin /></ProtectedRoute>} />

          {/* Portal (Beta) — new immersive experience */}
          <Route path="/client/portal" element={<ProtectedRoute allowedRoles={["client", "trainer"]}><ClientPortal /></ProtectedRoute>} />
          <Route path="/portal-admin" element={<ProtectedRoute allowedRoles={["trainer"]}><PortalAdmin /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
