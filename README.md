# CannaAI

CannaAI is a local-first cannabis cultivation assistant. It combines plant-photo analysis, cultivation chat, room and sensor records, alerts, automation data, and agent integrations in one application.

The primary AI path is local: CannaAI discovers models from LM Studio and sends text or vision requests through its OpenAI-compatible API. OpenClaw and Hermes are supported as separate agent providers for tool-aware chat and image analysis.

## Quick start

Requirements:

- Node.js 22 or newer
- npm 10 or newer
- LM Studio with a loaded chat/vision model for local AI (optional for UI-only development)
- A local SQLite database; no PostgreSQL server is required by the default schema

From the repository root:

```bash
npm run setup
cp .env.example .env.local
npm run db:push
npm run dev
```

`npm run setup` installs both the backend and `NewUI/cannaai-pro` dependencies. `prisma db push` creates or updates the local SQLite schema; run it again after schema changes. The backend is served on `http://localhost:3000`. The Vite application is served on `http://localhost:5173` and talks to the backend through the configured API base URL. `npm run dev` starts both processes.

After startup, verify the application and provider state:

```bash
npm run health
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/ai/providers
```

The health endpoints distinguish a stopped or unconfigured optional provider from a CannaAI startup failure.

For a production build:

```bash
npm run build
npm run start
```

On Windows, `startup.bat` supports the same development, production, and build-only modes. Keep secrets in `.env.local`; never commit them.

## Local AI with LM Studio

LM Studio is the default local provider for text and vision. Start its OpenAI-compatible local server, load the model and its vision projector when applicable, and configure the base URL:

```dotenv
LM_STUDIO_BASE_URL="http://127.0.0.1:1234/v1"
LM_STUDIO_VISION_MODEL="ornith-1.5-35b-a3b"
LM_STUDIO_TEXT_MODEL="ornith-1.5-35b-a3b"
```

`LM_STUDIO_URL` is also accepted for compatibility. If a model name is not configured, CannaAI can discover available models from `/v1/models`; an explicitly configured model must actually be loaded in LM Studio. For vision, the selected model and projector must support image input. CannaAI accepts data URLs and raw base64 image payloads at `/api/analyze`, including photos submitted by a remote agent.

With the LM Studio CLI, the equivalent checks are:

```bash
lms server start
lms ls
curl http://127.0.0.1:1234/v1/models
```

The `lms` commands are optional; CannaAI communicates with LM Studio over its local OpenAI-compatible HTTP API.

Useful checks:

```bash
curl http://127.0.0.1:1234/v1/models
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/ai/providers
```

If LM Studio is stopped or no model is loaded, CannaAI reports the provider as unavailable and keeps the rest of the application usable.

## OpenClaw integration

CannaAI treats OpenClaw as a separate agent runtime. It uses the authenticated OpenClaw Gateway through the ACP transport; it does not copy OpenClaw credentials or pretend that the Gateway is a generic unauthenticated HTTP API.

```bash
openclaw gateway status --json
openclaw agent --message "Check my grow room conditions"
```

The optional `OPENCLAW_AGENT_ID` selects the agent profile (default `main`). `OPENCLAW_ACP_URL` can explicitly select an ACP endpoint when the local OpenClaw installation requires it. The supported CannaAI skill is in [`openclaw-skill/`](openclaw-skill/); install it with:

```bash
ln -sf "$PWD/openclaw-skill" ~/.openclaw/skills/cannaai
```

The tracked `openclaw-bridge/` directory is retained as a legacy reference. It is not required by the active CannaAI integration and should not be started on the OpenClaw Gateway port.

See [`docs/guides/README-OPENCLAW.md`](docs/guides/README-OPENCLAW.md) for the agent contract and troubleshooting guidance.

OpenClaw is not required for local LM Studio chat or analysis. Keep its credentials and runtime separate from Hermes; CannaAI reports each provider independently.

## Hermes integration

Hermes is also a separate agent runtime. CannaAI prefers the authenticated Hermes API server, including native vision-capable chat, and falls back to the legacy Hermes proxy when only that interface is available.

Native API server configuration:

```dotenv
HERMES_API_URL="http://127.0.0.1:8642/v1"
HERMES_API_KEY="change-me-local-dev"
HERMES_MODEL="hermes-agent"
```

`HERMES_API_SERVER_KEY` is accepted as an alternative key name. For the legacy proxy fallback, configure `HERMES_AGENT_COMMAND` or the Hermes executable on `PATH`; `HERMES_PROXY_PORT` and `HERMES_PROXY_PROVIDER` remain available for compatibility. The native API path is preferred when its URL and key are available. To route plant-photo analysis explicitly through Hermes:

```dotenv
CANNAAI_IMAGE_PROVIDER="hermes"
```

Provider discovery and `/api/health-check` use the same detection logic, so a configured authenticated proxy or API server is represented consistently. Agent Evolver and the old model-conversion tooling are no longer part of the application.

## Phone and remote camera workflow

An OpenClaw or Hermes agent can capture a phone photo and submit it to CannaAI through `/api/analyze`. The request may contain `image` or `plantImage` as a data URL or raw base64, plus optional plant, room, strain, and environmental context.

For a phone outside the development machine, expose CannaAI through a trusted HTTPS/Tailscale address and set explicit origins in production:

```dotenv
SOCKET_IO_ORIGINS="https://your-cannaai-host.example"
CANNAAI_API_TOKEN="use-a-long-random-value"
SOCKET_IO_TOKEN="use-a-long-random-value"
```

The app uses Socket.IO for live dashboard updates and a WebSocket chat endpoint. Do not expose the development server directly to the public internet.

The agent should submit the photo to the reachable CannaAI backend, not to the Vite development port. Use `/api/analyze` on the backend address and include the image as `image` or `plantImage`. A successful analysis response identifies the selected provider/model and whether vision processing was used.

The assistant camera control uses the browser's real image capture flow (`capture="environment"` on supported phones) and never submits a generated placeholder image. If no provider is connected, chat and vision return an unavailable/error state; CannaAI does not substitute canned cultivation advice.

## Core API routes

- `GET /api/health-check` — database and provider health, with honest unavailable states
- `GET /api/ai/providers` — provider availability, models, and configuration status
- `POST /api/analyze` — plant-photo analysis and the agent analysis contract
- `POST /api/chat` — cultivation chat with provider fallback
- `GET /api/openclaw/status` — current OpenClaw-backed cultivation data/status
- `GET /api/lmstudio/models` — discovered LM Studio models

Cost/revenue, harvest, inventory, cloning, canopy measurements, watering/nutrient schedules, simple analysis, and automation-action routes currently return `503` with `available:false` because those legacy endpoints do not yet have persisted models or actuator integrations. They no longer return sample records, process-memory writes, or fake execution results as if they were production data.

The agent-facing analysis response is documented in [`docs/developer/api/agent-analysis-contract.md`](docs/developer/api/agent-analysis-contract.md).

## Project layout

```text
src/                     Next.js API routes, providers, UI, and domain logic
server.ts                Custom Node server and Socket.IO setup
NewUI/cannaai-pro/       Active Vite/React dashboard
prisma/                  SQLite schema, migrations, and generated client config
openclaw-skill/          OpenClaw skill definition and scripts
openclaw-bridge/         Legacy reference, not required at runtime
docs/                    Current guides and API documentation
tests/                   Unit, integration, browser, security, and performance tests
scripts/                 Health, build, deployment, and quality checks
legacy/ and docs/archive Historical material; not imported by the active app
```

## Verification commands

```bash
npm run lint
npm run typecheck:frontend
npm run typecheck:local-ai
npm run typecheck:server
npm run typecheck:next-pages
npm run typecheck:source
npm run typecheck:tests
npm run build
npm test -- --runInBand
```

Additional suites are available through `npm run test:integration`, `npm run test:e2e`, `npm run test:visual`, `npm run test:security`, and `npm run test:performance`. Live provider checks require the corresponding local service; tests should report those services as unavailable rather than treating that state as a successful connection. `npm run test:all` runs the unit, integration, browser, visual, performance, and security lanes together.

## Documentation

- [OpenClaw integration](docs/guides/README-OPENCLAW.md)
- [AI integration guide](docs/guides/AI_INTEGRATION_GUIDE.md)
- [Remote access](docs/guides/REMOTE_ACCESS.md)
- [Deployment checklist](docs/guides/DEPLOYMENT_CHECKLIST.md)
- [API specification](docs/developer/api/openapi-specification.md)
- [Agent analysis contract](docs/developer/api/agent-analysis-contract.md)
- [All documentation](docs/)

## License

No license file is currently tracked in this repository. Add the project’s intended license before distributing builds outside the project.

## Links

- [GitHub repository](https://github.com/Franzferdinan51/CannaAI)
- [OpenClaw](https://openclaw.ai)
- [Hermes Agent](https://github.com/nousresearch/hermes-agent)
- [LM Studio CLI](https://github.com/lmstudio-ai/lms)
