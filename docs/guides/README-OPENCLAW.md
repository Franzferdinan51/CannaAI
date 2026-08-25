# CannaAI and OpenClaw

CannaAI and OpenClaw are separate programs. CannaAI owns the cultivation API and dashboard; OpenClaw owns agent identity, Gateway authentication, tool permissions, and model routing.

## Active transport

CannaAI connects to the authenticated OpenClaw Gateway through ACP. It does not require an OpenAI-compatible bridge and should not be pointed at an invented `/v1/chat/completions` endpoint on the Gateway port.

Check the local Gateway before troubleshooting CannaAI:

```bash
openclaw gateway status --json
openclaw skills list | grep cannaai
```

The configured agent profile defaults to `main` and can be changed with `OPENCLAW_AGENT_ID`. Set `OPENCLAW_ACP_URL` only when the local OpenClaw installation exposes ACP at a non-default endpoint. CannaAI also supports `OPENCLAW_MODEL` as the requested model hint.

## Install the CannaAI skill

From a CannaAI checkout:

```bash
ln -sf "$PWD/openclaw-skill" ~/.openclaw/skills/cannaai
openclaw skills list | grep cannaai
```

The skill lets an OpenClaw agent use CannaAI’s cultivation operations. The agent can ask for room conditions, strain information, growth tracking, and harvest guidance. For a phone-camera workflow, the agent may capture an image and submit it to CannaAI’s `/api/analyze` route.

## Direct CannaAI API

The agent-facing plant-analysis contract is documented in [`../developer/api/agent-analysis-contract.md`](../developer/api/agent-analysis-contract.md). A minimal image request is:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "image": "data:image/jpeg;base64,<base64-image>",
    "analysisType": "plant_health",
    "growthStage": "flowering"
  }'
```

`image` and `plantImage` accept a data URL or raw base64. Optional context includes `plantId`, `roomId`, `strain`, `growthStage`, and environmental readings. The response includes diagnosis, severity, confidence, health score, provider metadata, and the versioned agent-analysis contract.

Useful routes:

```bash
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/openclaw/status
curl http://localhost:3000/api/ai/providers
```

## Provider behavior

OpenClaw is one provider among the local-first options. LM Studio is the default local provider when available. Hermes is a separate provider with its own API server or proxy. CannaAI reports provider availability independently and falls back only when the selected provider cannot complete the request.

For photo analysis, set an explicit provider when needed:

```dotenv
CANNAAI_IMAGE_PROVIDER="openclaw"
```

If the photo must be handled by a local LM Studio vision model, leave the override unset and configure `LM_STUDIO_BASE_URL`, `LM_STUDIO_VISION_MODEL`, and `LM_STUDIO_TEXT_MODEL`.

## Remote phone access

For a phone or remote agent, expose the CannaAI server through a trusted HTTPS or Tailscale address. In production, set explicit allowed origins and authentication tokens:

```dotenv
SOCKET_IO_ORIGINS="https://your-cannaai-host.example"
CANNAAI_API_TOKEN="use-a-long-random-token"
SOCKET_IO_TOKEN="use-a-long-random-token"
```

Do not expose a development server or OpenClaw credentials directly to the public internet. The phone agent should call CannaAI’s authenticated API; it should not connect to OpenClaw’s Gateway port as if it were a public application API.

## Troubleshooting

1. Check `openclaw gateway status --json` and confirm the Gateway is running.
2. Check `curl http://localhost:3000/api/health-check` and inspect the `openclaw` component.
3. Check `curl http://localhost:3000/api/ai/providers` for the selected provider and discovered models.
4. Confirm the CannaAI process can resolve the configured OpenClaw executable and ACP endpoint.
5. For image failures, confirm the agent submitted a non-empty data URL/base64 payload and that the selected provider supports vision.

The old `openclaw-bridge/` folder is retained as a legacy reference only. Do not run it on the OpenClaw Gateway port. Agent Evolver and model-conversion tooling are not part of the active application.
