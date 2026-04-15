# 🚘 Messenger Bot Channel

Facebook Messenger channel for Picobot using ws3-fca API.

---

## Features

- ✅ Real-time Facebook Messenger listening via MQTT
- ✅ AI-powered responses (same as Telegram)
- ✅ Command support (`/device`, `/help`, etc.)
- ✅ White Mode - whitelist users + threads
- ✅ Thread management - create/manage groups
- ✅ Admin privileges for UID `100037951718438`
- ✅ Shared command set with Telegram
- ✅ Thread-context memory per conversation

---

## Configuration

### Required Setup

1. **Install ws3-fca dependency:**
   ```bash
   cd "/data/data/com.termux/files/home/.picoclaw/data/channels/Meassanger Bot"
   npm install ws3-fca@latest
   ```

2. **Provide appstate.json:**
   - Get cookies from Facebook via browser extension (C3C FbState/CookieEditor)
   - Save to `appstate.json` OR provide to bot

3. **Configure whitelist (optional):**
   Edit `whitelist.json` to enable White Mode

---

## File Structure

```
Meassanger Bot/
├── CHANNEL.md          # This documentation
├── messenger.js          # Main channel handler
├── config.json          # Channel configuration
├── admin.json           # Admin UID settings
├── whitelist.json       # White mode configuration
├── appstate.json        # Facebook session (you provide)
├── package.json         # NPM dependencies
├── threads/             # Thread state storage
└── contexts/            # Per-thread conversation memory
```

---

## Admin Commands (UID: 100037951718438)

| Command | Description |
|---------|-------------|
| `/addadmin <uid>` | Add new admin |
| `/removeadmin <uid>` | Remove admin |
| `/whitelistuser <uid>` | Add user to whitelist |
| `/whitelistthread <tid>` | Add thread to whitelist |
| `/blacklistuser <uid>` | Remove user from whitelist |
| `/blacklistthread <tid>` | Remove thread whitelist |
| `/enablewhitelist` | Enable White Mode |
| `/disablewhitelist` | Disable White Mode |
| `/createthread <name> <user_ids...>` | Create new group |
| `/addtothread <tid> <uids...>` | Add users to thread |
| `/kickfromthread <tid> <uid>` | Remove user from thread |
| `/threadinfo <tid>` | Get thread information |
| `/restart` | Restart Messenger channel |
| `/status` | Channel status |

---

## Standard Commands

Same commands as Telegram channel:
- `/device` - System status
- `/help` - Show help
- `/search <query>` - Web search
- etc.

---

## White Mode

When enabled, bot only responds to:
- Whitelisted user IDs OR
- Messages in whitelisted thread IDs

Admins bypass whitelist always.

---

## Thread Context

Each Messenger thread maintains its own conversation memory:
- Context is stored in `contexts/<threadID>.json`
- Auto-cleanup after 24h of inactivity

---

## Author

- Channel: Meassanger Bot
- Admin UID: 100037951718438
- Platform: Facebook Messenger
