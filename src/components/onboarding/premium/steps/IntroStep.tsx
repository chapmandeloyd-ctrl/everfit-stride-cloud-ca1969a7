import { Button } from "@/components/ui/button";
import lionLogo from "@/assets/logo.png";

export default function IntroStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 flex flex-col items-center pt-8">
        <div className="animate-scale-in mb-8">
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_80px_hsl(var(--primary)/0.25)]">
            <img
              src={lionLogo}
              alt="Apex360-IF"
              className="h-28 w-28 object-contain"
              style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
            />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Welcome to APEX360 AI
          </h1>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
            Your fasting companion
          </p>
          <p className="mx-auto max-w-xs text-lg font-semibold leading-snug text-white/90">
            YOU ARE NOT WHAT YOU EAT — BUT WHEN YOU EAT
          </p>
        </div>

        <div className="mt-8 w-full flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed text-white/70">
          <p className="mb-4">
            APEX360 focuses on a balanced lifestyle and sustainability. Instead of eliminating food groups with diets like keto, paleo, or carnivore — these diets exclude carbs, dairy, and vegetables, and in some cases like carnivore exclude all three.
          </p>
          <p className="mb-4">
            That is not to say these diets don't work. They are very effective, and I know firsthand because I've tried all three — especially keto.
          </p>
          <p className="mb-4">
            The problem is they are just not sustainable long-term. The number one food group that gets blamed for being overweight is <strong className="text-white">CARBS</strong> — and that is so far from the truth.
          </p>
          <p className="mb-4">
            Carbs are very important for living a balanced, healthy lifestyle. The problem is most people abuse them and don't understand that all carbs are not created equal, and there is a right place and time to consume them.
          </p>
          <p className="mb-4">
            My APEX360 AI will teach you which carbs to consume, and most importantly <strong className="text-white">when</strong> to consume them. My APEX360 AI will design your entire plan and keep you accountable.
          </p>
        </div>
      </div>

      <div className="w-full pb-4 pt-6">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          LET'S GET STARTED!!
        </Button>
      </div>
    </div>
  );
}
