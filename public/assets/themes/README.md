Themes
======

Overview
--------
- Each theme lives in its own folder under `public/assets/themes/` and contains a `theme.config.json` plus any texture/mesh assets.
- We do NOT hash individual files. Instead, we version the entire theme folder name with a short content hash. This ensures the `theme.config.json` URL changes and avoids stale caches.

Naming & Hashing
----------------
- Folder names follow: `<base>-<hash>` where `<hash>` is an 8‑char SHA1 of the folder contents.
- The script treats the segment before the first dash as the base name. Example: `default-5cd267ef` has base `default`.
- Keep base names simple (no additional dashes). For example: `default`, `smooth`, `neon`.

How the app finds themes
------------------------
- `src/config/theme.ts` is auto-generated and exported:
  - `THEMES`: a mapping from base name to the hashed folder name.
  - `DEFAULT_THEME`: set to `THEMES['default']`.
- `src/dice-roller-main.ts` imports `{ DEFAULT_THEME, THEMES }` and uses them when creating dice (e.g., `DEFAULT_THEME` for default dice, `THEMES.smooth` for the D6).

Manual bump process (run after any theme asset changes)
------------------------------------------------------
1. Edit files in the theme folder(s) under `public/assets/themes/`.
2. Run `npm run theme:bump` (or `node scripts/bump-theme.mjs`).
   - Computes a content hash for each theme folder (recursively), renames folders to `<base>-<hash>`, and updates `src/config/theme.ts`.
3. Commit the folder renames and the updated `src/config/theme.ts`.

Adding a new theme
------------------
- Create a folder `public/assets/themes/<base>` with `theme.config.json` and assets.
- Run `npm run theme:bump` to generate the hashed folder and mapping.
- Reference it in code via `THEMES.<base>` if needed.

Notes
-----
- The default theme must have base name `default` (that’s what the code uses for `DEFAULT_THEME`).
- Running the bump script is idempotent; it will only rename folders when the hash changes.
- Avoid placing unrelated files in a theme folder—they affect the content hash and thus the folder name.

