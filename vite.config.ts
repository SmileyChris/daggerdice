import { cloudflare } from "@cloudflare/vite-plugin";
import { execSync } from "child_process";
import { defineConfig } from "vite";

function getVersion() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  try {
    const shortHash = execSync("git rev-parse --short HEAD").toString().trim();
    return `${year}-${month}-${day}-${shortHash}`;
  } catch {
    return `${year}-${month}-${day}`;
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  plugins: [
    cloudflare({
      // Configure the plugin to work with our Worker
      functionEntrypoint: "src/worker.ts",
      // Ensure assets are built correctly
      persist: true,
    }),
  ],
  build: {
    target: "es2022",
    // Split large chunks to avoid Cloudflare size limits
    rollupOptions: {
      output: {
        manualChunks: {
          "dice-engine": ["@3d-dice/dice-box"],
          alpine: ["alpinejs"],
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Increase chunk size warning limit since 3D assets are large
    chunkSizeWarningLimit: 1500,
  },
});
