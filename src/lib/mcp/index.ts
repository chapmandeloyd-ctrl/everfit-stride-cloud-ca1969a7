import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import whoamiTool from "./tools/whoami";
import listMyClientsTool from "./tools/list-my-clients";
import getClientProgressTool from "./tools/get-client-progress";
import createClientTaskTool from "./tools/create-client-task";
import listClientTasksTool from "./tools/list-client-tasks";
import addClientNoteTool from "./tools/add-client-note";
import getClientRecentWorkoutsTool from "./tools/get-client-recent-workouts";
import getClientRecentFastsTool from "./tools/get-client-recent-fasts";
import sendCoachingMessageTool from "./tools/send-coaching-message";
import getMyProgressTool from "./tools/get-my-progress";
import getMyTasksTool from "./tools/get-my-tasks";
import completeTaskTool from "./tools/complete-task";
import logMyWaterTool from "./tools/log-my-water";
import getMyHabitsTool from "./tools/get-my-habits";
import logHabitCompletionTool from "./tools/log-habit-completion";
import getMyActiveFastTool from "./tools/get-my-active-fast";
import getMyRecentWorkoutsTool from "./tools/get-my-recent-workouts";
import logBodyWeightTool from "./tools/log-body-weight";
import logMealFromRecipeTool from "./tools/log-meal-from-recipe";
import resetClientPlanTool from "./tools/reset-client-plan";

// Build the OAuth issuer from the Supabase project ref so the direct
// `<ref>.supabase.co` host is used (required by mcp-js issuer verification).
// Vite inlines VITE_SUPABASE_PROJECT_ID at build time; the fallback keeps the
// URL well-formed during the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ksom-360-mcp",
  title: "KSOM-360 MCP",
  version: "0.1.0",
  instructions:
    "Tools for KSOM-360. All calls run as the signed-in user with RLS enforced.\n\nConnectivity: `echo`, `whoami`.\n\nTrainer tools (require a trainer account): `list_my_clients`, `get_client_progress`, `get_client_recent_workouts`, `get_client_recent_fasts`, `list_client_tasks`, `create_client_task`, `add_client_note`, `send_coaching_message`.\n\nClient tools (act as the signed-in client): `get_my_progress`, `get_my_recent_workouts`, `get_my_tasks`, `complete_task`, `get_my_habits`, `log_habit_completion`, `log_my_water`, `get_my_active_fast`.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    echoTool,
    whoamiTool,
    // Trainer
    listMyClientsTool,
    getClientProgressTool,
    getClientRecentWorkoutsTool,
    getClientRecentFastsTool,
    listClientTasksTool,
    createClientTaskTool,
    addClientNoteTool,
    sendCoachingMessageTool,
    resetClientPlanTool,
    // Client (acts as self)
    getMyProgressTool,
    getMyRecentWorkoutsTool,
    getMyTasksTool,
    completeTaskTool,
    getMyHabitsTool,
    logHabitCompletionTool,
    logMyWaterTool,
    getMyActiveFastTool,
    logBodyWeightTool,
    logMealFromRecipeTool,
  ],
});
