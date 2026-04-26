import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const devServerBuildTimestamp = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const runtimeEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith("VITE_")),
  );

  const clientEnv = {
    ...fileEnv,
    ...runtimeEnv,
  };

  const envDefines = Object.fromEntries(
    Object.entries(clientEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    envDir: path.resolve(__dirname, ".lovable-empty-env"),
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "html-build-timestamp",
        transformIndexHtml(html: string) {
          return html.replace("__BUILD_TIMESTAMP__", devServerBuildTimestamp);
        },
      },
    ].filter(Boolean),
    // Inject build timestamp into index.html for cache-busting on native WebView
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(devServerBuildTimestamp),
      ...envDefines,
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
  };
});
