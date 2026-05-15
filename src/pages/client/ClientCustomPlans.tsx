import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CustomManualPlansSection } from "@/components/CustomManualPlansSection";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";

export default function ClientCustomPlans() {
  const navigate = useNavigate();
  const { settings, isLoading } = useClientFeatureSettings();
  const enabled = (settings as any)?.custom_manual_plans_enabled;

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Custom Plans</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center pt-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : enabled ? (
          <CustomManualPlansSection />
        ) : (
          <div className="rounded-lg border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Custom Plans aren't enabled for your account yet.
          </div>
        )}
      </div>
    </ClientLayout>
  );
}