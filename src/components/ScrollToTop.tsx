import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the window (and the main app scroll container, if present)
 * to the top whenever the route pathname changes. Hash links are left
 * alone so in-page anchors still work.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0 });
    // Also reset the inner <main> scroller used by ClientLayout
    document.querySelectorAll<HTMLElement>("main").forEach((el) => {
      if (el.scrollTop !== 0) el.scrollTop = 0;
    });
  }, [pathname, hash]);

  return null;
}