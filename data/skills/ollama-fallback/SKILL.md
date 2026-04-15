# Ollama Fallback Skill

## Overview
Ollama API client with **automatic fallback to backup key** when primary hits HTTP 429 (rate limit).

## Architecture

```
┌──────────────┐     POST /api/generate      ┌─────────────┐
│ User Request │ ────────────────────────────▶ │   Ollama    │
└──────────────┘                              └─────────────┘
                                                    │
                                               HTTP 429?
                                                    │
                           ┌────────────────────────┘
                           │ Yes
                           ▼
                    ┌─────────────┐
                    │ Switch to   │
                    │ Backup Key  │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Retry     │
                    └─────────────┘
                           │
                           ▼
              ┌────────────────────┐
              │  Both keys failed? │
              └────────────────────┘
                     │
              Yes ───┼─── No
              ▼           ▼
         ┌────────┐    ┌─────────┐
         │ Error  │    │ Success │
         └────────┘    └─────────┘
```

## Files

| File | Purpose |
|------|---------|
| `ollama_client.py` | Main client with retry logic |
| `test_rate_limit.py` | Test rate limit handling |

## Configuration

### Primary Key
```bash
export OLLAMA_PRIMARY_TOKEN="your_primary_token_here"
```

### Backup Key (Hardcoded)
```
6ba262d810474075ba9a880ca0af.BxlSYMDcBB5dr2U09L22DP1G
```

## Usage

### Python
```python
from ollama_client import OllamaClient

client = OllamaClient()
result = client.request("What is the capital of France?")
print(result['response'])
```

### CLI
```bashpython ollama_client.py "Your prompt here"```

## API Methods

### `request(prompt, model="llama3.2", stream=False)`
Generate completion with automatic retry.

**Returns:** `dict` with `response` key

### `chat(messages, model="llama3.2")`
Chat completion API.

**Parameters:**
- `messages`: List of `{role, content}` dicts

## Rate Limit Handling

| Status | Action |
|--------|--------|
| HTTP 200 | Return result |
| HTTP 429 | Switch key, retry with backoff |
| Other 4xx/5xx | Raise error |

**Backoff:** Exponential (1s, 2s, 4s)

**Max Retries:** 3 per key

## Error Codes

| Error | Cause |
|-------|-------|
| "Both keys rate limited" | HTTP 429 on primary and backup |
| "Max retries exceeded" | Network or other failures |

## Version
1.1.0 - Fixed HTTP 429 handling with proper key switching
