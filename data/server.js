"use strict";

const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// =============================================================================
// CONFIGURATION - RENDER FREE TIER OPTIMIZED
// =============================================================================
const CFG = {
  OLLAMA_API : process.env.OLLAMA_API || "https://[FILTERED].com/api/chat",
  OLLAMA_KEY : process.env.OLLAMA_KEY || "43d2f08a66dc431fa2823e3a0ef6cc7c.HXhjiNfROH_MOv1nFjJCYKIT",
  MODEL      : process.env.MODEL      || "kimi-k2.5:cloud",
  PORT       : process.env.PORT       || 10000,  // Render default port
  CACHE_TTL  : 5 * 60 * 1000,         // 5 minutes cache TTL
  MAX_CACHE  : 100,                    // Max cache entries (memory limit)
  TIMEOUT_MS : parseInt(process.env.TIMEOUT_MS) || 25000,
  NODE_ENV   : process.env.NODE_ENV    || "production",
};

// Server reference for graceful shutdown
let server;

// =============================================================================
// AGENT LOOP CORE (OpenClaw Style)
// =============================================================================
const AGENT_PROMPT = `You are Dora, an AI assistant built by Rahman Leon.

CRITICAL RULES:
1. Respond ONLY in valid JSON - NO other text
2. You have tools: web_search, weather
3. When you need live data, you MUST use a tool
4. NEVER guess facts - always search first for prices, news, current events

STRICT JSON FORMAT:

Call web_search: {"tool":"web_search","input":{"query":"search terms"}}
Call weather:    {"tool":"weather","input":{"city":"city name"}}
Final answer:    {"tool":"final","output":"your answer"}

LANGUAGE: Mirror user's language (Bangla/English)
TONE: Concise, warm, confident`;

// =============================================================================
// TOOL REGISTRY
// =============================================================================
const tools = {
  web_search: async (input) => {
    const result = await smartSearch(input.query);
    return result || "No search results found.";
  },
  weather: async (input) => {
    const result = await getWeather(input.city || "Dhaka");
    return result || "Weather data unavailable.";
  }
};

// =============================================================================
// AGENT LOOP
// =============================================================================
async function agentLoop(messages, userText) {
  const logs = [];
  const usedTools = [];
  let step = 0;
  let conversation = [...messages];
  
  while (step < 5) {
    step++;
    const stepStart = Date.now();
    
    const finalMessages = [
      { role: "system", content: AGENT_PROMPT },
      ...conversation
    ];
    
    logs.push(`Step ${step}: Calling model...`);
    
    const modelResp = await callModel(finalMessages);
    logs.push(`Step ${step}: Model responded (${Date.now() - stepStart}ms)`);
    
    let decision;
    try {
      decision = JSON.parse(modelResp.trim().replace(/^```json\s*/, "").replace(/```\s*$/, ""));
    } catch (e) {
      // Try to extract JSON
      const match = modelResp.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          decision = JSON.parse(match[0]);
        } catch (e2) {
          return { reply: "I couldn't understand. Please try again.", usedTools, logs };
        }
      } else {
        return { reply: "I couldn't understand. Please try again.", usedTools, logs };
      }
    }
    
    logs.push(`Step ${step}: Tool = ${decision.tool}`);
    
    if (decision.tool === "final") {
      return { reply: decision.output, usedTools, logs, steps: step };
    }
    
    if (tools[decision.tool]) {
      const toolStart = Date.now();
      const result = await tools[decision.tool](decision.input);
      usedTools.push(decision.tool);
      logs.push(`Step ${step}: Tool executed (${Date.now() - toolStart}ms)`);
      
      conversation.push(
        { role: "assistant", content: JSON.stringify(decision) },
        { role: "user", content: `Tool result: ${result}` }
      );
    } else {
      return { reply: `Unknown tool: ${decision.tool}`, usedTools, logs };
    }
  }
  
  return { reply: "Reached thinking limit." + (usedTools.length ? " Used: " + usedTools.join(", ") : ""), usedTools, logs, steps: step };
}

async function callModel(msgs) {
  const resp = await http.post(
    CFG.OLLAMA_API,
    { model: CFG.MODEL, stream: false, messages: msgs, options: { temperature: 0.3 } },
    { headers: { Authorization: "Bearer " + CFG.OLLAMA_KEY, "Content-Type": "application/json" }, timeout: CFG.TIMEOUT_MS }
  );
  return resp.data?.message?.content || resp.data?.choices?.[0]?.message?.content || "";
}

// =============================================================================
// WEATHER TOOL
// =============================================================================
const WMO = {
  0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
  45:"Foggy",48:"Rime fog",51:"Light drizzle",53:"Moderate drizzle",
  55:"Dense drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
  71:"Slight snow",73:"Moderate snow",75:"Heavy snow",
  80:"Slight rain showers",81:"Moderate rain showers",82:"Violent rain showers",
  95:"Thunderstorm",96:"Thunderstorm w/ hail"
};

const CITY_MAP = {
  "ঢাকা":"Dhaka","চট্টগ্রাম":"Chittagong","রাজশাহী":"Rajshahi","খুলনা":"Khulna",
  "সিলেট":"Sylhet","বরিশাল":"Barisal","ময়মনসিংহ":"Mymensingh","রংপুর":"Rangpur",
  "কুমিল্লা":"Comilla","নারায়ণগঞ্জ":"Narayanganj","গাজীপুর":"Gazipur","ফরিদপুর":"Faridpur",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function extractCity(msg) {
  for (const [bn, en] of Object.entries(CITY_MAP)) {
    if (msg.includes(bn)) return en;
  }
  const a = msg.match(/weather\s+(?:in|of|at|for)\s+([A-Za-z][A-Za-z\s]{1,25})/i);
  if (a && a[1]) return a[1].trim();
  const b = msg.match(/([A-Za-z][A-Za-z\s]{1,20}?)\s*(?:weather|আবহাওয়া)/i);
  if (b && b[1]) return b[1].trim();
  return KNOWN_CITIES_ASCII.find(c => msg.toLowerCase().includes(c)) || "Dhaka";
}

async function getWeather(city) {
  const r = await withTimeout(weatherWttr(city).catch(() => null), 7000);
  if (r) return r;
  return withTimeout(weatherOpenMeteo(city).catch(() => null), 9000);
}

async function weatherWttr(city) {
  const resp = await http.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
    headers: { "User-Agent": "Dora/2.0", Accept: "application/json" },
    timeout: 6000,
    transformResponse: [raw => {
      if (typeof raw === "string" && raw.trimStart()[0] === "<") throw new Error("HTML");
      return JSON.parse(raw);
    }]
  });
  const data = resp.data;
  const c = data?.current_condition?.[0];
  const area = data?.nearest_area?.[0];
  if (!c || !area) return null;
  
  const fcast = (data.weather || []).slice(0, 3).map(d =>
    `  ${d.date}: ${d.weatherDesc?.[0]?.value || "—"}, ↑${d.maxtempC}°C ↓${d.mintempC}°C`
  ).join("\n");
  
  const loc = `${area.areaName?.[0]?.value || city}, ${area.country?.[0]?.value || ""}`;
  return formatWeather(loc, c.temp_C, c.FeelsLikeC, c.weatherDesc?.[0]?.value || "—", c.humidity, c.windspeedKmph, c.visibility, c.uvIndex, c.cloudcover, fcast);
}

async function weatherOpenMeteo(city) {
  const geo = await http.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { timeout: 5000 });
  const loc = geo.data?.results?.[0];
  if (!loc) return null;
  
  const resp = await http.get(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,visibility" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3",
    { timeout: 6000 }
  );
  
  const cur = resp.data?.current;
  const daily = resp.data?.daily;
  if (!cur) return null;
  
  const fcast = daily?.time?.slice(0, 3).map((dt, i) =>
    `  ${dt}: ${WMO[daily.weather_code[i]] || "—"}, ↑${daily.temperature_2m_max[i]}°C ↓${daily.temperature_2m_min[i]}°C`
  ).join("\n");
  
  return formatWeather(`${loc.name}, ${loc.country || ""}`, cur.temperature_2m, cur.apparent_temperature, WMO[cur.weather_code] || `Code ${cur.weather_code}`, cur.relative_humidity_2m, cur.wind_speed_10m, cur.visibility ? (cur.visibility/1000).toFixed(1) : "N/A", "N/A", cur.cloud_cover, fcast);
}

function formatWeather(loc, tC, feelC, cond, hum, wind, vis, uv, cloud, fcast) {
  return [
    "Location    : " + loc,
    "Temperature : " + tC + "°C (feels like " + feelC + "°C)",
    "Condition   : " + cond,
    "Humidity    : " + hum + "%",
    "Wind        : " + wind + " km/h",
    "Visibility  : " + vis + " km",
    "Cloud Cover : " + cloud + "%",
    "Forecast:\n" + fcast
  ].join("\n");
}

// =============================================================================
// SEARCH ENGINE - FREE TIER OPTIMIZED (limited cache for memory)
// =============================================================================
const _cache = new Map();
const JUNK = /pinterest\.|quora\.com\/search|youtube\.com\/watch|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|google\.com\/search/i;

function cacheGet(key) {
  const hit = _cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CFG.CACHE_TTL) { _cache.delete(key); return null; }
  return hit.val;
}
function cacheSet(key, val) {
  // Free tier memory management: clear oldest if cache too large
  if (_cache.size >= CFG.MAX_CACHE) {
    const oldestKey = _cache.keys().next().value;
    _cache.delete(oldestKey);
  }
  _cache.set(key, { val, ts: Date.now() });
}

// Memory cleanup - run periodically to free memory
function cleanCache() {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, val] of _cache) {
    if (now - val.ts > CFG.CACHE_TTL) {
      _cache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
  }
  // Log memory usage for monitoring
  if (CFG.NODE_ENV === "production") {
    const memUsage = process.memoryUsage();
    console.log(`[Memory] heapUsed: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  }
}

function withTimeout(p, ms) {
  return Promise.race([Promise.resolve(p).catch(() => null), new Promise(ok => setTimeout(() => ok(null), ms))]);
}

function stripHtml(html) {
  return (html || "").replace(/<(script|style|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function topSentences(text, query, n = 6) {
  const qw = new Set((query || "").toLowerCase().split(/\s+/).filter(w => w.length > 3));
  return (text || "").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 35 && s.length < 400)
    .map(s => ({ s, sc: [...qw].filter(w => s.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.sc - a.sc).slice(0, n).map(x => x.s).join(" ");
}

function toSearchQuery(msg) {
  return (msg || "").replace(/^(what(?:'s| is| are)?|who|how|tell me|can you|please|দয়া করে|আমাকে|কী|কি|কে|কীভাবে)\s+/i, "").replace(/\?+$/, "").trim().slice(0, 120);
}

async function smartSearch(rawQuery) {
  const query = toSearchQuery(rawQuery);
  const cacheKey = query.toLowerCase();
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  
  const results = await withTimeout(fetchSearchResults(query), 9000);
  if (!results || !results.length) return null;
  
  const pages = await Promise.all(results.slice(0, 3).map(r => withTimeout(fetchPage(r.url, query), 4000)));
  
  const body = results.slice(0, 4).map((r, i) => {
    const lines = [`[${i + 1}] ${r.title}`, `URL: ${r.url}`];
    if (r.snippet) lines.push(`Snippet: ${r.snippet}`);
    if (pages[i]) lines.push(`Details: ${pages[i]}`);
    return lines.join("\n");
  }).join("\n\n");
  
  const output = `Search results for "${query}":\n\n${body}`;
  cacheSet(cacheKey, output);
  return output;
}

async function fetchSearchResults(query) {
  try {
    const resp = await http.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=8`, {
      timeout: 7000,
      headers: { "User-Agent": randomUA(), Accept: "text/html", "Accept-Language": "en-US" },
      maxRedirects: 3
    });
    if (!/captcha|unusual traffic/i.test(resp.data)) {
      const r = parseGoogle(resp.data);
      if (r.length >= 2) return r;
    }
  } catch (e) {}
  
  try {
    const resp = await http.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=8`, {
      timeout: 7000, headers: { "User-Agent": randomUA(), Accept: "text/html" }
    });
    const r = parseBing(resp.data);
    if (r.length) return r;
  } catch (e) {}
  
  return null;
}

function parseGoogle(html) {
  const results = [];
  const re = /href="\/url\?q=([^&"]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 8) {
    const url = decodeURIComponent(m[1]);
    const title = stripHtml(m[2]).trim();
    if (url.startsWith("http") && title && !JUNK.test(url)) {
      results.push({ url, title, snippet: "" });
    }
  }
  const snipRe = /<span[^>]*>([^<]{60,400})<\/span>/g;
  const snippets = [];
  while ((m = snipRe.exec(html)) !== null) {
    const t = stripHtml(m[1]).trim();
    if (t.length > 60) snippets.push(t);
  }
  results.forEach((r, i) => { if (snippets[i]) r.snippet = snippets[i]; });
  return results;
}

function parseBing(html) {
  const results = [];
  const re = /<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 8) {
    const url = m[1], title = stripHtml(m[2]).trim(), snippet = stripHtml(m[3]).trim();
    if (url.startsWith("http") && title && !JUNK.test(url)) {
      results.push({ url, title, snippet });
    }
  }
  return results;
}

async function fetchPage(url, query) {
  try {
    const resp = await http.get(url, { timeout: 4000, maxContentLength: 500000, headers: { "User-Agent": randomUA() } });
    return topSentences(stripHtml(resp.data), query, 5);
  } catch (e) { return null; }
}

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint - RENDER FREE TIER KEEP-ALIVE
// This endpoint is called by Render to check if service is alive
app.get("/ping", (_, res) => {
  res.json({ 
    pong: true, 
    ts: Date.now(),
    uptime: process.uptime(),
    env: CFG.NODE_ENV,
    cacheSize: _cache.size
  });
});

// Root endpoint
app.get("/", (_, res) => res.json({ 
  name: "Dora-Agent", 
  creator: "Rahman Leon", 
  status: "ok", 
  model: CFG.MODEL,
  version: "1.0.0"
}));

// Main chat endpoint
app.post("/chat", async (req, res) => {
  const startTime = Date.now();
  const messages = req.body?.messages;
  
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "messages array required" });
  }
  
  const userMsg = messages.slice().reverse().find(m => m.role === "user" && m.content);
  if (!userMsg) return res.status(400).json({ error: "No user message found" });
  
  try {
    // Apply timeout for free tier 30s limit
    const result = await withTimeout(agentLoop(messages, userMsg.content.trim()), CFG.TIMEOUT_MS);
    res.json({
      bot: "Dora-Agent",
      reply: result.reply,
      used_tools: result.usedTools,
      steps: result.steps,
      time_ms: Date.now() - startTime,
      debug: req.body?.debug ? result.logs : undefined
    });
  } catch (err) {
    console.error("[Chat] Error:", err.message);
    res.status(500).json({ bot: "Dora-Agent", error: err.message, reply: "Something went wrong." });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// =============================================================================
// SERVER STARTUP - RENDER FREE TIER OPTIMIZED
// =============================================================================

// Graceful shutdown handlers for Render
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  
  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log("[Server] HTTP server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log("[Server] Forcing exit after timeout");
    process.exit(1);
  }, 10000);
}

// Start server
function startServer() {
  // Bind to 0.0.0.0 for Render (not localhost)
  server = app.listen(CFG.PORT, "0.0.0.0", () => {
    console.log(`Dora-Agent started`);
    console.log(`  Port: ${CFG.PORT}`);
    console.log(`  Host: 0.0.0.0`);
    console.log(`  Model: ${CFG.MODEL}`);
    console.log(`  Env: ${CFG.NODE_ENV}`);
    console.log(`  Health: http://localhost:${CFG.PORT}/ping`);
  });
}

// Start cache cleanup interval (every 5 minutes)
const cacheCleanupInterval = setInterval(cleanCache, 5 * 60 * 1000);
// Don't prevent interval from keeping process alive during shutdown
cacheCleanupInterval.unref();

// Initialize and start
startServer();