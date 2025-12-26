# Repository Guidelines

## Project Structure & Modules
- Core Next.js 15 app lives in `src/app` (routes like `dashboard`, `ai-assistant`, `live-vision`, `tools`, `settings`, plus API routes under `src/app/api`).
- Reusable UI in `src/components`; hooks in `src/hooks`; shared utilities/configs in `src/lib`.
- Styling via `src/app/globals.css` and Tailwind config `tailwind.config.ts`.
- Backend/server entrypoint is `server.ts`; Prisma schema and migrations in `prisma/`; public assets in `public/`.
- Example agent/test sandboxes in `src/app/socket-test`, `src/app/test-lmstudio`, and `src/app/api/debug/models-test`.

## Build, Test & Dev Commands
- `npm run dev` (or `dev:win`): start custom server with hot reload via nodemon/tsx.
- `npm run build`: Next.js production build; use `build:static` or `build:netlify` for static/Netlify output.
- `npm start` (or `start:win`): run compiled app with the custom server in production mode.
- `npm test` / `npm run test:watch`: Jest suite (jsdom env); keep fast and isolated.
- `npm run lint`: ESLint per `eslint.config.mjs` and Next.js rules.

## Coding Style & Naming
- TypeScript/React with functional components; prefer 2-space indentation and single quotes where possible.
- Keep components in PascalCase files (e.g., `GrowRoomChart.tsx`), hooks as `useSomething.ts`, utilities camelCase.
- Favor server actions/api handlers inside `src/app/api`; colocate feature-specific components under matching route folders.
- Run `npm run lint` before PRs; adhere to Tailwind class ordering conventions already used in `globals.css`.

## Testing Guidelines
- Jest + Testing Library for UI; add tests beside features or under `__tests__` when expanding coverage.
- Name files `*.test.ts(x)`; mock network/AI providers to avoid external calls.
- Aim for coverage on critical flows: sensor ingest, AI provider selection/fallback, dashboard rendering, and auth flows.

## Commit & PR Expectations
- Prefer concise, present-tense commits (e.g., `feat: add live vision alerts`, `fix: handle prisma disconnect`). Keep changes scoped.
- PRs should describe intent, key changes, and risks; link issues/tasks and include before/after notes or screenshots for UI.
- Note env/config impacts (`.env.local`, Netlify vars, Prisma migrations) and attach migration steps or rollback notes.
- Ensure scripts/tests relevant to the change are run and results summarized in the PR description.

## Security & Config Tips
- Never commit real secrets; use `.env.local` for development and keep `.env.local.example`/`netlify.toml` in sync.
- Prisma migrations can be destructive—run locally against a disposable DB before sharing. Back up `db/` snapshots when modifying schema.
- Custom server binds to 3000 by default; for remote access, follow `startup.bat`/`REMOTE_ACCESS.md` to avoid exposing unsafe ports.