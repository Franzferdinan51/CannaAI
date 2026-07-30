# Agent providers

CannaAI's advisor workflow uses the bounded three-stage design from
[local-moa-advisors-mcp](https://github.com/Franzferdinan51/local-moa-advisors-mcp):
planner, skeptic, and aggregator. The in-app implementation routes those
stages through whichever connected provider is healthy.

## OpenClaw

OpenClaw is invoked through its supported CLI (`openclaw agent`) so its current
gateway routing, OAuth sessions, model selection, and provider credentials stay
inside OpenClaw. CannaAI never stores or displays those credentials.

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

Hermes is invoked through its supported one-shot CLI (`hermes -z`) and uses the
provider configured in Hermes. CannaAI does not attempt to reproduce Hermes'
OAuth or provider credential store.

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
