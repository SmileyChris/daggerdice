import { cloudflare } from "@cloudflare/vite-plugin";
import { execSync } from "child_process";
import { defineConfig } from "vite";

function getVersionFromLatestCommitUTC() {
  try {
    // Get short hash of latest commit
    const shortHash = execSync('git rev-parse --short HEAD')
      .toString()
      .trim();

    // Get latest commit date in ISO 8601 UTC
    const commitISO = execSync(
      'git show -s --format=%cI HEAD'
    ).toString().trim(); // e.g., 2025-06-16T18:42:10Z

    const commitDateUTC = commitISO.substring(0, 10); // YYYY-MM-DD

    // Build full UTC day range
    const startUTC = `${commitDateUTC}T00:00:00Z`;
    const endUTC = `${commitDateUTC}T23:59:59Z`;

    // Count commits in that UTC day
    const commitCount = parseInt(execSync(
      `git rev-list --count --since="${startUTC}" --until="${endUTC}" HEAD`
    ).toString().trim());

    // Only include commit count if greater than 1
    if (commitCount > 1) {
      return `${commitDateUTC}.${commitCount}.${shortHash}`;
    } else {
      return `${commitDateUTC}.${shortHash}`;
    }
  } catch (e) {
    console.warn('Git version generation failed:', e);
    return 'unknown-version';
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getVersionFromLatestCommitUTC()),
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
