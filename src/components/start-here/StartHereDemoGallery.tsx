import { StartHereBlackGold } from "./StartHereBlackGold";

/**
 * TEMPORARY preview — the user picked the Editorial Black & Gold
 * variant with the faint lion watermark from variant 1. Showing
 * just that one full-bleed so we can iterate on Phase 2 (the
 * /client/choose-protocol redesign) using this theme.
 *
 * Lives on /client/dashboard while SHOW_START_HERE_DEMOS=true.
 */
export function StartHereDemoGallery() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Theme locked</p>
        <h2 className="text-xl font-bold text-foreground">Editorial Black & Gold + Lion watermark</h2>
        <p className="text-sm text-muted-foreground">
          Locked in. Next step is to apply this theme to the protocol-selection flow.
        </p>
      </div>

      <div className="rounded-3xl overflow-hidden border border-border shadow-sm">
        <StartHereBlackGold />
      </div>
    </div>
  );
}
