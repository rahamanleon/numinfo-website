# Dora-Agent on Render Free Tier

Complete guide to deploy Dora-Agent on Render's free tier with maximum reliability.

---

## Key Free Tier Limitations

| Limit | Value | Impact |
|-------|-------|--------|
| Sleep after idle | 15 minutes | Cold starts on each request |
| Sleep after deploy | 15 minutes | No background processes |
| Max instance RAM | 512 MB | Memory-intensive ops fail |
| Max CPU | 0.5 vCPU | Slower AI responses |
| No persistent disk | - | No local file storage |
| Max execution | 30 seconds | Timeout for long requests |
| Outbound bandwidth | 100 MB/month | Use sparingly |

---

## Critical Best Practices for Free Tier

### 1. Port Binding (MANDATORY)

Render free tier REQUIRES your app to:
- Bind to the `PORT` environment variable
- Use port `10000` as default
- Listen on `0.0.0.0` (not `localhost`)

```javascript
const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
```

### 2. Health Check Endpoint (KEEP ALIVE)

Free tier sleeps after 15 min idle. You need:

```javascript
// Health check endpoint - Render calls this to keep alive
app.get("/ping", (_, res) => {
  res.json({ 
    pong: true, 
    ts: Date.now(),
    uptime: process.uptime()
  });
});
```

**Set health check in Render dashboard:**
- Path: `/ping`
- This prevents cold starts on first request

### 3. Graceful Shutdown

```javascript
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
```

### 4. Memory Management

Free tier has 512MB RAM limit:
- Clear caches periodically
- Limit concurrent requests
- Avoid loading large datasets
- Set reasonable timeouts

```javascript
const MAX_CACHE_SIZE = 100; // Limit in-memory cache
const REQUEST_TIMEOUT = 20000; // ms

// Cleanup old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, val] of _cache) {
    if (now - val.ts > CFG.CACHE_TTL) {
      _cache.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanCache, 5 * 60 * 1000);
```

### 5. Handle Cold Starts

First request after sleep is slow (up to 30 seconds). Design for this:

```javascript
// Separate startup from request handling
let server;

// Initialize everything before starting
async function init() {
  console.log("Initializing...");  // Run at startup, not per-request
}

// Start server only after init
init().then(() => {
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ready on port ${PORT}`);
  });
});
```

### 6. No Persistent Disk

Free tier has NO persistent disk. DO NOT:
- Write to local files for storage
- Store session data in local files
- Use local file-based databases

DO instead:
- Use environment variables for config
- Use external services (Redis, PostgreSQL) for data
- Keep all state in memory (for single-instance)

### 7. Timeout Handling

```javascript
const WITH_TIMEOUT_MS = 20000; // Less than 30s limit

function withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), ms)
    )
  ]);
}

// Usage
app.post("/chat", async (req, res) => {
  try {
    const result = await withTimeout(agentLoop(messages), WITH_TIMEOUT_MS);
    res.json(result);
  } catch (err) {
    if (err.message === "Timeout") {
      res.status(504).json({ error: "Request timeout" });
    } else {
      res.status(500).json({ error: "Internal error" });
    }
  }
});
```

---

## Deployment Checklist

### Before Deploy

- [ ] Set `PORT` environment variable (default 10000)
- [ ] Remove hardcoded API keys (use env vars)
- [ ] Add `/ping` health check endpoint
- [ ] Add graceful shutdown handler
- [ ] Set `NODE_ENV=production`
- [ ] Increase timeout values (25s for AI calls)
- [ ] Test locally: `npm start`

### In Render Dashboard

1. **Create Web Service**
   - Branch: main (or your choice)
   - Region: Oregon (closest to most users)
   - Instance Type: Free

2. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   OLLAMA_API=your_api_url
   OLLAMA_KEY=your_api_key
   MODEL=kimi-k2.5:cloud
   ```

3. **Set Health Check**
   - Path: `/ping`
   - This keeps your service "warm"

4. **Configure Auto-Deploy**
   - Enable for easy updates

### After Deploy

- [ ] Test `/ping` endpoint
- [ ] Test `/chat` with a simple message
- [ ] Test web search functionality
- [ ] Test weather tool
- [ ] Monitor logs for errors
- [ ] Check memory usage

---

## Free Tier Sleep Behavior

Render free tier instances sleep after 15 minutes of inactivity. This means:

| Scenario | Behavior |
|----------|----------|
| First request after sleep | 10-30 second cold start |
| During cold start | Requests queue or timeout |
| After cold start | Normal response |

### Mitigations

1. **Uptime Robot (FREE)**
   - Ping `/ping` every 5 minutes
   - https://uptimerobot.com

2. **Render Health Check**
   - Set `healthCheckPath: /ping`
   - Render pings automatically

3. **GitHub Actions (FREE)**
   - Cron job to ping your service daily

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 10000 | HTTP server port |
| `NODE_ENV` | Yes | production | Runtime mode |
| `OLLAMA_API` | Yes | - | AI model API endpoint |
| `OLLAMA_KEY` | Yes | - | API authentication key |
| `MODEL` | No | kimi-k2.5:cloud | AI model name |
| `TIMEOUT_MS` | No | 25000 | Request timeout |

---

## Troubleshooting

### Deploy Fails

1. Check build logs
2. Ensure `package.json` has correct `start` script
3. Verify `node_modules` is in `.gitignore`
4. Check `PORT` is set to `10000`

### Instance Sleeps

1. Verify health check path is `/ping`
2. Use external uptime monitor (UptimeRobot)
3. Check Render status page

### Memory Errors

1. Reduce cache size
2. Limit concurrent requests
3. Add memory cleanup intervals
4. Reduce log verbosity

### Timeout Errors

1. Increase timeout values
2. Simplify AI model calls
3. Reduce search result count
4. Add caching for repeated queries

### SSL/HTTPS Issues

Render provides free SSL automatically. No action needed.

---

## Alternative: Upgrade to Starter

If you need persistent uptime, upgrade to Render Starter ($7/month):
- No sleep
- 512 MB RAM → 1 GB RAM
- 0.5 vCPU → 1 vCPU
- Custom domains with SSL
- No cold starts

---

## Security Notes

1. **Never commit secrets**
   - Use environment variables
   - Add `config.local.json` to `.gitignore`

2. **API Keys**
   - Rotate keys periodically
   - Use least-privilege access

3. **Rate Limiting**
   - Add rate limiting middleware
   - Monitor for abuse

4. **Logging**
   - Don't log sensitive data
   - Sanitize errors before logging

---

## Performance Tips

1. **Caching**
   - Cache search results (5-15 min TTL)
   - Cache weather data (10-30 min TTL)
   - Limit cache size to prevent memory issues

2. **Connection Pooling**
   - Reuse HTTP connections
   - Set reasonable timeouts

3. **Response Compression**
   ```javascript
   const compression = require("compression");
   app.use(compression());
   ```

4. **Reduce Cold Start Time**
   - Lazy-load heavy modules
   - Pre-warm caches on startup

---

## Quick Reference

```bash
# Local development
npm install
npm start

# Test health check
curl https://your-app.onrender.com/ping

# Test chat endpoint
curl -X POST https://your-app.onrender.com/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

---

## Support

- Render Docs: https://render.com/docs
- Discord: https://render.com/discord
- GitHub: https://github.com/render-examples