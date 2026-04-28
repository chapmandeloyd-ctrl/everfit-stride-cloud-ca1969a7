import React from "react";
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

type RootErrorBoundaryState = {
  errorMessage: string | null;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      errorMessage: error instanceof Error ? error.message : "Unknown application error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("[RootErrorBoundary]", error);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
            <h1 className="text-xl font-semibold">App failed to render</h1>
            <p className="mt-2 text-sm text-muted-foreground">{this.state.errorMessage}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  console.error("[window.error]", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[window.unhandledrejection]", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </ThemeProvider>,
);
