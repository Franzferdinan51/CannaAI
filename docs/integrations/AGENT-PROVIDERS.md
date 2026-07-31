# Agent providers

CannaAI's advisor workflow uses the bounded three-stage design from
[local-moa-advisors-mcp](https://github.com/Franzferdinan51/local-moa-advisors-mcp):
planner, skeptic, and aggregator. The in-app implementation routes those
stages through whichever connected provider is healthy.

## OpenClaw

Reference: [OpenClaw](https://github.com/openclaw/openclaw), [model providers](https://docs.openclaw.ai/concepts/model-providers), and [Gateway RPC](https://docs.openclaw.ai/reference/rpc).

OpenClaw is connected through its supported ACP bridge, backed by the
authenticated Gateway WebSocket. CannaAI never treats OpenClaw as a generic
HTTP model server and never stores or displays its credentials.

The Settings page now launches the native flows directly:

```bash
openclaw models auth login --agent main --provider openai --method oauth
openclaw models auth login --agent main --provider xai --method oauth
```

After completing the browser login, use **Check** in Settings. CannaAI reads
the OpenClaw auth profile store; it does not treat an installed CLI as proof of
authentication. OpenAI uses OpenClaw's current `openai` provider id;
`openai-codex` is legacy. Grok uses `xai`.

The CannaAI transport identifier is `openclaw://gateway/acp`. The actual
Gateway WebSocket URL and token are resolved from OpenClaw's own configuration
(`OPENCLAW_ACP_URL` and `OPENCLAW_GATEWAY_TOKEN` can override them for a
managed deployment).

Optional environment variables:

```text
OPENCLAW_AGENT_COMMAND=openclaw
OPENCLAW_AGENT_ID=main
OPENCLAW_MODEL=
```

Leave `OPENCLAW_MODEL` empty to use the active OpenClaw model. Select **Grok
(xAI OAuth)** in Settings to request a Grok model through the connected
OpenClaw session.

## Hermes

Reference: [Hermes Agent](https://github.com/NousResearch/hermes-agent), [Nous Portal/Tool Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway), and the native `hermes serve`/`hermes proxy` commands.

Hermes is connected through its supported credential-attaching local proxy,
not through a guessed remote base URL. CannaAI starts or reuses:

```bash
hermes proxy start --provider nous --host 127.0.0.1 --port 8645
```

The CannaAI base URL is `http://127.0.0.1:8645/v1`; the bearer value is only a
placeholder because Hermes attaches the real OAuth credentials. CannaAI does
not reproduce Hermes' OAuth or credential store.

Hermes has two distinct connection paths. `hermes portal login` is the native
Nous Portal OAuth flow. Existing pooled credentials (including OpenAI Codex,
xAI, LM Studio, and MiniMax) are discovered through `hermes auth list` and
tested with `hermes auth status <provider>`:

```bash
hermes portal login
hermes auth list
hermes auth status openai-codex
hermes auth status xai-oauth
```

The Settings page reports `hermes proxy status`, so it reflects whether the
selected upstream adapter is actually ready rather than merely checking that
the Hermes executable is installed.

## Transport contract

OpenClaw uses ACP over the running Gateway WebSocket. Hermes uses its local
OAuth proxy over HTTP. These are different transports by design:

```text
CannaAI ── ACP/stdio ──> openclaw acp ── authenticated Gateway WebSocket ──> active OpenClaw model
CannaAI ── HTTP /v1 ───> hermes proxy ── OAuth adapter ──> Nous/xAI upstream
```

```text
HERMES_AGENT_COMMAND=hermes
HERMES_MODEL=
```

Leave `HERMES_MODEL` empty to use Hermes' active model.

## Routing and diagnostics

MoA refreshes provider health before starting a run and chooses, in order:

1. A loaded LM Studio model
2. OpenClaw
3. Hermes
4. Other connected providers

The Settings provider test and `GET /api/advisors` both report the live bridge
state. A bridge being installed is not enough for a successful analysis: the
end-to-end run must still complete within the configured provider timeout.
