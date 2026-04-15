# Skill: resilient-flow-engine

## Version
2.0

## Author
Rahman Leon

## Description
Splits work into smaller steps while preserving continuity, retries empty model responses twice with tighter context, and prevents tool loops. Essential for handling provider errors or token limit issues.

## Triggers
- "The model returned an empty response"
- "This may indicate a provider error or token limit"
- "max_tool_iterations"
- "no final response"
- "tool loop"
- "retry failed"

## Core Rules
- Split only when the task is too large for one pass
- Preserve the same intent, entities, and constraints across all steps
- Never split into unrelated fragments
- Keep a compact state packet after every step
- Do not repeat the same tool action more than twice without progress
- Never end on a tool call
- Always synthesize a final response

## State Packet
Keep after every step (3 to 6 short lines):
- user intent
- active goal
- key entities
- constraints
- last valid output
- next required action

## Flow Steps

### 1. Understand
Identify the task size and risk:
- Single step or multi step
- Likely token-heavy or not
- Likely to need tools or not

### 2. Split with Continuity
Break the task into small linked substeps:
- Each substep must reference the same state_packet
- Keep order: plan, execute, merge
- Avoid over-splitting
- Preserve important terms exactly

### 3. Execute
Run one substep at a time:
- Do not launch the next substep until the current one is useful
- If output is large, compress it before continuing
- Keep only the minimum needed for the next step

### 4. Empty Response Recovery
Recover from empty model responses:

**First Retry:**
- Reduce prompt size
- Remove nonessential history
- Keep only the state_packet and current subtask

**Second Retry:**
- Compress again
- Switch to the smallest valid prompt
- Ask for the smallest useful output only

**After Two Empty Responses:**
- Stop expanding the prompt
- Return the last valid partial result
- Continue from the last checkpoint in a new compact pass

### 5. Loop Guard
Prevent tool repetition:
- If the same tool result repeats twice, replan
- If no progress after two attempts, collapse context and restart from state_packet
- If the task keeps cycling, force a concise final synthesis

### 6. Merge and Finalize
Combine all valid substeps into one coherent answer:
- Merge without losing connections
- Keep the original intent intact
- Remove repeated fragments
- Finish with a direct final response

## Recovery Policy

### Empty Response
- Max retries: 2
- Strategy:
  - Retry with compressed context
  - Preserve last valid state
  - Shrink prompt before any further attempt

### Token Pressure
- Action: Summarize aggressively
- Keep only:
  - Current goal
  - Essential context
  - Latest successful step

### Dead End
- Action: Replan from last checkpoint
- Rule: Never continue a broken chain without resetting the state_packet

## Output Policy
- Produce the smallest complete answer
- Keep continuity visible
- Do not expose internal retries
- Always end with a usable result

## Memory Policy
- Store compact summaries only
- Never store full tool dumps unless essential
- Prefer continuity over verbosity
- Keep checkpoints short and reusable

## Usage Example

```
[User Request]
↓
[Step 1: Understand] → Single/multi step? Token-heavy?
↓
[Step 2: Split] → Break into small linked substeps
↓
[Step 3: Execute] → One substep at a time
  └─ If empty response → [Step 4: Retry with compressed context]
  └─ If tool loop → [Step 5: Replan from checkpoint]
↓
[Step 6: Merge & Finalize] → Coherent final answer
```

## License
MIT

## Changelog
### v2.0
- Initial release
- 6-step flow engine
- Empty response recovery
- Loop guard
- State packet management
