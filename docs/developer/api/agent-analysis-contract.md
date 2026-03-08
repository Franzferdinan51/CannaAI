# Agent Analysis Contract (v1)

This contract standardizes `/api/analyze` for **agent-to-agent consumption** so downstream automations can safely parse richer analysis details.

- **Contract ID:** `cannaai.analysis.agent.v1`
- **Contract Version:** `1.0.0`
- **Schema:** `docs/developer/api/schemas/analysis-agent-contract.schema.json`
- **Compatibility:** Additive over existing `analysis` payload (no hard breaking removals)

## 1) Envelope

The API response now includes contract metadata:

```json
{
  "success": true,
  "analysis": {
    "contractId": "cannaai.analysis.agent.v1",
    "contractVersion": "1.0.0",
    "diagnosis": "...",
    "severity": "moderate",
    "confidence": 82,
    "healthScore": 68,
    "urgency": "high",
    "priorityActions": ["..."],
    "agentSignals": {
      "severityPolicy": { "level": "moderate", "numeric": 2, "decisionBasis": ["deficiency_progression"] },
      "scoringRubric": { "score": 68, "band": "fair", "components": { "vigor": 70, "leafCondition": 60, "pestDiseaseLoad": 65, "environmentFit": 75, "stageFit": 70, "rootHealth": 68 } },
      "confidenceBand": { "value": 82, "band": "high", "meetsAutomationThreshold": true },
      "alert": { "shouldTrigger": true, "priority": "warning", "reasons": ["severity_severe"], "recommendedSlaMinutes": 240 }
    }
  },
  "metadata": {
    "analysisId": "...",
    "timestamp": "...",
    "contract": {
      "id": "cannaai.analysis.agent.v1",
      "version": "1.0.0",
      "schemaPath": "/docs/developer/api/schemas/analysis-agent-contract.schema.json"
    }
  }
}
```

## 2) Severity policy (deterministic interpretation)

| Level | Numeric | Meaning | Typical action |
|---|---:|---|---|
| `mild` | 1 | Cosmetic / early signal | Continue routine checks |
| `moderate` | 2 | Action needed soon | Apply treatment plan within 24h |
| `severe` | 3 | Material risk to yield/plant | Immediate intervention + alert |
| `critical` | 4 | Acute failure/spread/loss risk | Emergency alert + human escalation |

**Decision basis tokens** (`decisionBasis`) document why the level was chosen (e.g., `high_spread_risk`, `rapid_deterioration`).

## 3) Scoring rubric policy

`agentSignals.scoringRubric.score` is 0–100 and maps to:

- `excellent`: 85–100
- `good`: 70–84
- `fair`: 55–69
- `poor`: 40–54
- `critical`: 0–39

Component fields correspond to the existing health-score model:
- vigor (25%), leafCondition (20%), pestDiseaseLoad (20%), environmentFit (15%), stageFit (10%), rootHealth (10%)

## 4) Confidence thresholds

| Band | Range | Automation guidance |
|---|---:|---|
| `low` | < 60 | Do not automate irreversible actions; require human review |
| `medium` | 60–74 | Allow low-risk actions only |
| `high` | 75–89 | Standard automation allowed |
| `very_high` | ≥ 90 | High-trust automation allowed |

`meetsAutomationThreshold` should be true at `>= 75` unless overridden by local risk policy.

## 5) Alert trigger policy

Set `agentSignals.alert.shouldTrigger=true` when any of:
1. `severity in [severe, critical]`
2. `healthScore < 40`
3. `urgency == critical`
4. rapid worsening detected (`visualChanges.changeType=worsening` and `progressionRate in [fast, rapid]`)
5. disease `spreadRisk == high`
6. confidence < 60 for high-impact diagnosis (prompt human review alert)

Priority mapping:
- `critical` if severity `critical` OR healthScore `< 25`
- `warning` if severity `severe` OR healthScore `< 40`
- `info` for harvest-window or low-confidence review reminders

## 6) Migration notes for existing consumers

Current consumers using only:
- `analysis.diagnosis`
- `analysis.confidence`
- `analysis.severity`
- `analysis.healthScore`

remain compatible.

### Minimal migration steps
1. **Gate on contract version**: if `metadata.contract.id/version` present, validate against schema.
2. **Prefer `agentSignals`** for automation/alerts instead of ad-hoc parsing.
3. **Fallback behavior**: if `agentSignals` absent, use legacy thresholds (`severity` + `healthScore` + `confidence`).

### Suggested compatibility logic
- Treat unknown contract versions as **read-only** (no auto-remediation).
- Keep old fields as source of truth during rollout; compare against `agentSignals` for 1–2 release cycles.

## 7) Rollout plan

- **Phase 1 (current):** expose schema + metadata contract tags (additive).
- **Phase 2:** populate `agentSignals` directly in API responses.
- **Phase 3:** make agent consumers require contract-aware validation for write/actuate paths.
