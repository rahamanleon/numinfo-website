# Dora-Agent

AI assistant with web search and weather tools, optimized for Render Free Tier deployment.

## Features

- Web search (Google + Bing fallback)
- Weather info (wttr.in + Open-Meteo)
- AI-powered responses via configurable model
- Memory-efficient caching for free tier
- Health check endpoint for keep-alive
- Graceful shutdown handling

## Deploy to Render (Free Tier)

### One-Click Deploy

[![Deploy to Render](https://render.com/image/deploy-by-render.svg)](https://render.com/deploy)

### Manual Deploy

1. **Fork this repo to GitHub**

2. **Create Render account** at https://render.com

3. **Create Web Service**
   - Connect GitHub repo
   - Branch: `main`
   - Region: Oregon (or nearest to users)
   - Instance Type: Free
   - Build Command: `npm install`
   - Start Command: `node server.js`

4. **Set Environment Variables** in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   OLLAMA_API=https://your-api.com/api/chat
   OLLAMA_KEY=your_api_key
   MODEL=kimi-k2.5:cloud
   ```

5. **Set Health Check**
   - Path: `/ping`
   - This keeps service from sleeping

6. **Deploy**

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 10000 | HTTP server port |
| `NODE_ENV` | Yes | production | Runtime mode |
| `OLLAMA_API` | Yes | - | AI model API endpoint |
| `OLLAMA_KEY` | Yes | - | API authentication key |
| `MODEL` | No | kimi-k2.5:cloud | AI model name |
| `TIMEOUT_MS` | No | 25000 | Request timeout |

## API Endpoints

### POST /chat

Send a chat message.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

**Response:**
```json
{
  "bot": "Dora-Agent",
  "reply": "Hello! How can I help you?",
  "used_tools": [],
  "steps": 1,
  "time_ms": 150
}
```

### GET /ping

Health check endpoint. Returns:
```json
{
  "pong": true,
  "ts": 1234567890,
  "uptime": 3600,
  "env": "production",
  "cacheSize": 5
}
```

### GET /

Returns service info.

## Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Test
curl http://localhost:10000/ping
curl -X POST http://localhost:10000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Free Tier Tips

See [RENDER_FREQUENTLY_ASKED.md](RENDER_FREQUENTLY_ASKED.md) for:
- Sleep behavior and keep-alive strategies
- Memory management
- Timeout handling
- Troubleshooting

## License

MIT