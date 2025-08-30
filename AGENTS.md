# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` — UI logic in `src/dice-roller-main.ts`, styles in `src/dice-roller.css`, Cloudflare Worker in `src/worker.ts`, multiplayer utilities under `src/session/`.
- Tests: Frontend/unit tests in `src/test/` and `tests/`; Workers tests under `src/test/workers/`.
- Assets: Static files in `public/` (e.g., `public/assets/roll.mp3`). Build output in `dist/`.
- Entry HTML: `index.html` (Vite single page app).

## Build, Test, and Development Commands
- `npm start` / `npm run dev`: Run Vite dev server with Cloudflare integration for local development.
- `npm run build`: Production build (generates `dist/` and Worker bundle).
- `npm run test`: Frontend tests (watch). `npm run test:run` runs once.
- `npm run test:workers`: Cloudflare Workers tests (watch). `npm run test:workers:run` runs once.
- `npm run test:all`: Run frontend and Workers tests.
- `npm run test:coverage`: Frontend coverage report.
- `npm run lint` / `npm run lint:fix`: Lint and auto-fix TS/JS.
- `npm run deploy`: Build and deploy via Wrangler. `npm run verify` checks prod endpoint.

## Coding Style & Naming Conventions
- Language: TypeScript-first (ES modules).
- Indentation: 2 spaces; keep lines ≤ 120 chars.
- Style: Single quotes, semicolons, `eqeqeq`, `prefer-const`, `no-var`, braces for all blocks (enforced by ESLint).
- Filenames: kebab-case for feature files (e.g., `dice-roller-main.ts`); tests end with `.test.ts`.

## Testing Guidelines
- Framework: Vitest.
- Environments: `happy-dom` for frontend; Cloudflare pool for Workers (`@cloudflare/vitest-pool-workers`).
- Coverage: 80% global thresholds (branches, funcs, lines, statements). Use `npm run test:coverage`.
- Placement: Unit tests near domain suites in `src/test/` and `tests/`; Worker-specific specs in `src/test/workers/`.

## Commit & Pull Request Guidelines
- Commits: Concise, imperative subject (e.g., "Fix roll toast display"). Group related changes; keep subjects ≤ 72 chars.
- PRs: Include summary, rationale, and scope; link issues (`Fixes #123`); add screenshots/GIFs for UI changes; note doc updates.
- Checks: Ensure `npm run lint` and `npm run test:all` pass locally; maintain coverage.

## Security & Configuration Tips
- Worker config: `wrangler.toml` defines Durable Objects and assets. Add migrations when changing DO classes.
- Secrets: Do not commit credentials. Use Wrangler bindings/secrets for production.
- Network: WebSockets require HTTPS in production; localhost allowed in dev.
