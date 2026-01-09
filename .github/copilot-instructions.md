# Pollinations.ai API Specification

## Project Overview
This repository contains the OpenAPI 3.1.0 specification (`api.yaml`) for the Pollinations.ai API gateway at `https://gen.pollinations.ai`. It documents endpoints for AI-powered image, video, and text generation.

## API Architecture

### Core Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/image/{prompt}` | Image/video generation (flux, veo, seedance models) |
| `/text/{prompt}` | Simple text generation |
| `/v1/chat/completions` | OpenAI-compatible chat completions |
| `/v1/models`, `/image/models`, `/text/models` | Model discovery |

### Authentication
Two key types exist:
- **Publishable Keys (`pk_`)**: Client-side, IP rate-limited
- **Secret Keys (`sk_`)**: Server-side, no rate limits, can spend Pollen

Auth via `Authorization: Bearer YOUR_API_KEY` header or `?key=YOUR_API_KEY` query param.

## Editing Guidelines

### OpenAPI Schema Conventions
- Follow OpenAPI 3.1.0 specification strictly
- Use `$ref` for reusable schemas in `components/schemas/`
- Include `description` for all parameters and responses
- Provide realistic `example` values for path/query parameters

### Common Patterns in This Spec
```yaml
# Error responses follow this structure:
error:
  code: "ERROR_CODE"
  message: "Human readable message"
  timestamp: "ISO timestamp"
  details: { ... }
```

### Model Enums
When adding new AI models, update the `enum` lists in:
- `/image/{prompt}` → `model` query parameter
- `/text/{prompt}` → `model` query parameter

### Testing Changes
Validate the spec using: `npx @redocly/cli lint api.yaml`

## Quick Reference
- Base URL: `https://gen.pollinations.ai`
- Dashboard: `https://enter.pollinations.ai`
- Docs edit link referenced in spec: `https://github.com/pollinations/pollinations/edit/master/enter.pollinations.ai/src/routes/docs.ts`
