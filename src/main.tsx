import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { clearServiceWorkersAndCaches, disableServiceWorkersInNative, isNativeApp } from "./lib/nativePlatform";

const isLovablePreviewHost =
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.startsWith("id-preview--");

if (isNativeApp() || isLovablePreviewHost) {
  (isNativeApp() ? disableServiceWorkersInNative() : clearServiceWorkersAndCaches("[Preview]")).catch(() => {});
} else {
  clearServiceWorkersAndCaches("[Web]").catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <App />
  </ThemeProvider>
);

