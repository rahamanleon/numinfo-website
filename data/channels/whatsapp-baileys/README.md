# WhatsApp Bot for picoclaw 🤖

This WhatsApp bot uses **Baileys** library with `creds.json` authentication method.

## ✨ Features

- ✅ **creds.json Authentication** - Credentials saved and reused automatically
- ✅ **QR Code Login** - First-time setup via terminal QR
- ✅ **Auto Reconnect** - Handles disconnections gracefully
- ✅ **Whitelist/Admin Mode** - Only authorized numbers can interact
- ⚡ **Fast & Lightweight** - No headless browser needed

## 📁 Structure

```
whatsapp-baileys/
├── src/
│   └── handler.js         # Main bot handler
├── sessions/
│   └── creds.json         # Generated after first login
├── config/
│   └── config.json        # Bot configuration
└── package.json
```

## 🚀 Quick Start

### 1. Configure Admin Number

Edit `config/config.json`:
```json
{
    "adminWhatsAppNumbers": ["+YOUR_NUMBER_HERE"],
    ...
}
```

### 2. Start the Bot

```bash
npm start
```

### 3. Scan QR Code

On first run, a **QR code** will appear in your terminal. 
Open WhatsApp → Settings → Linked Devices → Link a Device → Scan the code.

### 4. creds.json Created! ✅

After successful login, `sessions/creds.json` is created. 
This file stores your WhatsApp credentials - **keep it secure!**

## 🔐 Authentication Flow

```
First Run:
1. No creds.json → Show QR code
2. User scans QR code
3. WhatsApp authenticates
4. creds.json saved → Future runs use this file

Subsequent Runs:
1. Found creds.json → Automatic login
2. No QR code needed
3. Ready to receive messages immediately
```

## 📱 Commands

| Command | Description | Admin Only |
|---------|-------------|------------|
| `!ping` | Check bot status | No |
| `!status` | Show connection info | No |
| `!help` | Show commands list | No |
| `!restart` | Restart bot | ✅ Yes |
| `!logout` | Logout & clear session | ✅ Yes |
| `!exec <cmd>` | Execute shell command | ✅ Yes |

## 🔧 Configuration Options

**config/config.json:**

| Option | Description | Default |
|--------|-------------|---------|
| `adminWhatsAppNumbers` | Admin phone numbers | `["+59175124193"]` |
| `allowMessagesFrom` | Filter: `all`/`admin`/`whitelist` | `admin` |
| `prefix` | Command prefix | `!` |
| `logMessages` | Log incoming messages | `true` |
| `autoReconnect` | Auto reconnect on disconnect | `true` |

## ⚠️ Important Security Notes

1. **creds.json** contains your WhatsApp credentials
   - Never commit to Git
   - Never share with anyone
   - Already in .gitignore ✅

2. **Admin Numbers** have full system access
   - Review config.json before starting

3. **Allow Messages From** controls who can message the bot
   - `admin` = only admin can message
   - `all` = anyone can message
   - `whitelist` = specific list

## 🔄 Re-authenticate / Get New QR

To reset login and get a new QR code:

```bash
# Delete credentials and restart
rm -rf sessions/*
npm start
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No QR showing | Check terminal supports unicode, or try different terminal |
| "Logged out" error | Delete `sessions/creds.json` and scan QR again |
| Connection fails | Check internet, restart bot |
| Can't receive messages | Verify admin number is in config |

## 📊 Integration with picoclaw

This bot can be integrated with picoclaw's main system to:
- Forward messages to picoclaw AI
- Execute picoclaw skills via WhatsApp
- Use WhatsApp as a chat interface for picoclaw

## 📚 Credits

- Uses [Baileys](https://github.com/WhiskeySockets/Baileys) - Baileys library
- Multi-file auth state for credential persistence