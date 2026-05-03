import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssignedProgramSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  protocolHref: string;
  ketoHref: string;
  canStart?: boolean;
}

export function AssignedProgramSheet({ open, onOpenChange, protocolHref, ketoHref }: AssignedProgramSheetProps) {
  const navigate = useNavigate();

  const handleOpenRoute = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full max-w-full rounded-t-[20px] border-0 bg-background px-5 pb-8 pt-10"
      >
        <SheetTitle className="text-left text-lg font-semibold text-foreground">
          Your Assigned Program
        </SheetTitle>
        <SheetDescription className="mt-2 text-left text-sm text-muted-foreground">
          Open each part separately.
        </SheetDescription>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="secondary"
            className="h-14 w-full justify-between rounded-lg px-4 text-left"
            onClick={() => handleOpenRoute(protocolHref)}
          >
            <span>View Protocol</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="h-14 w-full justify-between rounded-lg px-4 text-left"
            onClick={() => handleOpenRoute(ketoHref)}
          >
            <span>View Keto Type</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
