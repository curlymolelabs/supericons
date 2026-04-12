# Motion Lab MCP Hosted Endpoints Spec

Date: April 12, 2026
Status: Draft for implementation
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/plans/motion-lab-mcp-hosted-boundary-adr.md`
- `docs/plans/motion-lab-mcp-local-baseline-contract.md`
- `docs/plans/motion-lab-mcp-hybrid-boundary-implementation-plan.md`
- `mcp/index.js`
- `mcp/auth.js`
- `lib/motion-lab-workflow.js`

## Problem Statement

The hosted-boundary ADR resolved the major Motion Lab boundary decisions:

- premium Motion Lab should return rendered artifacts and safe recipe data
- local MCP should use short-lived session-token auth
- premium Motion Lab calls should hard fail when hosted services are unavailable
- only a reduced local preset listing should remain in the npm package

What is still missing is the actual hosted API contract.

Without explicit endpoint shapes, the team cannot:

- replace the current local Motion Lab workflow implementation
- implement the session exchange path
- migrate MCP tools cleanly
- test whether the hybrid boundary is working

## Target User

Primary user:
- the Supericons team implementing the first protected Motion Lab premium path

User job:
- build hosted Motion Lab endpoints that preserve the current MCP UX while removing premium logic from the local package

Constraints:
- keep the endpoint contract consumer-agnostic
- avoid returning raw keyframe payloads
- preserve the current MCP parameter vocabulary where practical
- keep the first version simple enough to ship

## Goals

- define the hosted session exchange contract
- define the first three premium Motion Lab endpoint shapes:
  - recipe resolution
  - CSS render
  - animated SVG render
- define the common error contract
- define the CSS selector strategy for hosted CSS render
- give the MCP migration work a stable backend target

## Non-Goals

- implementing the hosted endpoints
- redesigning the browser consumer
- adding recommendation endpoints
- changing converter behavior
- defining public docs wording

## Endpoint Catalog

### 1. Session Exchange

`POST /v1/motion-lab/session`

Purpose:
- exchange the user API key hash for a short-lived Motion Lab session token

Request body:

```json
{
  "api_key_hash": "sha256-hex-string",
  "client": {
    "surface": "mcp",
    "version": "0.3.0"
  }
}
```

Successful response:

```json
{
  "session_token": "opaque-token",
  "token_type": "Bearer",
  "expires_at": "2026-04-12T12:00:00Z",
  "user": {
    "user_id": "user_123",
    "is_pro": true
  },
  "capabilities": {
    "motion_lab": true
  }
}
```

Rules:
- raw API keys must not be forwarded to premium Motion Lab render endpoints
- session tokens remain in memory only on the local MCP client
- token expiry should be short enough for per-call auditing but long enough to avoid noisy refresh behavior

### 2. Recipe Resolution

`POST /v1/motion-lab/recipe`

Purpose:
- return safe structured recipe data for one preset request

Request body:

```json
{
  "preset": "sweep",
  "trigger": "hover",
  "duration_ms": 500,
  "intensity_percent": 80
}
```

Successful response:

```json
{
  "recipe": {
    "preset_id": "sweep",
    "preset": "Sweep",
    "group": "Special",
    "description": "Sweeps across the icon with a lit edge.",
    "trigger": "hover",
    "duration_ms": 500,
    "intensity_percent": 80,
    "default_duration_ms": 500,
    "duration_range_ms": { "min": 200, "max": 900 },
    "default_intensity_percent": 65,
    "intensity_range_percent": { "min": 40, "max": 80 },
    "export_compatibility": {
      "css": true,
      "animated_svg": true,
      "notes": []
    },
    "technical_output_notes": [
      "Sweep relies on a directional edge reveal and reads best on clear silhouettes."
    ],
    "visual_character": "directional edge sweep",
    "emotional_tone": ["premium", "precise"],
    "recommended_contexts": ["feature-highlight", "dashboard-hover"],
    "avoid_for": ["comfort-first ambient loops"],
    "behavior": "plays while the user hovers the icon",
    "notes": [
      "Motion Lab MCP animates the icon root as a whole unit."
    ]
  },
  "source": {
    "kind": "hosted-motion-lab",
    "version": 1
  }
}
```

Rules:
- recipe responses may include rich preset-specific guidance for the requested preset only
- recipe responses must not include reusable full-library catalogs
- `preset`, `trigger`, `duration_ms`, and `intensity_percent` stay aligned with the MCP contract

### 3. CSS Render

`POST /v1/motion-lab/render/css`

Purpose:
- return rendered Motion Lab CSS for one preset request without exposing raw keyframe libraries

Request body:

```json
{
  "preset": "sweep",
  "trigger": "hover",
  "duration_ms": 500,
  "intensity_percent": 80,
  "selector": ".my-icon svg"
}
```

Alternative request body for portable output:

```json
{
  "preset": "sweep",
  "trigger": "hover",
  "duration_ms": 500,
  "intensity_percent": 80
}
```

Successful response with explicit selector:

```json
{
  "recipe": { "preset_id": "sweep", "preset": "Sweep", "group": "Special" },
  "css": "/* Supericons Motion Lab */\n.my-icon svg { ... }",
  "selector_mode": "literal"
}
```

Successful response with placeholder selector:

```json
{
  "recipe": { "preset_id": "sweep", "preset": "Sweep", "group": "Special" },
  "css": "/* Supericons Motion Lab */\n{{ICON_SELECTOR}} { ... }",
  "selector_mode": "placeholder",
  "selector_token": "{{ICON_SELECTOR}}"
}
```

Rules:
- if `selector` is provided, the endpoint returns literal CSS
- if `selector` is omitted, the endpoint must return placeholder-based CSS using `{{ICON_SELECTOR}}`
- the endpoint must not hardcode `#icon-container svg`
- CSS render does not require icon SVG input because it operates on the animation contract, not the SVG body

### 4. Animated SVG Render

`POST /v1/motion-lab/render/animated-svg`

Purpose:
- return a self-contained animated SVG for one icon and one preset request

Request body:

```json
{
  "svg": "<svg ...>...</svg>",
  "preset": "sweep",
  "trigger": "hover",
  "duration_ms": 500,
  "intensity_percent": 80,
  "color": "#ff5a1f"
}
```

Successful response:

```json
{
  "recipe": {
    "preset_id": "sweep",
    "preset": "Sweep",
    "group": "Special"
  },
  "animated_svg": "<svg ...>...</svg>",
  "applied_color": "#ff5a1f"
}
```

Rules:
- the endpoint accepts SVG markup from the caller rather than resolving icon ownership itself in v1
- this keeps Motion Lab focused on animation logic, not icon library transport
- future browser or MCP consumers may still resolve icon access separately before calling this endpoint

## Common Request Rules

- all hosted premium Motion Lab endpoints use `POST`
- all premium endpoints require `Authorization: Bearer <session_token>`
- requests are JSON
- parameter names remain snake_case to match the current MCP contract
- Supabase deployments for these endpoints must use `--no-verify-jwt` because auth is handled by `apikey` plus the Motion Lab bearer-session exchange, not by a Supabase user JWT on the function boundary

## Common Error Contract

All hosted premium Motion Lab endpoints should return structured JSON errors.

Example:

```json
{
  "error": "motion_lab_pro_required",
  "message": "Motion Lab MCP requires a Pro account.",
  "hint": "Upgrade your Supericons account or verify your API key.",
  "retryable": false
}
```

### Required error codes

- `motion_lab_auth_required`
- `motion_lab_pro_required`
- `motion_lab_invalid_request`
- `motion_lab_unsupported_preset`
- `motion_lab_unsupported_trigger`
- `motion_lab_render_failed`
- `motion_lab_service_unavailable`

### Status-code guidance

- `401` for missing or invalid session token
- `403` for valid auth without Motion Lab entitlement
- `422` for invalid request payload
- `500` for unexpected render failure
- `503` for temporary hosted unavailability

## Functional Requirements

### Requirement 1: Current MCP input compatibility

The hosted endpoints must preserve the current Motion Lab MCP parameter vocabulary:

- `preset`
- `trigger`
- `duration_ms`
- `intensity_percent`
- `color` where applicable

Acceptance signal:
- the MCP wrapper can translate current tool inputs to hosted calls without renaming fields

### Requirement 2: No raw keyframe export

The hosted endpoints must not return raw keyframe arrays, reusable full-library keyframe data, or scaling instructions that reconstruct the local engine.

Acceptance signal:
- endpoint response examples stay within rendered artifacts and safe recipe fields only

### Requirement 3: Selector-safe CSS output

The hosted CSS render endpoint must support both:

- explicit selector input
- tokenized placeholder output when no selector is supplied

Acceptance signal:
- the endpoint spec contains no hardcoded DOM selector assumption

### Requirement 4: Consumer-agnostic transport

The hosted endpoints must remain plain HTTP JSON endpoints, with no MCP-specific response envelope requirements.

Acceptance signal:
- the spec can be consumed by MCP and later browser clients without protocol redesign

## Constraints

- Motion Lab only
- do not fold converter into this spec
- do not require the browser app to adopt the endpoints yet
- do not introduce recommendation logic in v1

## Success Metrics

### Primary metric

- the MCP team can implement hosted Motion Lab calls without inventing backend contract details during the migration

Verification method:
- endpoint spec covers request shape, response shape, error shape, and auth path for all first-wave Motion Lab premium calls

### Supporting metrics

- the hosted endpoints preserve current MCP UX expectations
- the CSS render path is integration-safe
- the session exchange path supports per-call auditability

Verification methods:
- map each existing Motion Lab MCP tool to one or more hosted endpoints
- confirm CSS selector handling is explicit
- confirm bearer-token auth is defined for every premium endpoint

## Risks And Dependencies

### Risks

- recipe responses may still expose more premium guidance than desired if not curated carefully
- forcing `animate_icon` to compose multiple hosted calls may introduce latency
- keeping animated SVG input as raw SVG pushes icon-access responsibility to the caller

### Dependencies

- accepted hosted-boundary ADR
- accepted local baseline contract
- upcoming tarball-hardening work

## Open Questions

1. Should a future `POST /v1/motion-lab/render/bundle` endpoint be added if `animate_icon` composition becomes too chatty?
2. Should the session exchange endpoint return explicit scope names beyond `motion_lab:premium` in v1?
3. Should recipe responses include the full rich guidance set on day one, or should some fields roll out after the first hosted render path is stable?

## Recommended Next Step

Proceed to implementation planning for:

1. session exchange and refresh flow
2. hosted recipe endpoint
3. hosted CSS render endpoint
4. hosted animated SVG render endpoint
5. MCP wrapper migration for the four premium Motion Lab tools
