# Skill: it-working-state-tracker

## Version
1.0.0

## Description
Real-time "working status flow" tracker for Telegram that shows operational states during AI processing. Makes the system feel alive without exposing internal reasoning.

## Location
`~/.picoclaw/data/skills/it-working-state-tracker/`

## Purpose
Display a live "working" status in Telegram while the AI processes requests. Shows:
- Current processing stage
- Work type indicators
- System state (stable/retrying/generating)

Never exposes internal chain-of-thought or raw reasoning.

## Core Rules

1. **Single Message** - Use ONE Telegram message and edit it continuously
2. **No Spam** - Never send multiple messages for status updates
3. **No Reasoning Exposure** - Only show operational states, not internal thinking
4. **Always Update** - Update status during every execution phase
5. **Clean Finish** - End with ✅ completed or ❌ failed

## Main Working Flow

```
🟡 it working: receiving input
🧠 it working: understanding request
📦 it working: loading context
🧹 it working: compressing memory
🧩 it working: splitting task
⚙️ it working: preparing execution
🔍 it working: processing data
✍️ it working: generating response
🧪 it working: validating output
🧾 it working: formatting result
✅ it working: completed
```

## Alternative Flows

### Quick Tasks (bypass intermediate steps)
```
🟡 it working: receiving input
⚡ it working: quick processing
✅ it working: completed
```

### Error/Retry Flow
```
🟡 it working: receiving input
...
⚠️ it working: retrying (attempt 2/3)
...
✅ it working: completed
```

### Tool Execution Flow
```
🟡 it working: receiving input
🔧 it working: executing tool: <tool_name>
⏳ it working: waiting for result
📥 it working: processing result
✅ it working: completed
```

## Implementation

### JavaScript (Node.js)

```javascript
class WorkingStateTracker {
  constructor(bot, chatId) {
    this.bot = bot;
    this.chatId = chatId;
    this.messageId = null;
    this.currentState = null;
  }

  async init() {
    const msg = await this.bot.sendMessage(
      this.chatId, 
      '🟡 it working: initializing...'
    );
    this.messageId = msg.message_id;
    return this;
  }

  async update(emoji, action, detail = '') {
    const text = detail 
      ? `${emoji} it working: ${action}\n└─ ${detail}`
      : `${emoji} it working: ${action}`;
    
    if (text === this.currentState) return;
    this.currentState = text;

    try {
      await this.bot.editMessageText(text, {
        chat_id: this.chatId,
        message_id: this.messageId
      });
    } catch (e) {
      // Message might be deleted or unchanged
    }
  }

  async complete(result = '') {
    const text = result
      ? `✅ it working: completed\n└─ ${result}`
      : '✅ it working: completed';
    
    await this.bot.editMessageText(text, {
      chat_id: this.chatId,
      message_id: this.messageId
    });
  }

  async fail(reason = '') {
    const text = reason
      ? `❌ it working: failed\n└─ ${reason}`
      : '❌ it working: failed';
    
    await this.bot.editMessageText(text, {
      chat_id: this.chatId,
      message_id: this.messageId
    });
  }

  // Convenience methods for main flow
  receiving()    { return this.update('🟡', 'receiving input'); }
  understanding(){ return this.update('🧠', 'understanding request'); }
  loading()      { return this.update('📦', 'loading context'); }
  compressing()  { return this.update('🧹', 'compressing memory'); }
  splitting()    { return this.update('🧩', 'splitting task'); }
  preparing()    { return this.update('⚙️', 'preparing execution'); }
  processing()   { return this.update('🔍', 'processing data'); }
  generating()   { return this.update('✍️', 'generating response'); }
  validating()   { return this.update('🧪', 'validating output'); }
  formatting()   { return this.update('🧾', 'formatting result'); }
  
  // Tool execution
  executing(tool) { return this.update('🔧', `executing: ${tool}`); }
  waiting()       { return this.update('⏳', 'waiting for result'); }
  
  // Retry
  retrying(attempt, max) { 
    return this.update('⚠️', `retrying (${attempt}/${max})`); 
  }
}

// Usage Example
async function processRequest(bot, chatId, userRequest) {
  const tracker = await new WorkingStateTracker(bot, chatId).init();
  
  try {
    await tracker.receiving();
    await delay(100);
    
    await tracker.understanding();
    // ... parse request
    
    await tracker.loading();
    // ... load context
    
    await tracker.preparing();
    // ... setup execution
    
    await tracker.processing();
    // ... process
    
    await tracker.generating();
    // ... generate response
    
    await tracker.validating();
    // ... validate
    
    await tracker.complete('response ready');
    
  } catch (error) {
    await tracker.fail(error.message);
    throw error;
  }
}
```

### Python

```python
import asyncio
from typing import Optional

class WorkingStateTracker:
    FLOW = [
        ('🟡', 'receiving input'),
        ('🧠', 'understanding request'),
        ('📦', 'loading context'),
        ('🧹', 'compressing memory'),
        ('🧩', 'splitting task'),
        ('⚙️', 'preparing execution'),
        ('🔍', 'processing data'),
        ('✍️', 'generating response'),
        ('🧪', 'validating output'),
        ('🧾', 'formatting result'),
    ]
    
    def __init__(self, bot, chat_id):
        self.bot = bot
        self.chat_id = chat_id
        self.message_id = None
        self.current = None
    
    async def init(self):
        msg = await self.bot.send_message(
            self.chat_id, 
            '🟡 it working: initializing...'
        )
        self.message_id = msg.message_id
        return self
    
    async def update(self, emoji: str, action: str, detail: str = ''):
        text = f"{emoji} it working: {action}"
        if detail:
            text += f"\n└─ {detail}"
        
        if text == self.current:
            return
        self.current = text
        
        try:
            await self.bot.edit_message_text(
                text,
                chat_id=self.chat_id,
                message_id=self.message_id
            )
        except:
            pass  # Message unchanged or deleted
    
    async def complete(self, result: str = ''):
        text = f"✅ it working: completed"
        if result:
            text += f"\n└─ {result}"
        await self.bot.edit_message_text(
            text,
            chat_id=self.chat_id,
            message_id=self.message_id
        )
    
    async def fail(self, reason: str = ''):
        text = f"❌ it working: failed"
        if reason:
            text += f"\n└─ {reason}"
        await self.bot.edit_message_text(
            text,
            chat_id=self.chat_id,
            message_id=self.message_id
        )
    
    # Flow steps
    async def receiving(self):     await self.update('🟡', 'receiving input')
    async def understanding(self): await self.update('🧠', 'understanding request')
    async def loading(self):     await self.update('📦', 'loading context')
    async def compressing(self): await self.update('🧹', 'compressing memory')
    async def splitting(self):   await self.update('🧩', 'splitting task')
    async def preparing(self):   await self.update('⚙️', 'preparing execution')
    async def processing(self):  await self.update('🔍', 'processing data')
    async def generating(self):  await self.update('✍️', 'generating response')
    async def validating(self):  await self.update('🧪', 'validating output')
    async def formatting(self):  await self.update('🧾', 'formatting result')
    
    # Tool execution
    async def executing(self, tool: str): 
        await self.update('🔧', f'executing: {tool}')
    async def waiting(self): 
        await self.update('⏳', 'waiting for result')
    
    # Retry
    async def retrying(self, attempt: int, max_retries: int):
        await self.update('⚠️', f'retrying ({attempt}/{max_retries})')

# Usage
async def process_request(bot, chat_id, user_input):
    tracker = await WorkingStateTracker(bot, chat_id).init()
    
    try:
        await tracker.receiving()
        await asyncio.sleep(0.1)
        
        await tracker.understanding()
        # parse request...
        
        await tracker.loading()
        # load context...
        
        await tracker.processing()
        # process...
        
        await tracker.generating()
        # generate...
        
        await tracker.complete('done!')
        
    except Exception as e:
        await tracker.fail(str(e))
        raise
```

## State Emoji Reference

| Emoji | Meaning |
|-------|---------|
| 🟡 | Starting / Receiving |
| 🧠 | Understanding / Analyzing |
| 📦 | Loading / Retrieving |
| 🧹 | Cleaning / Compressing |
| 🧩 | Splitting / Decomposing |
| ⚙️ | Preparing / Setting up |
| 🔍 | Processing / Searching |
| ✍️ | Generating / Writing |
| 🧪 | Validating / Testing |
| 🧾 | Formatting / Finalizing |
| ✅ | Complete / Success |
| ❌ | Failed / Error |
| ⚠️ | Warning / Retry |
| 🔧 | Executing Tool |
| ⏳ | Waiting |
| ⚡ | Quick / Fast Track |

## Timing Guidelines

- **Update delay**: 50-150ms between states (enough to see, not annoy)
- **Skip unnecessary**: Skip states that take <100ms
- **Quick tasks**: Use ⚡ fast-track flow
- **Tool calls**: Show 🔧 executing + ⏳ waiting

## Integration with Facebook Messenger

For FB Messenger, replace `editMessageText` with appropriate FB API:

```javascript
// Facebook Messenger version
async update(emoji, action) {
  const text = `${emoji} it working: ${action}`;
  
  // FB Messenger doesn't support editing, so send new messages
  // But only every 2-3 seconds to avoid spam
  const now = Date.now();
  if (now - this.lastUpdate < 2000) return;
  this.lastUpdate = now;
  
  await this.api.sendMessage(text, this.threadId);
}
```

⚠️ **Note**: FB Messenger doesn't support message editing, so this skill works best with Telegram.

## Dependencies

- `node-telegram-bot-api` (Node.js)
- `python-telegram-bot` (Python)

## Author
Generated for Leox

## License
MIT

## Changelog

### v1.0.0 (2026-04-12)
- Initial release
- 10-step main working flow
- Tool execution support
- Retry state handling
- JavaScript and Python implementations
