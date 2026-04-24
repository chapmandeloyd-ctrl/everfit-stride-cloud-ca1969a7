import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgramsSelector } from "@/components/ProgramsSelector";
import { QuickPlansSelector } from "@/components/QuickPlansSelector";
import { FastingSafetyNotice } from "@/components/FastingSafetyNotice";
import { FastingStructureComparison } from "@/components/FastingStructureComparison";
import { LifestylePlanSelector } from "@/components/LifestylePlanSelector";
import { TransformationPathCard } from "@/components/TransformationPathCard";
import { useEngineMode } from "@/hooks/useEngineMode";

export default function ClientChooseProtocol() {
  const navigate = useNavigate();
  const [focusFilter, setFocusFilter] = useState<string | null>(null);
  const { engineMode, config, isLoading: engineLoading } = useEngineMode();

  if (engineLoading) {
    return (
      <ClientLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const showFasting = config.features.showFastingUI;

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Fasting Plans</h1>
        </div>

        {/* Fasting section — KSOM-360 only */}
        {showFasting && (
          <>

            <LifestylePlanSelector selected={focusFilter} onSelect={setFocusFilter} />
            <TransformationPathCard />
            <ProgramsSelector navigate={navigate} />
            <QuickPlansSelector navigate={navigate} />

            <FastingStructureComparison />
            <FastingSafetyNotice />
          </>
        )}
      </div>
    </ClientLayout>
  );
}
