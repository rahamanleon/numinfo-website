# Picoclaw Memory

## Installed Skills Summary

**Total Skills**: 27 skills installed
**Last Updated**: 2026-08-11

### 📋 Skills Inventory

| # | Skill | Category | Purpose | Author |
|---|-------|----------|---------|--------|
| 1 | **agent-identity** | Agent | Define agent identity, personality, voice, and boundaries | - |
| 2 | **agent-telemetry-telegram** | Agent | Stream agent states to Telegram in real-time | - |
| 3 | **agent-telemetry-telemetry** | Agent | Agent telemetry core | - |
| 4 | **autoheal** | Reliability | AI error monitoring & auto-fix | v1.0.0 |
| 5 | **clawdhub** | Registry | Registry CLI for searching/installing skills | v0.3.0 @steipete |
| 6 | **elite-longterm-memory** | Memory | Ultimate AI memory (WAL + vector + git + cloud) | v1.2.3 |
| 8 | **flexible-database-design** | Database | SQLite flexible schema & knowledge base | - |
| 9 | **it-working-state-tracker** | Monitoring | Real-time working status for Telegram | v1.0.0 |
| 10 | **local-web-search-skill** | Search | Free DuckDuckGo scraping (no API keys) | - |
| 11 | **multi-search-engine** | Search | 16 search engines (7 CN + 9 Global) | v2.1.3 @gpyangyoujun |
| 12 | **notify-hub** | Notifications | Multi-platform notification aggregation | - |
| 13 | **ollama-fallback** | API | Ollama API with backup key fallback | - |
| 14 | **resilient-flow-engine** | Reliability | Resilient execution flow engine | v2.0 |
| 15 | **self-heal-empty-response** | Reliability | Self-healing for empty/null responses | v3.1.0 |
| 16 | **self-improving** | Agent | Continuous learning through memory management | - |
| 17 | **self-improving-agent** | Agent | Capture learnings & corrections | - |
| 18 | **skill-finder-cn** | Registry | Chinese skill discovery helper | v1.0.1 |
| 19 | **smart-scheduler** | Scheduling | Meeting coordination with ICS export | - |
| 20 | **telegram-notify** | Notifications | Telegram DM alerts for events | - |
| 21 | **webhook-send** | Notifications | Send HTTP POST to webhooks | - |

### 🔧 Built-in Features
- **Web Search**: DuckDuckGo (`ddgr`) + `web_fetch` HTML extraction

### 📁 Workspace Location
```
~/.picoclaw/data/skills/
├── agent-identity/
├── agent-telemetry-telegram/
├── autoheal/
├── clawdhub/
└── ... (23 total)
```

### 💡 Usage Commands
```bash
# Search for skills
clawdhub search "<query>"

# Install a skill
clawdhub install <skill-name>

# Verify installation
ls ~/.picoclaw/data/skills/<name>/SKILL.md
```

### 🔑 Key Configurations
| Component | Value |
|-----------|-------|
| WhatsApp Admin | `+8801723153138` |
| Telegram Admin Chat | `8510092274` |
| WhatsApp Number | `8801831292448` |
| API Fallback Key | Configured in ollama-fallback |

## WhatsApp Channel (Live)

**Status**: ✅ **CONNECTED & RUNNING**
**Last Updated**: 2026-04-13
**Phone Number**: `8801831292448`
**Mode**: creds.json authentication
**Library**: Baileys v2.3000.1035194821

### Connection Details
- ✅ **Session**: Restored from creds.json
- ✅ **Auto-reconnect**: Enabled (5 attempts)
- ✅ **Location**: `~/.picoclaw/data/channels/whatsapp-baileys/`

### Files
- `src/handler.js` - Main WhatsApp handler (Baileys)
- `sessions/creds.json` - Session credentials (active)

### Features
- ✅ **Authentication**: creds.json based (no QR code needed)
- ✅ **Message Handling**: Receives and sends messages
- ✅ **Auto-reconnect**: Automatic reconnection on disconnect

---



## File Structure Architecture

**Decision**: ✅ Isolated Per-Channel Storage (Confirmed)
**Date**: 2026-04-12

### Implemented Structure
```
~/.picoclaw/data/
├── channels/                    # Platform-specific (isolated)
│   │   ├── config/
│   │   ├── sessions/
│   │   ├── src/
│   │   └── README.md
│   └── [telegram/]               # [Future: Telegram channel]
├── shared/                      # ✅ Cross-platform data
│   ├── users/                     # Unified user profiles
│   ├── logs/                      # Centralized logging
│   └── settings/                  # Global settings
├── skills/                      # Skill configurations
├── memory/                      # Long-term memory
└── state/                       # State management
```

### Benefits
- Security: Platform credential isolation
- Maintenance: Independent updates/restarts
- Debugging: Isolated log paths
- Backup: Selective platform backup
- Scalability: Easy channel addition

---





**Location**: `/skills/empty-response-recovery/`  
**Version**: 2.0.0  
**Created**: 2026-04-12

### Features
- ✅ Response validation layer (null, empty, truncated detection)
- ✅ Token budget management
- ✅ Context chunking for large inputs
- ✅ Automatic retry with simplified context
- ✅ Recovery strategies for all common failure types

### Recovery Strategies
| Failure | Action |
|---------|--------|
| Empty/Null | Simplify context, retry |
| Truncated | Use chunked output |
| Incomplete | Add explicit boundaries |
| Unclosed code | Strict formatting |
| Timeout | Parallel chunking |

### Configuration
```json
{
  "maxRetries": 3,
  "baseContextLimit": 4000,
  "safetyBuffer": 500,
  "chunkOverlap": 200,
  "enableAutoChunk": true,
  "enableValidation": true,
  "logFailures": true
}
```


## Ollama Fallback API Skill
- **Created**: 2026-04-18
- **Location**: `/skills/ollama-fallback/`
- **Backup Key**: Configured to use `6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G` as fallback
- **Languages**: Python + JavaScript
- **Features**: Automatic API key rotation on rate limit (HTTP 429)



## Self-Heal Empty Response Skill (v3.1.0)
**Location**: `/skills/self-heal-empty-response/`  
**Updated**: 2026-04-12

### Features (Enhanced)
- **Immediate Detection** - Treats empty, null, whitespace-only, invalid outputs as execution failure
- **6-Stage Recovery Pipeline**: detect → classify → prune → decompose → retry → heal
- **Aggressive Context Pruning** - Oldest-first removal (preserves system + latest user request only)
- **Task Decomposition** - Immediate trigger at >60% context limit
- **Fallback Execution Mode** - After 2nd failure, minimizes all overhead
- **Deep Self-Healing Mode** - After 3 failures, analyzes patterns and applies corrective adjustments
- **Mandatory Memory Updates** - Appends patch notes to HEALING_MEMORY.json

### Detection Criteria (IMMEDIATE)
- Empty/null/whitespace-only outputs
- Invalid serialization errors (`[object Object]`)
- Truncated responses
- Timeout/silence after execution

### Failure Classification
| Cause | Default if Uncertain |
|-------|---------------------|
| Token Limit Exhaustion | Context Overflow |
| Provider Instability | Context Overflow |
| Context Overflow | ✅ **ASSUMED** |
| Unknown Runtime Error | Context Overflow |

### Recovery Stages
1. **Detection** - Validate output, classify failure cause
2. **Pruning** - **Aggressive** oldest-first removal; MUST preserve system + latest user request + tool state
3. **Decomposition** - If still >60% limit, break into sequential steps
4. **Retry** - Simplified instruction set; **prioritize ANY valid partial output over perfection**
5. **Fallback** - After 2nd failure: minimize overhead, no heavy tools, simplest correct output
6. **Deep Heal** - After 3rd failure: analyze 3 patterns (repeated overflow, excessive tools, large prompts)

### Corrective Adjustments (Deep Self-Healing)
| Pattern Detected | Adjustment Applied |
|------------------|-------------------|
| Repeated context overflow | Reduce context window to 50% |
| Excessive tool usage | Disable non-critical features |
| Overly large prompts | Enforce earlier chunking (>500 tokens) |

### Memory Persistence (REQUIRED)
**Patch note format (appended to HEALING_MEMORY.json):**
```json
{
  "timestamp": "ISO8601",
  "sessionId": "sess_xxx",
  "patternDetected": "repeated_context_overflow",
  "mitigationApplied": "reduced_context_to_50pct",
  "adjustments": [...]
}
```

Ensures future executions are more stable.

### Strict Limits
- **Max Retries**: 3 (strict, no exceptions)
- **Fallback Mode**: After 2nd failure
- **Deep Self-Healing**: After 3rd failure
- **Final Output**: Best partial result (NEVER empty)

### Core Principle
> **Never return empty output. Always degrade gracefully. Simplify execution. Ensure at least partial usable response is produced.**

---

## Newly Installed Skills from ClawHub | 2026-04-18

| Skill | Version | Author | Purpose |
|-------|---------|--------|---------|
| **elite-longterm-memory** | 1.2.3 | NextFrontierBuilds | Ultimate AI memory system (WAL + vector search + git-notes + cloud backup) |
| **webhook-send** | - | - | Send HTTP POST requests to webhooks (text/markdown) |
| **telegram-notify** | - | - | Send Telegram DM alerts for trading/monitoring events |
| **notify-hub** | - | - | Multi-platform notification aggregation (GitHub, Stripe, Linear, etc.) |
| **smart-scheduler** | - | - | Coordinate meeting requests and scheduling with ICS export |
| **flexible-database-design** | - | - | SQLite flexible schema & knowledge base design skill |

## Deep Web Search Skills (Added 2026-04-15)
| Skill | Purpose |
|-------|---------|
| deep-research-pro | Deep research with multiple iterations |
| in-depth-research | In-depth research capabilities |
| firecrawl-search | Advanced web crawling & search |
| web-scraper-jina | Jina AI web scraping |
| crawl4ai-skill | AI-powered web crawling |
| exa-web-search-free | Exa neural web search (free) |

## Newly Installed Skills (2026-08-11)
| Skill | Version | Author | Purpose |
|-------|---------|--------|---------|
| **automation-workflows** | - | - | Design and execute cross-platform automation flows |
| **memory-tiering** | - | - | Tiered memory management system |
| **fluid-memory** | - | - | Fluid memory system |
| **neural-memory** | - | - | Neural memory capabilities |
| **code-review-fix** | - | - | Code review and fix automation |
| **code-generator** | - | - | AI code generation |
| **explain-code** | - | - | Code explanation helper |

**Total Skills**: 38

---

---

# AI Bridge Status | 2026-04-13 02:38

## ✅ WhatsApp-AI Bridge ACTIVE

**Components Running:**
- WhatsApp Bot: PID 27440 (Baileys v2.3000.1035194821)
- Bridge Watcher: PID 27299
- Phone Number: 8801831292448

**Bridge Paths:**
- Incoming: `~/.picoclaw/data/channels/whatsapp-baileys/bridge/incoming/`
- Outgoing: `~/.picoclaw/data/channels/whatsapp-baileys/bridge/outgoing/`
- Memory: `~/.picoclaw/data/memory/whatsapp_bridge.json`

**How it works:**
1. Message sent to 8801831292448 → Bot saves to incoming/
2. Bridge Watcher detects → Updates memory file
3. picoclaw reads memory (via this Telegram chat) → AI processes
4. Response written to outgoing/ → Bot sends to WhatsApp

**Status:** Ready for testing! 🎉

---

## Agent Telemetry Telegram Skill
**Location**: `/skills/agent-telemetry-telegram/`  
**Version**: 1.0.0  
**Author**: @leoxshmc

### Features
- 🤔 Thought tracing
- 🔧 Action logging  
- 📤 Output streaming
- ❌ Error reporting
- ⚡ Async, non-blocking
- 💬 Message threading support

### Configuration (config.json)
```json
{
  "telemetry_chat_id": "YOUR_TELEGRAM_CHAT_ID",
  "trace_thoughts": true,
  "trace_actions": true,
  "trace_outputs": true,
  "trace_errors": true,
  "include_timestamps": true,
  "max_message_length": 4096
}
```

### Environment Variables
- `TELEMETRY_CHAT_ID` - Override chat ID
- `TELEMETRY_ENABLED` - "false" to disable

### Message Format Examples
```
🤔 [THOUGHT] 16:45:23
Processing command: /status

🔧 [ACTION] 16:45:24
exec: systemctl status picoclaw

📤 [OUTPUT] 16:45:25
Service is active

❌ [ERROR] 16:45:26
Connection timeout
```

---

## Resilient Flow Engine
**Location**: `/skills/resilient-flow-engine/`  
**Version**: 2.0

### Features
- Resilient execution flow handling
- Error recovery mechanisms
- Flow state management

---

## Agent Identity Skill
**Location**: `/skills/agent-identity/`  

### Purpose
Define agent identity, personality, voice, and boundaries to create assistants that feel authentic rather than generic.

---

## Agent Telemetry (Core)
**Location**: `/skills/agent-telemetry-telemetry/`

### Purpose
Core telemetry functionality for agent state monitoring.


---

## Telegram Streaming Response Settings | 2026-08-11

**Status**: ✅ Enabled
**Skill**: telegram-streaming

### Behavior
- **Type**: Progressive chunk sending
- **Chunk Size**: 1000 characters
- **Delay**: 100ms between chunks
- **Threading**: Continuation messages reply to first chunk
- **Split Priority**: Paragraph → Line → Sentence → Word

### Triggers
- Responses > 1000 chars → Chunked
- Responses ≤ 1000 chars → Single message
- Code blocks preserved across chunks when possible

### Configuration
```json
{
  "telegram_chunk_size": 1000,
  "telegram_chunk_delay_ms": 100,
  "telegram_split_markers": ["\\n\\n", "\\n", ". ", " "],
  "telegram_thread_continuations": true
}
```

### Natural Breakpoints
1. First: Double newlines (paragraphs)
2. Second: Single newlines
3. Third: Sentence ends (". ")
4. Last: Word boundaries

This ensures messages feel natural and readable.

---

## Music Skill (go-music-api) - Added 2026-04-13
**Location**: `/skills/go-music-skill/`
**Backend**: `~/.openclaw/music/` - Running on port 8080
**Binary**: `go-music-api` (ARM64, v1.0.0)
**Status**: ✅ Backend installed & running

### Supported Platforms
NetEase, QQ Music, Kugou, Kuwo, Bilibili, 5sing, Jamendo, JOOX, Migu, etc.

### API Endpoints
- `GET /api/v1/music/search?q={query}&source={platform}`
- `GET /api/v1/music/stream?id={id}&source={source}`
- `GET /api/v1/music/lyric?id={id}&source={source}`


---

## Moltbook Registration | 2026-04-13

**Status**: ✅ Registered (Pending Claim)
**Agent Name**: `picoclaw_molt2`
**Agent ID**: `69f02139-4fb3-44c9-9c98-1d4327777286`
**API Key**: `moltbook_sk_kY-Qw6HBxSHkC1Bb5mhyyi4w0b52OV1X`
**Profile URL**: `https://www.moltbook.com/u/picoclaw_molt2`

### Claim URL
https://www.moltbook.com/claim/moltbook_claim_kH2-hl2RzUq-8fC1CNXPkfpyiGy16JXl

### Verification Code
`drift-XEQH`

### Tweet Template
```
I'm claiming my AI agent "picoclaw_dev" on @moltbook 🦞
Verification: lagoon-899B
```

### Credentials File
`~/.config/moltbook/credentials.json`

### Next Steps
1. User must claim via the claim URL (email verify + tweet)
2. After claim, can post, comment, upvote
3. Set up heartbeat to check Moltbook periodically


## HINATA Chatbot Skill | 2026-04-13
**Location**: `/picoclaw/skills/hinata-chatbot/`
**Source**: https://github.com/mahmudx7/HINATA
**Author**: MahMUD
**Version**: 1.7
**API Base**: `https://mahmud-infinity-api.onrender.com`
**Status**: ✅ Installed and tested

### Features
- Simple chat API (`/api/hinata`)
- Teachable responses (`/api/jan/teach`)
- Bengali/English mixed responses
- Random playful replies

### Keywords
baby, bby, jan, janu, hinata, bebi, bot
