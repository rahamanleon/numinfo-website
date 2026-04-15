/**
 * Meassanger Bot Channel Handler
 * Facebook Messenger integration using ws3-fca
 */

const fs = require('fs');
const path = require('path');
const { login } = require('ws3-fca');

// Config paths
const CHANNEL_DIR = __dirname;
const CONFIG_PATH = path.join(CHANNEL_DIR, 'config.json');
const ADMIN_PATH = path.join(CHANNEL_DIR, 'admin.json');
const WHITELIST_PATH = path.join(CHANNEL_DIR, 'whitelist.json');
const APPSTATE_PATH = path.join(CHANNEL_DIR, 'appstate.json');
const THREADS_DIR = path.join(CHANNEL_DIR, 'threads');
const CONTEXTS_DIR = path.join(CHANNEL_DIR, 'contexts');

// Ensure directories exist
if (!fs.existsSync(THREADS_DIR)) fs.mkdirSync(THREADS_DIR, { recursive: true });
if (!fs.existsSync(CONTEXTS_DIR)) fs.mkdirSync(CONTEXTS_DIR, { recursive: true });

// Load configs
let config, adminConfig, whitelistConfig;

function loadConfigs() {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        adminConfig = JSON.parse(fs.readFileSync(ADMIN_PATH, 'utf8'));
        whitelistConfig = JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
    } catch (err) {
        console.error('[Messenger] Config load error:', err.message);
        process.exit(1);
    }
}

loadConfigs();

// ============ HELPER FUNCTIONS ============

function isAdmin(uid) {
    return adminConfig.admins.includes(uid.toString());
}

function isSuperAdmin(uid) {
    return uid.toString() === adminConfig.super_admin;
}

function checkWhitelist(senderID, threadID) {
    if (!whitelistConfig.enabled) return true;
    if (isAdmin(senderID)) return true; // Admins bypass
    
    const senderOk = whitelistConfig.whitelisted_users.includes(senderID.toString());
    const threadOk = whitelistConfig.whitelisted_threads.includes(threadID.toString());
    
    // Mode: 'both' = sender OR thread whitelisted
    if (whitelistConfig.mode === 'both') return senderOk || threadOk;
    if (whitelistConfig.mode === 'user_only') return senderOk;
    if (whitelistConfig.mode === 'thread_only') return threadOk;
    
    return false;
}

function loadContext(threadID) {
    const contextPath = path.join(CONTEXTS_DIR, `${threadID}.json`);
    try {
        if (fs.existsSync(contextPath)) {
            return JSON.parse(fs.readFileSync(contextPath, 'utf8'));
        }
    } catch (e) {}
    return { messages: [], created: Date.now() };
}

function saveContext(threadID, context) {
    const contextPath = path.join(CONTEXTS_DIR, `${threadID}.json`);
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}

function updateConfigs() {
    fs.writeFileSync(ADMIN_PATH, JSON.stringify(adminConfig, null, 2));
    fs.writeFileSync(WHITELIST_PATH, JSON.stringify(whitelistConfig, null, 2));
}

// ============ COMMAND HANDLERS ============

async function handleAdminCommands(api, event, args) {
    const cmd = args[0]?.toLowerCase();
    const senderID = event.senderID.toString();
    
    if (!isAdmin(senderID)) return false;
    
    switch (cmd) {
        // Whitelist Management
        case 'addwhitelistuser':
        case 'whitelistuser': {
            const uid = args[1];
            if (!uid) return api.sendMessage('❌ Usage: /whitelistuser <uid>', event.threadID);
            if (!whitelistConfig.whitelisted_users.includes(uid)) {
                whitelistConfig.whitelisted_users.push(uid);
                updateConfigs();
                return api.sendMessage(`✅ User ${uid} added to whitelist`, event.threadID);
            }
            return api.sendMessage('ℹ️ User already whitelisted', event.threadID);
        }
        
        case 'addwhitelistthread':
        case 'whitelistthread': {
            const tid = args[1];
            if (!tid) return api.sendMessage('❌ Usage: /whitelistthread <threadID>', event.threadID);
            if (!whitelistConfig.whitelisted_threads.includes(tid)) {
                whitelistConfig.whitelisted_threads.push(tid);
                updateConfigs();
                return api.sendMessage(`✅ Thread ${tid} added to whitelist`, event.threadID);
            }
            return api.sendMessage('ℹ️ Thread already whitelisted', event.threadID);
        }
        
        case 'removewhitelistuser':
        case 'blacklistuser': {
            const uid = args[1];
            if (!uid) return api.sendMessage('❌ Usage: /blacklistuser <uid>', event.threadID);
            whitelistConfig.whitelisted_users = whitelistConfig.whitelisted_users.filter(u => u !== uid);
            updateConfigs();
            return api.sendMessage(`✅ User ${uid} removed from whitelist`, event.threadID);
        }
        
        case 'removewhitelistthread':
        case 'blacklistthread': {
            const tid = args[1];
            if (!tid) return api.sendMessage('❌ Usage: /blacklistthread <threadID>', event.threadID);
            whitelistConfig.whitelisted_threads = whitelistConfig.whitelisted_threads.filter(t => t !== tid);
            updateConfigs();
            return api.sendMessage(`✅ Thread ${tid} removed from whitelist`, event.threadID);
        }
        
        case 'enablewhitelist': {
            whitelistConfig.enabled = true;
            updateConfigs();
            return api.sendMessage('✅ White Mode enabled', event.threadID);
        }
        
        case 'disablewhitelist': {
            whitelistConfig.enabled = false;
            updateConfigs();
            return api.sendMessage('✅ White Mode disabled', event.threadID);
        }
        
        // Admin Management (Super Admin only)
        case 'addadmin': {
            if (!isSuperAdmin(senderID)) {
                return api.sendMessage('❌ Super Admin only', event.threadID);
            }
            const newAdmin = args[1];
            if (!newAdmin) return api.sendMessage('❌ Usage: /addadmin <uid>', event.threadID);
            if (!adminConfig.admins.includes(newAdmin)) {
                adminConfig.admins.push(newAdmin);
                adminConfig.admin_permissions[newAdmin] = {
                    level: 'admin',
                    can_restart: true,
                    can_manage_admins: false,
                    can_manage_whitelist: true,
                    can_manage_threads: true,
                    can_access_system: false,
                    can_bypass_whitelist: true,
                    can_shutdown: false,
                    can_update_config: true
                };
                updateConfigs();
                return api.sendMessage(`✅ Admin ${newAdmin} added`, event.threadID);
            }
            return api.sendMessage('ℹ️ Already an admin', event.threadID);
        }
        
        case 'removeadmin': {
            if (!isSuperAdmin(senderID)) {
                return api.sendMessage('❌ Super Admin only', event.threadID);
            }
            const remAdmin = args[1];
            if (!remAdmin) return api.sendMessage('❌ Usage: /removeadmin <uid>', event.threadID);
            if (remAdmin === adminConfig.super_admin) {
                return api.sendMessage('❌ Cannot remove super admin', event.threadID);
            }
            adminConfig.admins = adminConfig.admins.filter(a => a !== remAdmin);
            delete adminConfig.admin_permissions[remAdmin];
            updateConfigs();
            return api.sendMessage(`✅ Admin ${remAdmin} removed`, event.threadID);
        }
        
        // Thread Management
        case 'createthread': {
            const threadName = args[1];
            const userIDs = args.slice(2);
            if (!threadName || userIDs.length < 1) {
                return api.sendMessage('❌ Usage: /createthread <name> <uid1> [uid2...]', event.threadID);
            }
            try {
                const newThreadID = await api.createNewGroup(threadName, userIDs);
                api.sendMessage(`✅ Thread "${threadName}" created
ID: ${newThreadID}`, event.threadID);
                
                // Auto-whitelist new group
                whitelistConfig.whitelisted_threads.push(newThreadID);
                updateConfigs();
            } catch (e) {
                api.sendMessage(`❌ Failed to create thread: ${e.message}`, event.threadID);
            }
            return true;
        }
        
        case 'addtothread': {
            const tid = args[1];
            const uids = args.slice(2);
            if (!tid || uids.length < 1) {
                return api.sendMessage('❌ Usage: /addtothread <threadID> <uid1> [uid2...]', event.threadID);
            }
            try {
                await api.addUserToGroup(uids, tid);
                api.sendMessage(`✅ Added ${uids.join(', ')} to thread`, event.threadID);
            } catch (e) {
                api.sendMessage(`❌ Failed: ${e.message}`, event.threadID);
            }
            return true;
        }
        
        case 'kickfromthread':
        case 'kick': {
            const tid = args[1] || event.threadID;
            const uid = args[2] || args[1];
            if (!uid) return api.sendMessage('❌ Usage: /kick <threadID> <uid> or /kick <uid> (current thread)', event.threadID);
            try {
                await api.removeUserFromGroup(uid, tid);
                api.sendMessage(`✅ Removed ${uid} from thread`, event.threadID);
            } catch (e) {
                api.sendMessage(`❌ Failed: ${e.message}`, event.threadID);
            }
            return true;
        }
        
        case 'threadinfo': {
            const infoTid = args[1] || event.threadID;
            try {
                const info = await api.getThreadInfo(infoTid);
                const msg = `📋 Thread Info:
Name: ${info.threadName || 'N/A'}
ID: ${info.threadID}
Participants: ${info.participantIDs.length}
Admin: ${info.adminIDs?.map(a => a.id).join(', ') || 'N/A'}`;
                api.sendMessage(msg, event.threadID);
            } catch (e) {
                api.sendMessage(`❌ Failed to get info: ${e.message}`, event.threadID);
            }
            return true;
        }
        
        case 'status': {
            const status = `📊 Messenger Bot Status:
• Online: ${config.settings.online}
• White Mode: ${whitelistConfig.enabled ? 'ON' : 'OFF'}
• Whitelisted Users: ${whitelistConfig.whitelisted_users.length}
• Whitelisted Threads: ${whitelistConfig.whitelisted_threads.length}
• Admins: ${adminConfig.admins.length}
• Admin UID: ${isAdmin(senderID) ? '✅ Yes' : '❌ No'}`;
            return api.sendMessage(status, event.threadID);
        }
        
        case 'restart':
        case 'reload': {
            api.sendMessage('🔄 Restarting Messenger channel...', event.threadID);
            setTimeout(() => {
                process.exit(0); // Process manager will restart
            }, 1000);
            return true;
        }
        
        default:
            return false;
    }
}

// Standard commands (same as Telegram)
async function handleStandardCommands(api, event, args) {
    const cmd = args[0]?.toLowerCase();
    
    switch (cmd) {
        case 'help': {
            const helpMsg = `🤖 Meassanger Bot Commands:

**Standard:**
/help - Show this help
/device - System status
/ping - Check connectivity

**Admin Only:**
/whitelistuser <uid>
/whitelistthread <tid>
/blacklistuser <uid>
/blacklistthread <tid>
/enablewhitelist /disablewhitelist
/createthread <name> <uids...>
/addtothread <tid> <uids...>
/kick [tid] <uid>
/threadinfo [tid]
/status - Channel status
/restart - Restart channel

**Reply to any message for AI response**`;
            return api.sendMessage(helpMsg, event.threadID);
        }
        
        case 'ping': {
            return api.sendMessage('🏓 Pong!\n📱 Messenger Bot is online', event.threadID);
        }
        
        case 'device': {
            const os = require('os');
            const deviceInfo = `📱 Device Status:

Platform: ${os.platform()} ${os.arch()}
Hostname: ${os.hostname()}
Uptime: ${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m
Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
CPU: ${os.cpus()[0]?.model || 'Unknown'}
Load: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}

🤖 Messenger Bot v1.0.0
Facebook Channel Active`;
            return api.sendMessage(deviceInfo, event.threadID);
        }
        
        default:
            return false;
    }
}

// ============ MAIN MESSAGE HANDLER ============

async function handleMessage(api, event) {
    const { body, senderID, threadID, messageID } = event;
    
    // Skip if no body
    if (!body) return;
    
    // White Mode check
    if (!checkWhitelist(senderID, threadID)) {
        console.log(`[Messenger] Blocked: User ${senderID} in thread ${threadID}`);
        return;
    }
    
    // Load thread context
    const context = loadContext(threadID);
    
    // Check for command prefix
    const prefix = '/';
    const isCommand = body.startsWith(prefix);
    
    if (isCommand) {
        const args = body.slice(prefix.length).trim().split(/\s+/);
        
        // Try admin commands first
        if (await handleAdminCommands(api, event, args)) return;
        
        // Try standard commands
        if (await handleStandardCommands(api, event, args)) return;
        
        // Unknown command
        api.sendMessage(`❓ Unknown command: /${args[0]}\nType /help for available commands`, threadID, messageID);
        return;
    }
    
    // AI Response for non-command messages
    // Build context from thread history
    const contextPrompt = context.messages.slice(-10).map(m => {
        return `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`;
    }).join('\n');
    
    // Send typing indicator
    if (config.settings.updatePresence) {
        api.sendTypingIndicator(threadID, true);
    }
    
    // Log message
    context.messages.push({
        role: 'user',
        content: body,
        timestamp: Date.now(),
        senderID: senderID
    });
    
    // For now, echo with context (Picobot will replace this with AI)
    // This is where you'd integrate with your LLM
    const response = `🤖 You said: "${body}"\n\n(I'm waiting for AI integration - normally I'd respond intelligently here)`;
    
    // Send response
    api.sendMessage(response, threadID, messageID, (err) => {
        if (err) console.error('[Messenger] Send error:', err);
        
        // Store bot response in context
        context.messages.push({
            role: 'assistant',
            content: response,
            timestamp: Date.now()
        });
        
        saveContext(threadID, context);
    });
    
    // Disable typing
    if (config.settings.updatePresence) {
        api.sendTypingIndicator(threadID, false);
    }
}

// ============ STARTUP ============

function startBot() {
    // Check for appstate
    if (!fs.existsSync(APPSTATE_PATH)) {
        console.error('[Messenger] ❌ appstate.json not found!');
        console.error('[Messenger] Please provide your Facebook session cookies.');
        console.error('[Messenger] Get cookies using C3C FbState or CookieEditor browser extension.');
        return;
    }
    
    let credentials;
    try {
        credentials = { 
            appState: JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8')) 
        };
    } catch (err) {
        console.error('[Messenger] ❌ Invalid appstate.json:', err.message);
        return;
    }
    
    console.log('[Messenger] 🔐 Logging in to Facebook...');
    
    login(credentials, {
        online: config.settings.online,
        updatePresence: config.settings.updatePresence,
        selfListen: config.settings.selfListen,
        randomUserAgent: config.settings.randomUserAgent,
        autoMarkDelivery: config.settings.autoMarkDelivery,
        autoMarkRead: config.settings.autoMarkRead
    }, (err, api) => {
        if (err) {
            console.error('[Messenger] ❌ Login failed:', err);
            return;
        }
        
        console.log('[Messenger] ✅ Logged in successfully');
        console.log(`[Messenger] 🤖 Current User ID: ${api.getCurrentUserID()}`);
        console.log('[Messenger] 📱 Listening for messages...');
        
        // Set up listener
        api.listenMqtt((err, event) => {
            if (err) {
                console.error('[Messenger] Listen error:', err);
                return;
            }
            
            if (!event || !event.body) return;
            if (event.type !== 'message' && event.type !== 'message_reply') return;
            
            // Reload configs on each message (for hot-reload)
            loadConfigs();
            
            handleMessage(api, event).catch(e => {
                console.error('[Messenger] Handler error:', e);
            });
        });
    });
}

// Start
startBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('[Messenger] 👋 Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[Messenger] 👋 Shutting down...');
    process.exit(0);
});
