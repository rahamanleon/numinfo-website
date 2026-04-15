# Render Free Tier Optimization Guide

## Critical Requirements for Free Tier Success

### 1. Key Limitations to Accept
- **Spins down after 15 min idle** - Expect ~1 min wake-up delay
- **Free Postgres expires 30 days** - Use external DB if needed
- **750 instance hours/month** - Service counts only when running
- **Ephemeral filesystem** - All local data lost on redeploy
- **No persistent disks** on free tier
- **No SSH shell access**

### 2. Must-Have Features (Already Implemented)
- ✅ Health check endpoint `/ping`
- ✅ Bind to `0.0.0.0` (not localhost)
- ✅ PORT from environment variable
- ✅ Graceful shutdown handlers
- ✅ Memory-limited cache (MAX_CACHE: 100)
- ✅ Cache TTL cleanup

### 3. Recommended Optimizations (New)

#### 3.1 Faster Health Check Response
The health check MUST respond within 5 seconds or Render considers the service unhealthy.

**Current status:** ✅ `/ping` endpoint is fast and lightweight

#### 3.2 Memory Management
Free tier has memory limits. Current cache limit of 100 entries is good.

**Current status:** ✅ Already has memory monitoring and cleanup

#### 3.3 Search Timeout Optimization
9-second search timeout might cause issues. Recommend reducing to 7 seconds.

### 4. Environment Variables Setup (Required)

In Render Dashboard, set these secret environment variables:

```
OLLAMA_API = your_ollama_api_url
OLLAMA_KEY = your_api_key
MODEL = kimi-k2.5:cloud (or your preferred model)
PORT = 10000
TIMEOUT_MS = 25000
NODE_ENV = production
```

### 5. Deployment Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Render"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Connect to Render**
   - Go to https://dashboard.render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Select the following settings:
     - **Region**: Oregon (or nearest to you)
     - **Instance Type**: Free
     - **Branch**: main
     - **Root Directory**: (leave empty)
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`

3. **Set Environment Variables**
   - In Render dashboard, go to Environment
   - Add all required variables (see section 4 above)
   - Mark OLLAMA_API and OLLAMA_KEY as "Secret"

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment
   - Monitor logs for any errors

### 6. Keep-Alive Strategy

Since free tier spins down after 15 minutes idle:

**Option A: External Uptime Monitor (Recommended)**
Use a free service like:
- UptimeRobot (free tier: 50 monitors)
- Freshping
- Pingometer

Set up a monitor to hit your `/ping` endpoint every 5 minutes.

**Option B: Render Cron + Internal Ping**
Not available on free tier (Cron requires paid tier).

**Option C: GitHub Actions + Scheduled Ping**
```yaml
# .github/workflows/ping.yml
name: Keep-Alive Ping
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping service
        run: curl -f https://your-service.onrender.com/ping || true
```

### 7. Database Considerations

**For persistent data, options are:**

1. **Render Free Postgres** (expires 30 days)
   - Good for testing
   - Use for temporary data

2. **External Database Services**
   - Supabase (free tier: 500MB)
   - MongoDB Atlas (free tier: 512MB)
   - PlanetScale (free tier)
   - Neon (free tier: 3GB)

3. **No Database Needed**
   - Current app doesn't require persistent storage
   - All data is computed on-demand

### 8. Monitoring & Debugging

1. **View Logs**
   - In Render dashboard → Your service → Logs
   - All console.log output appears here

2. **Check Health**
   - Visit `https://your-service.onrender.com/ping`
   - Should return JSON with `pong: true`

3. **Memory Usage**
   - Health check returns cache size
   - Monitor `heapUsed` in logs (every 5 minutes)

### 9. Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Service won't start | Port binding error | Ensure PORT env var is set to 10000 |
| Health check failing | App crash | Check logs, ensure graceful shutdown works |
| Slow responses | Cold start | Add uptime monitor, expect ~1 min wake time |
| Out of memory | Cache too large | MAX_CACHE is already limited to 100 |
| Search timeout | Network issues | Reduce search timeout in server.js |

### 10. Security Checklist

- [x] API keys in environment variables (not in code)
- [x] No hardcoded credentials in server.js
- [x] CORS configured
- [x] No sensitive data in logs
- [ ] Consider rate limiting (not critical for personal use)

### 11. Cost Optimization

**Staying within Free Tier Limits:**
- 750 hours/month covers running 24/7 if only 1 service
- Bandwidth: 100GB outbound/month included
- Build minutes: 500 minutes/month included

**If approaching limits:**
- Reduce build frequency
- Use caching aggressively (already done)
- Disable debug mode in production

### 12. Scaling Path

When ready to upgrade:
1. Change instance type to Starter ($7/month)
2. Add persistent disk if needed
3. Enable auto-scaling
4. Consider paid database

---

## Quick Reference: Render Free Tier Do's and Don'ts

### DO:
- ✅ Use health check endpoint (already done)
- ✅ Set graceful shutdown handlers (already done)
- ✅ Keep memory usage low (already done)
- ✅ Use external uptime monitor
- ✅ Set environment variables as secrets
- ✅ Monitor monthly usage in Render dashboard

### DON'T:
- ❌ Store files locally (lost on redeploy)
- ❌ Use SQLite without persistent disk
- ❌ Expect 24/7 instant response
- ❌ Exceed 750 instance hours
- ❌ Commit API keys to git

---

## Testing Locally Before Deploy

```bash
# Test health check
curl http://localhost:10000/ping

# Test chat endpoint
curl -X POST http://localhost:10000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test with debug mode
curl -X POST http://localhost:10000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"debug":true}'
```

---

## Expected Behavior on Free Tier

1. **Initial Deploy**: Service starts, health check passes
2. **Idle 15 min**: Service spins down (stops consuming hours)
3. **First Request After Idle**: ~1 min cold start, then responds
4. **Active Period**: Normal response times
5. **Month Reset**: Instance hours reset to 750

This is the expected and designed behavior. The service is NOT broken - it's sleeping to conserve resources.