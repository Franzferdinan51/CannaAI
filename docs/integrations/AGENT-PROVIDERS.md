# Agent providers

CannaAI's advisor workflow uses the bounded three-stage design from
[local-moa-advisors-mcp](https://github.com/Franzferdinan51/local-moa-advisors-mcp):
planner, skeptic, and aggregator. The in-app implementation routes those
stages through whichever connected provider is healthy.

## OpenClaw

Reference: [OpenClaw](https://github.com/openclaw/openclaw), [model providers](https://docs.openclaw.ai/concepts/model-providers), and [Gateway RPC](https://docs.openclaw.ai/reference/rpc).

OpenClaw is invoked through its supported CLI so its current
gateway routing, OAuth sessions, model selection, and provider credentials stay
inside OpenClaw. CannaAI never stores or displays those credentials.

The Settings page now launches the native flows directly:

```bash
openclaw models auth login --agent main --provider openai --method oauth
openclaw models auth login --agent main --provider xai --method oauth
```

After completing the browser login, use **Check** in Settings. CannaAI reads
the OpenClaw auth profile store; it does not treat an installed CLI as proof of
authentication. OpenAI uses OpenClaw's current `openai` provider id;
`openai-codex` is legacy. Grok uses `xai`.

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

Hermes is invoked through its supported one-shot CLI (`hermes -z`) and uses the
provider configured in Hermes. CannaAI does not attempt to reproduce Hermes'
OAuth or provider credential store.

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

The CannaAI Hermes bridge uses Hermes' supported one-shot interface
(`hermes -z ... --cli`) and never copies credentials into CannaAI. The UI
reports native CLI/credential status rather than treating installation as
proof of authentication.

## Transport contract

OpenClaw is connected through its supported Gateway CLI bridge
(`openclaw infer model run --gateway --json`), which uses the running Gateway's
WebSocket/RPC transport and current model routing. Hermes is connected through
its supported one-shot CLI; its `hermes serve`/`hermes proxy` endpoints are
optional external integrations, not required for CannaAI's local bridge.

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
