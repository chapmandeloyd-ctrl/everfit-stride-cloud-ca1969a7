import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      ignored: ["**/.env", "**/.env.*"],
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "html-build-timestamp",
      transformIndexHtml(html: string) {
        return html.replace("__BUILD_TIMESTAMP__", new Date().toISOString());
      },
    },
  ].filter(Boolean),
  // Inject build timestamp into index.html for cache-busting on native WebView
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      external: [
        '@johnjasonhudson/capacitor-healthkit',
        '@nicholasquinn/capacitor-healthconnect',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
