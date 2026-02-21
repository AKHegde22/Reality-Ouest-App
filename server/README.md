# Reality API Server

This server provides the real AI endpoints for the mobile app:

- `POST /api/v1/scan` -> generate quests from a before photo
- `POST /api/v1/verify` -> compare before/after photos for completion
- `GET /health` -> server/model status

Current implementation feeds compact image fingerprint descriptors to Cerebras and requests strict JSON outputs.

## Env Vars

- `CEREBRAS_API_KEY` (required for cloud mode)
- `CEREBRAS_MODEL` (default: `gpt-oss-120b`)
- `CEREBRAS_API_BASE_URL` (default: `https://api.cerebras.ai/v1`)
- `PORT` (default: `8787`)
- `HOST` (default: `0.0.0.0`)
- `CORS_ORIGIN` (default: `*`)

## Run

```bash
npm run server:start
```

The server reads `.env` from the project root automatically.

Error responses include a `requestId` field for tracing.
