# Skill: Self-Heal Empty Response

**Name:** self_heal_empty_response  
**Version:** 3.1.0  
**Author:** Leox (Custom)  
**License:** MIT  
**Location:** `/data/data/com.termux/files/home/.picoclaw/data/skills/self-heal-empty-response/`

---

## Purpose

Advanced empty-response recovery with aggressive token pressure reduction and strict self-correction behavior. This skill detects execution failures immediately and applies multi-stage recovery with deep self-healing capabilities.

---

## Activation Triggers (IMMEDIATE)

The agent MUST activate this skill **immediately** upon detecting:
- Empty output (`""`)
- Null output (`null` / `undefined`)
- Whitespace-only output (`/^\s*$/`)
- Invalid outputs (non-string types, unparseable JSON)
- Truncated responses (missing closing tags, incomplete sentences)
- Silence/timeout after tool execution
- `[object Object]` or similar serialization errors

**All such outputs MUST be treated as execution failure.**

---

## Failure Classification (REQUIRED)

When failure is detected, the agent MUST identify the most likely cause:

| Cause | Indicators |
|-------|------------|
| **Token Limit Exhaustion** | `429`, context > 80% of limit, "message too long" errors |
| **Provider Instability** | Random failures, partial outputs, `503/504` errors, timeouts |
| **Context Overflow** | Large conversation history, multiple tool calls, long reasoning chains |
| **Unknown Runtime Error** | No clear pattern, unexpected exceptions |

**DEFAULT ASSUMPTION:** If uncertain → **Context Overflow**

---

## Recovery Pipeline (6 Stages)

### Stage 1: Immediate Detection
```javascript
function detectFailure(output) {
    if (!output || typeof output !== 'string') return { failed: true, cause: 'null_invalid' };
    if (/^\s*$/.test(output)) return { failed: true, cause: 'whitespace_only' };
    if (output.length < 10 && output.includes('[object')) return { failed: true, cause: 'serialization_error' };
    if (!hasProperBoundaries(output)) return { failed: true, cause: 'truncated' };
    return { failed: false };
}
```

### Stage 2: Aggressive Context Pruning (MANDATORY)

**Execution order (aggressive, oldest-first):**
1. **Oldest conversation history** (keep only first system instruction + latest user request)
2. **Intermediate reasoning steps** (keep conclusion only, remove chain-of-thought)
3. **Tool call invocation logs** (keep only final results)
4. **Redundant explanations** (compress to minimal)
5. **Non-essential formatting** (strip markdown, emojis if needed)

**MUST ALWAYS PRESERVE:**
- System instructions (core behavior)
- Latest user request (the task at hand)
- Required tool state (active sessions, files open)
- Critical context (user preferences, ongoing operations)

**If prompt is still large after pruning → IMMEDIATELY switch to task decomposition**

### Stage 3: Task Decomposition

Break request into smaller sequential steps:
```javascript
function decompose(task) {
    return {
        steps: [
            { id: 1, action: 'identify_core_requirement', essential: true },
            { id: 2, action: 'execute_minimal_viable', essential: true },
            { id: 3, action: 'extend_if_needed', essential: false }
        ],
        current: 1,
        checkpoint: true // Save state after each step
    };
}
```

### Stage 4: Simplified Retry

**Retry instruction set (reduced verbosity):**
- Use bullet points over paragraphs
- State conclusions directly (no reasoning chains)
- Skip non-essential tools
- **Prioritize ANY valid partial output over perfection**
- Accept minimum viable response

### Stage 5: Fallback Execution Mode

**Activated after 2nd failure (STRICT).**

Behavior changes:
- Minimize ALL processing overhead
- Avoid heavy tool calls (no web search, complex operations)
- Use only: `read_file`, `write_file`, simple `exec`
- Respond based on **latest stable context ONLY**
- Output format: Ultra-compact (minimal formatting)
- **Goal: Deliver simplest possible correct output**

### Stage 6: Deep Self-Healing Mode

**Activated after 3 failures in same session (STRICT).**

**Pattern Analysis:**
```javascript
function analyzeFailurePattern(history) {
    const patterns = {
        repeatedContextOverflow: countFailuresByType('context_overflow'),
        excessiveToolUsage: avgToolsPerAttempt(history),
        overlyLargePrompts: avgPromptSize(history)
    };
    
    return {
        primaryPattern: identifyDominant(patterns),
        adjustments: generateCorrectiveAdjustments(patterns)
    };
}
```

**Corrective Adjustments (applied immediately):**
| Pattern Detected | Adjustment Applied |
|------------------|-------------------|
| Repeated context overflow | Reduce default context window to 50% |
| Excessive tool usage | Disable non-critical features |
| Overly large prompts | Enforce earlier chunking (>500 tokens) |
| Unknown | Apply all conservative settings |

**Operational Changes:**
1. Reduce default context window usage to 50%
2. Enable chunking for ANY task >500 tokens
3. Limit reasoning to 3 bullet points maximum
4. Temporarily disable: verbose greetings, decorative formatting, non-essential explanations

---

## Skill Memory Update (REQUIRED)

After deep self-healing, MUST append patch note:

```javascript
function recordPatch(failurePattern, mitigation) {
    const patchNote = {
        timestamp: new Date().toISOString(),
        sessionId: currentSession.id,
        patternDetected: failurePattern,      // e.g., "repeated_context_overflow"
        mitigationApplied: mitigation,       // e.g., "reduced_context_to_50pct"
        adjustments: [
            { setting: 'context_window', newValue: '50%' },
            { setting: 'chunking_threshold', newValue: 500 },
            { setting: 'disabled_features', newValue: ['verbose_greetings', 'decorations'] }
        ]
    };
    
    // Append to skill memory file
    appendToFile(
        '/data/data/com.termux/files/home/.picoclaw/data/skills/self-heal-empty-response/HEALING_MEMORY.json',
        JSON.stringify(patchNote) + '\n'
    );
}
```

**Purpose:** Ensure future executions are more stable by learning from failure patterns.

---

## Execution Limits (STRICT)

| Parameter | Value | Enforcement |
|-----------|-------|-------------|
| Max Retries | **3** (strict) | Stop after 3 attempts, no exceptions |
| Context Pruning | Aggressive, oldest-first | Remove until under 60% limit |
| Task Decomposition | Immediate after pruning | If >60% limit, split task |
| Fallback Mode | After 2nd failure | Strict activation |
| Deep Self-Healing | After 3rd failure | Mandatory pattern analysis |
| Final Output | Best partial result | Never return empty |

---

## State Machine

```
┌─────────────┐
│ CheckOutput │
└──────┬──────┘
       │
   ┌───┴───┐
   │Valid? │
   └───┬───┘
   Yes/   \No
      │     \
      ↓      ↘
┌──────────┐  ┌─────────┐
│  SUCCESS │  │ Attempt1│
└──────────┘  └────┬────┘
                   │
              ┌────┴────┐
              │ Classify│
              │  Cause  │
              └────┬────┘
                   │
              ┌────┴────┐
              │  Prune  │
              │ Context │
              │(oldest) │
              └────┬────┘
                   │
              ┌────┴────┐
              │ Decomp? │──Yes──→┌──────────┐
              │>60%?    │        │   Split  │
              └────┬────┘        │   Task   │
               Yes/ \No         └────┬─────┘
                  │    \              │
                  │     \             │
              ┌───┴───┐  \        ┌───┴───┐
              │Retry1 │   \──────→│Retry1 │
              │(simplif)│         │(step) │
              └───┬───┘           └───┬───┘
              Valid?               Valid?
              /    \               /    \
          Yes/      \No         Yes/      No
            │        \           │         \
            ↓         ↘          ↓          ↘
        ┌──────┐    ┌─────┐  ┌──────┐     ┌─────┐
        │SUCCESS│    │Att2 │  │SUCCESS│     │Att2 │
        └──────┘    └──┬──┘  └──────┘     └──┬──┘
                       │                      │
                    ┌──┴──┐               ┌──┴──┐
                    │Prune │               │Prune│
                    │more  │               │final│
                    └──┬──┘               └──┬──┘
                       │                      │
                   ┌───┴───┐             ┌────┴────┐
                   │Retry2 │             │Fallback │
                   │(minimal│             │ Mode    │
                   │output) │             │(attempt2)│
                   └───┬───┘             └────┬────┘
                       │                      │
                   Valid?                  Valid?
                   /    \                  /    \
               Yes/      \No           Yes/      \No
                 │        \              │         \
                 ↓         ↘             ↓          ↘
             ┌──────┐    ┌──────────────────────────────────┐
             │SUCCESS│    │         DEEP SELF-HEALING       │
             └──────┘    │  ┌─────────┐  ┌─────────┐        │
                         │  │Analyze  │→ │Apply    │        │
                         │  │Pattern  │   │Adjusts  │        │
                         │  └─────────┘   └────┬────┘        │
                         │                     │            │
                         │              ┌────┴────┐       │
                         │              │ Record  │       │
                         │              │ Patch   │       │
                         │              └────┬────┘       │
                         │                   │           │
                         │              ┌────┴────┐       │
                         │              │FinalAtt │       │
                         │              │(best)   │       │
                         │              └────┬────┘       │
                         │                   │           │
                         └───────────────────┼───────────┘
                                             ↓
                                        ┌─────────┐
                                        │ Best    │
                                        │ Partial │
                                        │ Result  │
                                        └─────────┘
```

---

## Integration Code

### Before every response:
```javascript
const check = detectFailure(generatedOutput);
if (check.failed) {
    const result = selfHeal({
        cause: check.cause,
        retryCount: currentRetryCount,
        sessionFailures: sessionFailureCount
    });
    // MUST use result from selfHeal, never empty
    return result;
}
```

### Tool result validation:
```javascript
const result = await callTool(args);
if (!isValid(result)) {
    const check = detectFailure(result);
    if (check.failed) {
        // Do not propagate empty result
        return selfHeal({ cause: 'tool_error', retryCount });
    }
}
```

---

## Memory Persistence

**File:** `/data/data/com.termux/files/home/.picoclaw/data/skills/self-heal-empty-response/HEALING_MEMORY.json`

**Format:** NDJSON (one patch object per line)

**Example:**
```json
{"timestamp":"2026-04-12T18:00:00Z","sessionId":"sess_abc123","patternDetected":"repeated_context_overflow","mitigationApplied":"reduced_context_to_50pct","adjustments":[{"setting":"context_window","newValue":"50%"}]}
{"timestamp":"2026-04-12T19:00:00Z","sessionId":"sess_def456","patternDetected":"excessive_tool_usage","mitigationApplied":"disabled_non_critical","adjustments":[{"setting":"disabled_features","newValue":["verbose_greetings"]}]}
```

---

## Core Principle

> **Never return empty output. Always degrade gracefully. Simplify execution. Ensure at least partial usable response is produced.**

---

## Usage

This skill is automatically invoked. Manual activation:
```javascript
// Force recovery mode
activateSkill('self_heal_empty_response', { aggressive: true });
```

---

## Changelog

**v3.1.0** - Current
- Clarified "immediate" detection requirement
- Specified default cause is context overflow
- Emphasized aggressive context pruning (oldest-first)
- Added mandatory task decomposition trigger (>60% limit)
- Defined simplified retry with "any valid partial" priority
- Specified fallback mode minimizes ALL overhead
- Clarified deep self-healing analyzes 3 patterns specifically
- Added mandatory corrective adjustments table
- Specified skill memory update with patch note format
- Enforced strict 3-attempt limit (no exceptions)
- Core principle: degrade gracefully, ensure partial output

**v3.0.0** - Previous
- Initial 6-stage recovery pipeline
- Basic fallback and self-healing modes

---

**Tags:** `execution-recovery` `resilience` `token-management` `self-healing` `failure-handling`
