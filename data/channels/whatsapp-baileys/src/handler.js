const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');
const { saveIncomingMessage, checkForResponses, cleanupOldFiles } = require('./bridge');

// === CONFIGURATION ===
const SESSION_DIR = path.join(__dirname, '..', 'sessions');
const CREDS_FILE = path.join(SESSION_DIR, 'creds.json');
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const { adminWhatsAppNumbers, allowMessagesFrom, prefix, logMessages, autoReconnect } = config;

// Logger
const logger = pino({ level: config.logLevel || 'silent' });

// Bot state
let sock = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let responsePollingInterval = null;

// === AUTHENTICATION STATE ===
async function getAuthState() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    return { state, saveCreds };
}

// === CHECK IF AUTHENTICATED ===
function isAuthenticated() {
    return fs.existsSync(CREDS_FILE);
}

// === WHATSAPP CONNECTION ===
async function connectToWhatsApp() {
    try {
        console.log('[WhatsApp] 🔄 Starting connection...');
        
        const { state, saveCreds } = await getAuthState();
        const { version, isLatest } = await fetchLatestBaileysVersion();
        
        console.log(`[WhatsApp] 📦 Using Baileys v${version.join('.')}, isLatest: ${isLatest}`);
        
        if (isAuthenticated()) {
            console.log('[WhatsApp] ✅ Found creds.json - attempting to restore session...');
        } else {
            console.log('[WhatsApp] 📱 No creds.json found - will show QR code for pairing...');
        }
        
        sock = makeWASocket({
            version,
            logger,
            auth: state,
            browser: ['picoclaw (Baileys)', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
        });
        
        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);
        
        // Connection update handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('[WhatsApp] 📱 Scan this QR code with WhatsApp:');
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'close') {
                const shouldReconnect = 
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut &&
                    autoReconnect;
                
                isConnected = false;
                
                if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    console.log(`[WhatsApp] ⚠️ Connection closed. Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                    
                    setTimeout(connectToWhatsApp, 5000);
                } else if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    console.log('[WhatsApp] 🔒 Logged out - clearing creds.json');
                    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                    fs.mkdirSync(SESSION_DIR, { recursive: true });
                    reconnectAttempts = 0;
                    setTimeout(connectToWhatsApp, 2000);
                } else {
                    console.log('[WhatsApp] ❌ Connection closed permanently. Max reconnection attempts reached.');
                }
            } else if (connection === 'open') {
                isConnected = true;
                reconnectAttempts = 0;
                console.log('[WhatsApp] ✅ Connected successfully!');
                console.log(`[WhatsApp] 👤 User: ${sock.user?.id.split(':')[0]}`);
                console.log(`[WhatsApp] 🔑 creds.json saved in ${SESSION_DIR}`);
                
                // Start AI bridge polling
                startResponsePolling();
                
                // Send startup message to admin
                const adminJid = adminWhatsAppNumbers[0]?.replace('+', '') + '@s.whatsapp.net';
                if (adminJid) {
                    await sock.sendMessage(adminJid, { 
                        text: '🤖 *picoclaw WhatsApp Bot* is now online!\n\n✅ AI Bridge active - Messages will be forwarded to picoclaw AI via Telegram.' 
                    });
                }
            }
        });
        
        // Messages handler
        sock.ev.on('messages.upsert', async (m) => {
            try {
                if (m.type !== 'notify') return;
                
                for (const message of m.messages) {
                    if (message.key.fromMe) continue; // Skip own messages
                    
                    const sender = message.key.remoteJid;
                    const senderNumber = sender?.replace(/[^0-9]/g, '');
                    const pushName = message.pushName || 'Unknown';
                    const text = extractText(message);
                    
                    // Log message
                    if (logMessages) {
                        console.log(`[WhatsApp] 📩 ${pushName} (${sender}): ${text}`);
                    }
                    
                    // Filter: only accept from allowlist
                    const normalizedSender = senderNumber?.replace(/^420/, '').replace(/^88/, ''); // Remove country codes if present
                    const isAdmin = adminWhatsAppNumbers.some(num => {
                        const normalizedAdmin = num.replace(/[^0-9]/g, '').replace(/^88/, '');
                        const normalizedSenderClean = senderNumber?.replace(/[^0-9]/g, '').replace(/^88/, '');
                        return normalizedSenderClean?.includes(normalizedAdmin) || 
                               senderNumber?.includes(normalizedAdmin);
                    });
                    const isAllowed = allowMessagesFrom === 'all' || 
                                      (allowMessagesFrom === 'admin' && isAdmin) ||
                                      (allowMessagesFrom === 'whitelist' && isAdmin);
                    
                    if (!isAllowed) {
                        if (logMessages) {
                            console.log(`[WhatsApp] ⛔ Ignored message from non-whitelisted: ${pushName} (${senderNumber})`);
                        }
                        continue;
                    }
                    
                    // Process commands
                    if (text.startsWith(prefix)) {
                        const args = text.slice(prefix.length).trim().split(/\s+/);
                        const command = args.shift().toLowerCase();
                        
                        await handleCommand(command, args, message, pushName, isAdmin);
                    } else {
                        // AI chat mode - forward to picoclaw (placeholder for integration)
                        await handleAIChat(text, message, pushName, isAdmin);
                    }
                }
            } catch (err) {
                console.error('[WhatsApp] ❌ Error handling message:', err.message);
            }
        });
        
        return sock;
    } catch (err) {
        console.error('[WhatsApp] ❌ Connection error:', err.message);
        if (autoReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(connectToWhatsApp, 5000);
        }
    }
}

// === EXTRACT TEXT FROM MESSAGE ===
function extractText(message) {
    const msg = message.message;
    if (!msg) return '';
    
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    if (msg.buttonsResponseMessage?.selectedDisplayText) return msg.buttonsResponseMessage.selectedDisplayText;
    if (msg.listResponseMessage?.title) return msg.listResponseMessage.title;
    
    return '';
}

// === COMMAND HANDLER ===
async function handleCommand(command, args, message, pushName, isAdmin) {
    const sender = message.key.remoteJid;
    const senderNumber = sender?.replace(/[^0-9]/g, '');
    
    // Send typing indicator
    await sock.sendPresenceUpdate('composing', sender);
    
    switch (command) {
        case 'ping':
            await sock.sendMessage(sender, { text: '🏓 *Pong!* WhatsApp bot is responsive.' });
            break;
            
        case 'status':
            const statusMsg = `📊 *WhatsApp Bot Status*\n\n` +
                `✅ Connected: ${isConnected ? 'Yes' : 'No'}\n` +
                `👤 Your number: ${senderNumber}\n` +
                `🛡️ Admin: ${isAdmin ? 'Yes' : 'No'}\n` +
                `🔑 creds.json: ${isAuthenticated() ? 'Found' : 'Not found'}\n` +
                `⏰ Uptime: ${process.uptime().toFixed(0)}s`;
            await sock.sendMessage(sender, { text: statusMsg });
            break;
            
        case 'help':
            const helpMsg = `🤖 *picoclaw WhatsApp Commands*\n\n` +
                `*Public:*\n` +
                `${prefix}ping - Check if bot is online\n` +
                `${prefix}status - Show bot status\n` +
                `${prefix}help - Show this help\n\n` +
                `*Admin only:*\n` +
                `${prefix}restart - Restart the bot\n` +
                `${prefix}logout - Logout and clear creds.json\n` +
                `${prefix}exec <cmd> - Execute command (careful!)`;
            await sock.sendMessage(sender, { text: helpMsg });
            break;
            
        case 'restart':
            if (!isAdmin) {
                await sock.sendMessage(sender, { text: '⛔ Admin only command' });
                return;
            }
            await sock.sendMessage(sender, { text: '♻️ Restarting bot...' });
            setTimeout(() => process.exit(0), 1000);
            break;
            
        case 'logout':
            if (!isAdmin) {
                await sock.sendMessage(sender, { text: '⛔ Admin only command' });
                return;
            }
            await sock.sendMessage(sender, { text: '🔒 Logging out and clearing session...' });
            if (sock) {
                await sock.logout();
            }
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            setTimeout(() => process.exit(0), 1000);
            break;
            
        case 'exec':
            if (!isAdmin) {
                await sock.sendMessage(sender, { text: '⛔ Admin only command' });
                return;
            }
            const cmd = args.join(' ');
            if (!cmd) {
                await sock.sendMessage(sender, { text: '⚠️ Usage: !exec <command>' });
                return;
            }
            exec(cmd, { cwd: process.cwd() }, async (error, stdout, stderr) => {
                const output = error ? `Error: ${error.message}\n${stderr}` : stdout || 'Command executed (no output)';
                await sock.sendMessage(sender, { text: `💻 *Exec Result:*\n\n\`\`\`\n${output.slice(0, 3000)}\n\`\`\`` });
            });
            break;
            
        default:
            await sock.sendMessage(sender, { text: `❓ Unknown command: ${command}\nUse ${prefix}help for available commands.` });
    }
    
    // Stop typing
    await sock.sendPresenceUpdate('paused', sender);
}

// === AI CHAT HANDLER (Bridge Mode) ===
async function handleAIChat(text, message, pushName, isAdmin) {
    const sender = message.key.remoteJid;
    const senderNumber = sender?.replace(/[^0-9]/g, '');
    
    // Send "typing" indicator
    await sock.sendPresenceUpdate('composing', sender);
    
    // Save message to bridge for picoclaw to pick up
    saveIncomingMessage({
        senderNumber: senderNumber,
        pushName: pushName,
        text: text,
        timestamp: Date.now()
    });
    
    // Wait for response (poll bridge)
    let responseReceived = false;
    let attempts = 0;
    const maxAttempts = 60; // Wait up to 30 seconds (polling every 500ms)
    
    while (!responseReceived && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check for AI response
        const responses = [];
        checkForResponses((data) => {
            if (data.replyTo === `${Date.now()}_${senderNumber}` || 
                data.senderNumber === senderNumber) {
                responses.push(data);
            }
        });
        
        if (responses.length > 0) {
            const latestResponse = responses[responses.length - 1];
            await sock.sendMessage(sender, { text: latestResponse.message });
            responseReceived = true;
        }
        
        attempts++;
    }
    
    // If no response after timeout, send placeholder
    if (!responseReceived) {
        await sock.sendMessage(sender, { 
            text: `⏳ *Message sent to picoclaw AI*\n\nSent: "${text}"\n\nI'm processing your message through Telegram bridge. Reply coming soon...` 
        });
    }
    
    // Stop typing
    await sock.sendPresenceUpdate('paused', sender);
}

// === POLL FOR AI RESPONSES (Background Task) ===
function startResponsePolling() {
    if (responsePollingInterval) {
        clearInterval(responsePollingInterval);
    }
    
    const pendingResponses = new Map(); // Track sent messages to avoid duplicates
    
    responsePollingInterval = setInterval(() => {
        checkForResponses(async (data) => {
            // Check if we already sent this response
            if (pendingResponses.has(data.id)) {
                return;
            }
            
            const senderJid = `${data.senderNumber}@s.whatsapp.net`;
            
            try {
                await sock.sendMessage(senderJid, { text: data.message });
                pendingResponses.set(data.id, Date.now());
                
                // Cleanup old entries after 5 minutes
                if (pendingResponses.size > 100) {
                    const now = Date.now();
                    for (const [id, time] of pendingResponses) {
                        if (now - time > 5 * 60 * 1000) {
                            pendingResponses.delete(id);
                        }
                    }
                }
            } catch (err) {
                console.error('[Bridge] ❌ Failed to send response:', err.message);
            }
        });
        
        // Cleanup old processed files
        cleanupOldFiles();
    }, 1000); // Check every second
    
    console.log('[Bridge] ✅ AI Bridge polling started - checking for responses every 1s');
}

// === GRACEFUL SHUTDOWN ===
process.on('SIGINT', async () => {
    console.log('\n[WhatsApp] 👋 Graceful shutdown...');
    if (sock) {
        await sock.end();
    }
    process.exit(0);
});

// === START ===
console.log('[WhatsApp] 🤖 Starting Baileys WhatsApp bot...');
console.log('[WhatsApp] 📁 Session directory:', SESSION_DIR);
console.log('[WhatsApp] 🔐 creds.json location:', CREDS_FILE);

connectToWhatsApp();