# Self-Improving Skill

This skill enables continuous learning through structured memory management.

## Installation

Run setup to create the memory structure:

```bash
# Run via exec: action="run", command="cd ~/.picoclaw/data/skills/self-improving && cat setup.md | sh"
```

## When to Use

- User corrects you or points out mistakes
- You complete significant work and want to evaluate the outcome
- You notice something in your own output that could be better
- Knowledge should compound over time without manual maintenance

## Architecture

Memory lives in `~/self-improving/` with tiered structure. If `~/self-improving/` does not exist, run setup.

```
~/self-improving/
├── memory.md          # HOT: ≤100 lines, always loaded
├── index.md           # Topic index with line counts
├── projects/          # Per-project learnings
├── domains/           # Domain-specific (code, writing, comms)
├── archive/           # COLD: decayed patterns
└── corrections.md     # Last 50 corrections log
```

## Workflow

### 1. Log Correction (`/self-improving log <pattern>`)

When user corrects you or you identify improvement:

```
Append to memory.md:
---
## YYYY-MM-DD <category>: <one-line summary>
Context: <brief context>
Correction: <what was wrong>
Better: <the improvement>
Apply when: <detection condition>
```

Then run `self-improving decay` to move old entries.

### 2. Log Project Learning (`/self-improving project <name> <learning>`)

When finishing significant work:

```
Create/edit projects/<project-slug>.md:
## YYYY-MM-DD <category>
What worked: <specific technique>
What didn't: <failure mode>
Next time: <actionable wisdom>
```

### 3. Decay Old Entries (`/self-improving decay`)

Move entries from memory.md to archive/ after 30 days, keeping hot memory ≤100 lines.

### 4. Load Relevant Context

Before starting work:
- Always read `memory.md` (≤100 lines, fast)
- Use `index.md` to find deeper context
- Read specific `projects/` or `domains/` files as needed

## File Purposes

### memory.md (HOT)
Active lessons, always loaded. Max 100 lines.

### index.md
Topic tracking with line counts for navigation:
```markdown
# Memory Index
## Projects
- name: 45 lines → projects/name.md
## Domains
- code/golang: 120 lines → domains/code/golang.md
```

### corrections.md
Last 50 corrections with timestamps:
```
YYYY-MM-DD HH:MM | category | brief correction | source
```

### projects/
Long-term learnings per project. Never deleted, append-only.

### domains/
Reusable knowledge by field (code-patterns, writing-style, comms, etc).

### archive/
Decayed patterns from memory.md. Oldest first.

## Commands

| Command | Purpose |
|---------|---------|
| `/self-improving log <pattern>` | Log a correction/pattern |
| `/self-improving project <name> <note>` | Log project learning |
| `/self-improving decay` | Archive old entries |
| `/self-improving show` | View memory.md |
| `/self-improving index` | Rebuild index.md |

## Setup Script

See `setup.md` for initial directory creation.

## Maintenance

- Run decay weekly or when memory.md exceeds 100 lines
- Update index.md monthly or after major additions
- Corrections.md auto-truncates to last 50 entries

## Integration

When processing a user request:
1. Read memory.md for active context
2. Check index.md for relevant topics
3. Read domain/project files if needed
4. After completion, log learnings
5. If corrected, log to corrections
