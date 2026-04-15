# picobot Messenger Integration

A Facebook Messenger bot integration for picobot using **ws3-fca**, featuring whitelist mode, thread support, and admin control.

## 📋 Prerequisites

- **Node.js v20+**
- Facebook account with Messenger access
- Browser cookie export extension
- Running picobot API server

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /data/data/com.termux/files/home/.picoclaw/channels/messenger
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

### 3. Setup Facebook AppState

This is the authentication method for ws3-fca.

**Steps:**
1. Login to Facebook in your mobile/desktop browser
2. Install **"C3C FbState"** extension (or CookieEditor)
3. Export cookies as JSON
4. Save to `appstate.json` in this directory

**Expected `appstate.json` format:**
```json
[
  {"key": "c_user", "value": "YOUR_USER_ID", "domain": ".facebook.com"},
  {"key": "xs", "value": "YOUR_SESSION_TOKEN", "domain": ".facebook.com"},
  {"key": "fr", "value": "...", "domain": ".facebook.com"}
]
```

### 4. Start the Bot

```bash
npm start
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_UID` | `100037951718438` | Your Facebook user ID (admin) |
| `MODE` | `whitelist` | `open`, `whitelist`, or `admin` |
| `WHITE_MODE` | `true` | Only respond to whitelisted users |
| `THREAD_MODE` | `true` | Enable thread/group chat support |
| `PICOBOT_API` | `http://localhost:3000/chat` | Your picobot API endpoint |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `AUTO_REACT` | `true` | Auto-react to messages |

### Response Modes

- **`open`**: Respond to all messages
- **`whitelist`**: Only respond to whitelisted users (default)
- **`admin`**: Only respond to admin

## 🛡️ Admin Commands

Only the configured admin UID can use these:

| Command | Description |
|---------|-------------|
| `!help` | Show help message |
| `!whitelist <uid>` | Add user to whitelist |
| `!unwhitelist <uid>` | Remove from whitelist |
| `!listwhitelist` | Show whitelisted users |
| `!mode <open\|whitelist\|admin>` | Change response mode |
| `!status` | Show bot status |
| `!thread enable [name]` | Enable bot in current thread |
| `!thread disable` | Disable bot in current thread |
| `!thread list` | Show active threads |

## 💬 Thread (Group Chat) Support

When `THREAD_MODE=true`:

1. Bot only responds in threads explicitly **enabled** by admin
2. Use `!thread enable "My Group"` to enable
3. Thread messages are prefixed with `[Thread]` for context

## 📁 File Structure

```
channels/messenger/
├── package.json          # Dependencies
├── messenger.js         # Main bot handler
├── threadManager.js     # Thread management
├── .env                 # Configuration
├── .env.example         # Config template
├── appstate.json        # FB session (create this)
├── whitelist.json       # Auto-generated
├── threads.json         # Auto-generated
└── logs.json            # Message logs
```

## 🔧 Managing Sessions

The `appstate.json` contains Facebook session cookies. It expires periodically:

- **When it expires**: Delete and re-export fresh cookies
- **Security**: Don't share `appstate.json` - it provides full account access
- **2FA**: If using two-factor auth, complete 2FA before exporting

## 🐛 Troubleshooting

**"Login failed"**
- Check `appstate.json` format
- Verify cookies are fresh
- Check for verification checkpoints

**"No response from picobot"**
- Verify picobot server is running on port 3000
- Check `PICOBOT_API` URL in `.env`

**"Rate limit exceeded"**
- Normal behavior - wait a minute
- Adjust `RATE_LIMIT_MESSAGES` if needed

## 🔄 Integration with Other Channels

This Messenger channel follows the same pattern as other picobot channels:
- Receives messages via ws3-fca
- Forwards to picobot API at `/chat`
- Returns AI response to Messenger

Add more channels (Telegram, WhatsApp) by creating similar adapters.

---

**Author:** Rahman Leon  
**License:** MIT
