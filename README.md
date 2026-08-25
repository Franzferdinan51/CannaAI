# CannaAI

CannaAI is a local-first cannabis cultivation assistant. It combines plant-photo analysis, cultivation chat, room and sensor records, alerts, automation data, and agent integrations in one application.

The primary AI path is local: CannaAI discovers models from LM Studio and sends text or vision requests through its OpenAI-compatible API. OpenClaw and Hermes are supported as separate agent providers for tool-aware chat and image analysis.

## Quick start

Requirements:

- Node.js 22 or newer
- npm 10 or newer
- LM Studio with a loaded model for local AI (optional for UI-only development)
- A local SQLite database; no PostgreSQL server is required by the default schema

From the repository root:

```bash
npm run setup
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run dev
```

The backend is served on `http://localhost:3000`. The Vite application is served on `http://localhost:5173` and talks to the backend through the configured API base URL. `npm run dev` starts both processes.

For a production build:

```bash
npm run build
npm run start
```

On Windows, `startup.bat` supports the same development, production, and build-only modes. Keep secrets in `.env.local`; never commit them.

## Local AI with LM Studio

LM Studio is the default local provider for text and vision. Start its local server, load a model, and configure the OpenAI-compatible base URL:

```dotenv
LM_STUDIO_BASE_URL="http://127.0.0.1:1234/v1"
LM_STUDIO_VISION_MODEL="ornith-1.5-35b-a3b"
LM_STUDIO_TEXT_MODEL="ornith-1.5-35b-a3b"
```

`LM_STUDIO_URL` is also accepted for compatibility. CannaAI discovers the available models from `/v1/models`; the configured model must actually be loaded in LM Studio. For vision, use a model and projector that support image input. CannaAI accepts data URLs and raw base64 image payloads at `/api/analyze`.

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

## Hermes integration

Hermes is also a separate agent runtime. CannaAI prefers the authenticated Hermes API server, including native vision-capable chat, and falls back to the legacy Hermes proxy when only that interface is available.

Native API server configuration:

```dotenv
HERMES_API_URL="http://127.0.0.1:8642/v1"
HERMES_API_KEY="change-me-local-dev"
HERMES_MODEL="hermes-agent"
```

`HERMES_API_SERVER_KEY` is accepted as an alternative key name. For the legacy proxy fallback, configure `HERMES_AGENT_COMMAND` or the Hermes executable on `PATH`; `HERMES_PROXY_PORT` and `HERMES_PROXY_PROVIDER` remain available for compatibility. To route plant-photo analysis explicitly through Hermes:

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

## Core API routes

- `GET /api/health-check` — database and provider health, with honest unavailable states
- `GET /api/ai/providers` — provider availability, models, and configuration status
- `POST /api/analyze` — plant-photo analysis and the agent analysis contract
- `POST /api/chat` — cultivation chat with provider fallback
- `GET /api/openclaw/status` — current OpenClaw-backed cultivation data/status
- `GET /api/lmstudio/models` — discovered LM Studio models

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
npm run build
npm test -- --runInBand
```

Additional suites are available through `npm run test:integration`, `npm run test:e2e`, `npm run test:visual`, `npm run test:security`, and `npm run test:performance`. Live provider checks require the corresponding local service; tests should report those services as unavailable rather than treating that state as a successful connection.

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
