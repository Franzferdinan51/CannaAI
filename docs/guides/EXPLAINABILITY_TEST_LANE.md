# Explainability Test Lane

This lane verifies that plant analysis responses always include a populated explainability contract, even when providers return sparse JSON or raw text.

## Coverage

### Synthetic payload tests

`tests/unit/analyze-explainability-contract.test.ts` covers three realistic payload shapes:

- Structured JSON string for a nutrient-deficiency analysis
- Sparse object payload for an image-backed mildew diagnosis
- Raw text fallback from a provider that did not return JSON

Each case is normalized through `normalizePlantAnalysisResult()` and must emit non-empty values for:

- `urgencyReasons`
- `healthScoreBreakdown`
- `detectedIssues`
- `environmentRiskAssessment`
- `prioritizedActionPlan`
- `likelyCauses`
- `evidenceObservations`
- `uncertainties`
- `recommendations`
- `reportVersion`
- `reportSchemaVersion`

### Optional real-image API check

`scripts/run-explainability-lane.ts` can also hit a live `/api/analyze` endpoint with a real image and verify the same contract plus image-specific explainability:

- `imageAnalysis.hasImage === true`
- `imageAnalysis.visualFindings` is non-empty

## Running The Lane

Synthetic-only run:

```bash
npm run test:explainability
```

Synthetic plus live real-image API check:

```bash
EXPLAINABILITY_API_URL=http://127.0.0.1:3000 \
EXPLAINABILITY_REAL_IMAGE_PATH=/absolute/path/to/plant-photo.jpg \
npm run test:explainability
```

Optional environment variables:

- `EXPLAINABILITY_API_URL`: Base URL or full `/api/analyze` URL. Default: `http://127.0.0.1:3000`
- `EXPLAINABILITY_REAL_IMAGE_PATH`: Absolute or relative path to a real plant image
- `EXPLAINABILITY_API_TIMEOUT_MS`: Request timeout for the live API check. Default: `120000`

## Matrix Output

The script prints a single pass/fail matrix with one row per synthetic assertion plus one row for the live image check.

Example:

```text
Explainability Pass/Fail Matrix
Status | Lane       | Scenario                                     | Notes
------+------------+----------------------------------------------+----------------------------------------
PASS  | synthetic  | fills explainability fields ...              | Explainability fields populated
PASS  | synthetic  | derives explainability fields ...            | Explainability fields populated
PASS  | synthetic  | preserves fallback text ...                  | Explainability fields populated
SKIP  | real-image | live /api/analyze explainability check       | Set EXPLAINABILITY_REAL_IMAGE_PATH ...
```

## Last Verification

Verified on `2026-03-08` with `npm run test:explainability`.

| Status | Lane | Scenario | Notes |
|--------|------|----------|-------|
| PASS | synthetic | fills explainability fields for a realistic structured JSON nutrient payload | Explainability fields populated |
| PASS | synthetic | derives explainability fields for a sparse realistic image-backed mildew payload object | Explainability fields populated |
| PASS | synthetic | preserves fallback text and still emits explainability fields for unstructured provider output | Explainability fields populated |
| SKIP | real-image | live `/api/analyze` explainability check | No `EXPLAINABILITY_REAL_IMAGE_PATH` was provided during verification |

## Notes

- The live real-image row is intentionally `SKIP` when no image path is provided.
- `/api/analyze` now normalizes all provider outputs through the report-v2 explainability contract before responding.
- The reusable validation logic lives in `tests/utils/explainability-contract.ts`.
