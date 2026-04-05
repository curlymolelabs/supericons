# Converter Node Proof Service Contract

## Purpose

This is a narrow local proof service for validating a Node-hosted `PNG -> SVG` path using `@neplex/vectorizer`.

It is not production-integrated yet.

## Name

- `converter-proof-service`

## Caller

- local developer tools
- local smoke scripts
- future frontend spike clients

## Method And Path

- `GET /health`
- `POST /api/convert/png-to-svg`

## Auth And Permissions

- none
- local development only

## Request Shape

### `POST /api/convert/png-to-svg`

Required fields:

- `imageBase64`
  - raw base64 string or data URL
- `mimeType`
  - currently `image/png` only

Optional fields:

- `qualityMode`
  - `compact`
  - `exact`
  - `auto`

Validation rules:

- request body must be valid JSON
- image payload must decode from base64
- mime type must be `image/png`
- `auto` is currently resolved conservatively to `exact`

## Response Shape

### Success `200`

```json
{
  "svg": "<svg ...>",
  "engine": {
    "name": "@neplex/vectorizer",
    "family": "VTracer",
    "runtime": "node-native",
    "requestedMode": "exact",
    "resolvedMode": "exact",
    "colorMode": "color"
  },
  "metrics": {
    "sizeBytes": 12345,
    "sizeKb": 12,
    "pathCount": 42,
    "shapeCount": 42,
    "viewBox": "0 0 128 128",
    "elapsedMs": 95
  },
  "warnings": []
}
```

### Failure `400`

```json
{
  "error": "message"
}
```

## Side Effects

- no persistence
- no database writes
- no external network calls

## Failure Modes

- invalid JSON body
- unsupported mime type
- invalid base64 payload
- conversion engine error

## Local Commands

- start service:
  - `npm run converter:proof-service`
- run smoke client:
  - `npm run converter:proof-smoke`
