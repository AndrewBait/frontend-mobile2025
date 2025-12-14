# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Expo Router screens and layouts (file-based routing). Route groups like `app/(customer)/` and `app/(merchant)/` map to role-specific flows; dynamic routes use brackets (e.g. `app/product/[id].tsx`).
- `components/`: Reusable UI components (generally `PascalCase.tsx`).
- `contexts/`: React context providers (e.g. `AuthContext`).
- `services/`: API/Supabase clients, notifications, and storage utilities.
- `constants/`, `hooks/`, `utils/`: Shared configuration, hooks, and helpers.
- `assets/`: Images/icons used by Expo (`assets/images/`).
- `scripts/`: Maintenance scripts like `scripts/reset-project.js`.

## Build, Test, and Development Commands

- `npm install`: Install dependencies.
- `npm run start`: Start Expo dev server.
- `npm run ios` / `npm run android` / `npm run web`: Launch on a platform target.
- `npm run lint`: Run ESLint via Expo (`eslint-config-expo`).
- `npm run reset-project`: Resets the starter template structure (use with care; it can move/remove files).

## Coding Style & Naming Conventions

- Language: TypeScript + React Native (strict mode enabled in `tsconfig.json`).
- Prefer 2-space indentation, single quotes, and semicolons; match surrounding file style when editing.
- Imports: use the `@/*` path alias where it improves readability (configured in `tsconfig.json`).
- Naming: components in `PascalCase`, non-component modules typically `kebab-case` or `camelCase` filenames.

## Testing Guidelines

- No dedicated test runner is configured (no `npm test` script). If you introduce tests, keep them close to the code and use `*.test.ts(x)` naming.
- When changing UI, sanity-check flows on at least one native target plus web when applicable.

## Commit & Pull Request Guidelines

- Commit messages in history are short, sentence-case summaries (e.g. “Initial commit”). Keep subjects concise and imperative (e.g. “Fix auth redirect”).
- PRs should include: a clear description, steps to verify (`npm run ios`, etc.), and screenshots/screen recordings for UI changes. Link related issues/tickets when available.

## Security & Configuration Tips

- Local/backend settings live in `constants/config.ts` (e.g. `API_BASE_URL`). Keep machine-specific values local.
- Never commit sensitive keys (Supabase service role, private API keys). Prefer local overrides via `.env*.local` (gitignored) or secret managers for production.
