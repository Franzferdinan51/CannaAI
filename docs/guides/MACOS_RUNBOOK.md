# macOS Runbook

## Install

Requirements:
- Node.js 22+
- npm 10+

Commands:

```bash
npm install
cd NewUI/cannaai-pro && npm install
```

Or use the repo helper:

```bash
npm run setup
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Minimum local values:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-real-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Notes:
- Keep `DATABASE_URL` as `file:./dev.db` for the bundled SQLite setup. Prisma resolves that relative to `prisma/schema.prisma`.
- Add AI provider keys only for the providers you plan to use.

## Development

Start both services:

```bash
npm run dev
```

Default ports:
- Backend / Next.js: `3000`
- Frontend / Vite: `5173`

If you want to run each side separately:

```bash
npm run dev:backend
cd NewUI/cannaai-pro && npm run dev
```

Explainability smoke check against the local backend:

```bash
npm run check:report-quality
```

Notes:
- The script posts a committed fixture image payload plus sample symptoms to `http://127.0.0.1:3000/api/analyze` by default.
- It exits `0` and prints a skip message when the local analyze service or AI backend is unavailable.
- Override the endpoint or fixture with `CANNAAI_REPORT_CHECK_URL` and `CANNAAI_REPORT_CHECK_IMAGE` when needed.

## Build

Run the full production build:

```bash
npm run build
```

Verified smoke path:

```bash
PORT=3102 NODE_ENV=production \
DATABASE_URL="file:./dev.db" \
NEXTAUTH_SECRET="replace-with-a-real-secret" \
NEXTAUTH_URL="http://127.0.0.1:3102" \
npm run start:backend
```

Frontend preview:

```bash
cd NewUI/cannaai-pro && npm run preview -- --host 127.0.0.1 --port 4173
```

## Known Warnings

- `libheif-js` emits a `Critical dependency` warning during the Next build through `heic-convert`. The build still completes.
- Vite preview/build may print a `baseline-browser-mapping` staleness warning. It is informational.
- If npm prints `Unknown env config "auto-install-peers"`, that setting is coming from your shell environment or global npm config, not this repo.
- The production backend warns when `SOCKET_IO_ORIGINS` is unset. That is expected for local-only testing; set it before real remote access.
- Some LM Studio debug routes log failed local scans during static generation when LM Studio is not running. The build still completes.
