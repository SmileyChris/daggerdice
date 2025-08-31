import { cloudflare } from "@cloudflare/vite-plugin";
import { execSync } from "child_process";
import { defineConfig } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

function getVersionFromLatestCommitUTC() {
  try {
    // Get short hash of latest commit
    const shortHash = execSync("git rev-parse --short HEAD").toString().trim();

    // Get latest commit date in ISO 8601 UTC
    const commitISO = execSync("git show -s --format=%cI HEAD")
      .toString()
      .trim(); // e.g., 2025-06-16T18:42:10Z

    const commitDateUTC = commitISO.substring(0, 10); // YYYY-MM-DD

    // Build full UTC day range
    const startUTC = `${commitDateUTC}T00:00:00Z`;
    const endUTC = `${commitDateUTC}T23:59:59Z`;

    // Count commits in that UTC day
    const commitCount = parseInt(
      execSync(
        `git rev-list --count --since="${startUTC}" --until="${endUTC}" HEAD`
      )
        .toString()
        .trim()
    );

    // Only include commit count if greater than 1
    if (commitCount > 1) {
      return `${commitDateUTC}.${commitCount}.${shortHash}`;
    } else {
      return `${commitDateUTC}.${shortHash}`;
    }
  } catch (e) {
    console.warn("Git version generation failed:", e);
    return "unknown-version";
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'changelog-virtual-module',
      resolveId(id) {
        if (id === 'virtual:changelog') return '\0virtual:changelog';
      },
      load(id) {
        if (id !== '\0virtual:changelog') return;
        const changesPath = join(process.cwd(), 'CHANGES.md');
        if (!existsSync(changesPath)) {
          console.warn('[changelog] CHANGES.md not found; exposing empty CHANGELOG');
          return `export const CHANGELOG = [];`;
        }
        const md = readFileSync(changesPath, 'utf8');
        const lines = md.split(/\r?\n/);
        const entries: Array<{ version: string; changes: string[]; sig?: string }> = [];
        let cur: { version: string; changes: string[] } | null = null;
        for (const raw of lines) {
          const line = raw.trim();
          const m = /^##\s+(.+)$/.exec(line);
          if (m) {
            if (cur) entries.push(cur);
            const label = m[1].trim();
            cur = { version: label, changes: [] };
            continue;
          }
          if (!cur) continue;
          const bm = /^-\s+(.+)$/.exec(line);
          if (bm) cur.changes.push(bm[1]);
        }
        if (cur) entries.push(cur);
        // add content signature so same-day edits/patchups are detected
        for (const e of entries) {
          const h = createHash('sha1');
          h.update(String(e.version));
          h.update('\n');
          for (const c of e.changes) {
            h.update(String(c));
            h.update('\n');
          }
          e.sig = h.digest('hex').slice(0, 8);
        }
        return `export const CHANGELOG = ${JSON.stringify(entries)};`;
      },
    },
    cloudflare(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(getVersionFromLatestCommitUTC()),
  },
  build: {
    target: "es2022",
    // Split large chunks to avoid Cloudflare size limits
    rollupOptions: {
      output: {
        // manualChunks: {
        //   "dice-engine": ["@3d-dice/dice-box"],
        //   alpine: ["alpinejs"],
        // },
        // chunkFileNames: "assets/[name]-[hash].js",
        // assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Increase chunk size warning limit since 3D assets are large
    chunkSizeWarningLimit: 1500,
  },
});
