import { motion, AnimatePresence } from "framer-motion";
import { X, Info, Rss, HelpCircle, Settings as SettingsIcon, BookOpen, CircleDot, Moon, Globe } from "lucide-react";

type Category = "Focus" | "Sleep" | "Escape";

interface PortalControlPanelProps {
  open: boolean;
  activeCategory: Category;
  onClose: () => void;
  onOpenLibrary: () => void;
  onSelectCategory: (category: Category) => void;
}

/**
 * PortalControlPanel — slide-up sheet shown when the user taps the FOCUS tab
 * from inside the player. Modeled after the Portal app:
 *   - PORTAL title + close (X)
 *   - ABOUT / FOLLOW / FAQS / SETTINGS row
 *   - OPEN LIBRARY pill (only entry point to the Library)
 *   - FOCUS / SLEEP / ESCAPE segmented tabs
 */
export function PortalControlPanel({
  open,
  activeCategory,
  onClose,
  onOpenLibrary,
  onSelectCategory,
}: PortalControlPanelProps) {
  const tabs: Array<{ key: Category; icon: typeof CircleDot }> = [
    { key: "Focus", icon: CircleDot },
    { key: "Sleep", icon: Moon },
    { key: "Escape", icon: Globe },
  ];

  const utilityItems = [
    { key: "about", label: "About", Icon: Info },
    { key: "follow", label: "Follow", Icon: Rss },
    { key: "faqs", label: "FAQs", Icon: HelpCircle },
    { key: "settings", label: "Settings", Icon: SettingsIcon },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-[110] bg-black/40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="absolute inset-x-0 bottom-0 z-[120] bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
          >
            {/* Title row */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div className="w-6" />
              <h2 className="text-white text-base font-light tracking-[0.5em] uppercase">
                Portal
              </h2>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1"
                aria-label="Close"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-6" />

            {/* Utility row: About / Follow / FAQs / Settings */}
            <div className="grid grid-cols-4 gap-2 px-6 py-6">
              {utilityItems.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className="flex flex-col items-center gap-2 text-white/75 hover:text-white transition-colors"
                >
                  <div className="h-9 w-9 rounded-full border border-white/30 flex items-center justify-center">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.25em]">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-6" />

            {/* Open Library pill */}
            <div className="px-6 py-6">
              <button
                onClick={onOpenLibrary}
                className="w-full py-4 rounded-full bg-white/[0.04] border border-white/15 text-white/90 text-sm font-light tracking-[0.3em] uppercase hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                Open Library
              </button>
            </div>

            {/* Segmented tabs: FOCUS / SLEEP / ESCAPE */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 bg-white/[0.04] rounded-xl overflow-hidden border border-white/10">
                {tabs.map(({ key, icon: Icon }) => {
                  const active = activeCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onSelectCategory(key)}
                      className={`relative py-4 flex flex-col items-center gap-1.5 transition-colors ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-white/55 hover:text-white/85"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-medium">
                        {key}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
