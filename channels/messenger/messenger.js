/**
 * picobot Messenger Channel
 * Uses ws3-fca for Facebook Messenger integration
 * 
 * Features:
 * - Admin-only access (UID: 100037951718438)
 * - Whitelist mode for controlled responses
 * - Thread support
 * - Full picobot API integration
 * - Message logging & rate limiting
 */

const login = require('ws3-fca');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');

// =============================================
// CONFIGURATION
// =============================================

const CFG = {
  // Admin Configuration
  ADMIN_UID: process.env.ADMIN_UID || '100037951718438',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Bot Admin',
  
  // Bot Identity  
  BOT_NAME: process.env.BOT_NAME || 'picobot',
  BOT_PREFIX: process.env.BOT_PREFIX || '!',
  
  // Channel
  CHANNEL: 'messenger',
  
  // Mode: 'open', 'whitelist', 'admin'
  MODE: process.env.MODE || 'whitelist',
  
  // White Mode - only respond to whitelisted users
  WHITE_MODE: process.env.WHITE_MODE === 'true',
  
  // Thread Support
  THREAD_MODE: process.env.THREAD_MODE !== 'false',
  THREAD_PREFIX: process.env.THREAD_PREFIX || '[Thread]',
  
  // API
  PICOBOT_API: process.env.PICOBOT_API || 'http://localhost:3000/chat',
  
  // Files
  APPSTATE_FILE: path.join(__dirname, 'appstate.json'),
  WHITELIST_FILE: path.join(__dirname, 'whitelist.json'),
  THREADS_FILE: path.join(__dirname, 'threads.json'),
  LOGS_FILE: path.join(__dirname, 'logs.json'),
  
  // Rate limiting
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
  RATE_LIMIT_MSG: parseInt(process.env.RATE_LIMIT_MESSAGES) || 20,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  
  // Auto-reactions
  AUTO_REACT: process.env.AUTO_REACT === 'true',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// =============================================
// DATA STORES
// =============================================

let whitelist = new Set();
let activeThreads = new Map();
let rateLimiter = new Map();
let conversationHistory = new Map();

// =============================================
// LOGGING SYSTEM
// =============================================

const log = {
  levels: { debug: 0, info: 1, warn: 2, error: 3 },
  
  shouldLog(level) {
    return this.levels[level] >= this.levels[CFG.LOG_LEVEL];
  },
  
  debug(msg, data) {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[${timestamp()}] 🔧 ${msg}`), data || '');
    }
  },
  
  info(msg, data) {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[${timestamp()}] ℹ️ ${msg}`), data || '');
    }
  },
  
  success(msg, data) {
    console.log(chalk.green(`[${timestamp()}] ✅ ${msg}`), data || '');
  },
  
  warn(msg, data) {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow(`[${timestamp()}] ⚠️ ${msg}`), data || '');
    }
  },
  
  error(msg, data) {
    if (this.shouldLog('error')) {
      console.log(chalk.red(`[${timestamp()}] ❌ ${msg}`), data || '');
    }
  },
  
  message(direction, from, text, thread = null) {
    const prefix = direction === 'IN' ? chalk.cyan('←') : chalk.magenta('→');
    const threadInfo = thread ? chalk.gray(` [${thread}]`) : '';
    console.log(`${prefix} [${timestamp()}] ${chalk.white(from)}${threadInfo}: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
  }
};

function timestamp() {
  return moment().format('HH:mm:ss');
}

// =============================================
// DATA PERSISTENCE
// =============================================

async function loadData() {
  try {
    // Load whitelist
    if (await fs.pathExists(CFG.WHITELIST_FILE)) {
      const data = await fs.readJson(CFG.WHITELIST_FILE);
      whitelist = new Set(data.users || []);
      // Always include admin
      whitelist.add(CFG.ADMIN_UID);
      log.success(`Loaded whitelist: ${whitelist.size} users`);
    } else {
      // Create initial whitelist with admin
      whitelist.add(CFG.ADMIN_UID);
      await saveWhitelist();
      log.info('Created initial whitelist with admin');
    }
    
    // Load active threads
    if (await fs.pathExists(CFG.THREADS_FILE)) {
      const data = await fs.readJson(CFG.THREADS_FILE);
      activeThreads = new Map(Object.entries(data));
      log.info(`Loaded ${activeThreads.size} active threads`);
    }
  } catch (err) {
    log.error('Failed to load data', err.message);
  }
}

async function saveWhitelist() {
  try {
    await fs.writeJson(CFG.WHITELIST_FILE, { 
      users: Array.from(whitelist),
      updated: new Date().toISOString()
    }, { spaces: 2 });
  } catch (err) {
    log.error('Failed to save whitelist', err.message);
  }
}

async function saveThreads() {
  try {
    const obj = Object.fromEntries(activeThreads);
    await fs.writeJson(CFG.THREADS_FILE, obj, { spaces: 2 });
  } catch (err) {
    log.error('Failed to save threads', err.message);
  }
}

async function logMessage(msg) {
  try {
    if (!await fs.pathExists(CFG.LOGS_FILE)) {
      await fs.writeJson(CFG.LOGS_FILE, { messages: [] });
    }
    const data = await fs.readJson(CFG.LOGS_FILE);
    data.messages.push({
      ...msg,
      timestamp: new Date().toISOString()
    });
    // Keep only last 1000 messages
    if (data.messages.length > 1000) data.messages = data.messages.slice(-1000);
    await fs.writeJson(CFG.LOGS_FILE, data, { spaces: 2 });
  } catch (err) {
    // Silent fail for logging
  }
}

// =============================================
// RATE LIMITING
// =============================================

function checkRateLimit(userId) {
  if (!CFG.RATE_LIMIT_ENABLED) return true;
  
  const now = Date.now();
  const userData = rateLimiter.get(userId) || { count: 0, reset: now + CFG.RATE_LIMIT_WINDOW };
  
  // Reset window
  if (now > userData.reset) {
    userData.count = 0;
    userData.reset = now + CFG.RATE_LIMIT_WINDOW;
  }
  
  // Check limit
  if (userData.count >= CFG.RATE_LIMIT_MSG) {
    return false;
  }
  
  userData.count++;
  rateLimiter.set(userId, userData);
  return true;
}

// =============================================
// ACCESS CONTROL
// =============================================

function isAdmin(uid) {
  return uid === CFG.ADMIN_UID;
}

function isWhitelisted(uid) {
  if (CFG.MODE === 'admin') return isAdmin(uid);
  if (!CFG.WHITE_MODE && CFG.MODE === 'open') return true;
  return whitelist.has(uid);
}

function canRespond(uid, threadId = null) {
  // Admin can always respond
  if (isAdmin(uid)) return true;
  
  // Check whitelist
  if (CFG.WHITE_MODE || CFG.MODE === 'whitelist') {
    if (!whitelist.has(uid)) return false;
  }
  
  // Check rate limit
  if (!checkRateLimit(uid)) return false;
  
  return true;
}

// =============================================
// COMMAND HANDLERS
// =============================================

const adminCommands = {
  async whitelist(api, { senderID, args }) {
    if (!isAdmin(senderID)) return '⛔ Access denied';
    
    const uid = args[0];
    if (!uid) return '⚠️ Usage: !whitelist <uid>';
    
    whitelist.add(uid);
    await saveWhitelist();
    return `✅ Added ${uid} to whitelist`;
  },
  
  async unwhitelist(api, { senderID, args }) {
    if (!isAdmin(senderID)) return '⛔ Access denied';
    
    const uid = args[0];
    if (!uid) return '⚠️ Usage: !unwhitelist <uid>';
    
    if (uid === CFG.ADMIN_UID) return '⛔ Cannot remove admin from whitelist';
    
    whitelist.delete(uid);
    await saveWhitelist();
    return `✅ Removed ${uid} from whitelist`;
  },
  
  async listwhitelist(api, { senderID }) {
    if (!isAdmin(senderID)) return '⛔ Access denied';
    
    const users = Array.from(whitelist);
    return `📋 Whitelisted users (${users.length}):\n${users.map((u, i) => `${i + 1}. ${u}${u === CFG.ADMIN_UID ? ' (Admin)' : ''}`).join('\n')}`;
  },
  
  async mode(api, { senderID, args }) {
    if (!isAdmin(senderID)) return '⛔ Access denied';
    
    const newMode = args[0]?.toLowerCase();
    if (!['open', 'whitelist', 'admin'].includes(newMode)) {
      return '⚠️ Usage: !mode <open|whitelist|admin>';
    }
    
    CFG.MODE = newMode;
    CFG.WHITE_MODE = newMode === 'whitelist';
    return `✅ Mode set to: ${newMode}${CFG.WHITE_MODE ? ' (whitelist active)' : ''}`;
  },
  
  async status(api, { senderID }) {
    if (!isAdmin(senderID)) return '⛔ Access denied';
    
    return `📊 picobot Status:
• Mode: ${CFG.MODE}
• White Mode: ${CFG.WHITE_MODE ? 'ON' : 'OFF'}
• Thread Mode: ${CFG.THREAD_MODE ? 'ON' : 'OFF'}
• Whitelisted: ${whitelist.size} users
• Active Threads: ${activeThreads.size}
• Rate Limit: ${CFG.RATE_LIMIT_MSG}/${CFG.RATE_LIMIT_WINDOW}ms`;
  },
  
  async thread(api, { senderID, threadID, args }) {
    if (!isAdmin(senderID)) return '⛔ Access denied';
    if (!CFG.THREAD_MODE) return '⚠️ Thread mode is disabled';
    
    const action = args[0]?.toLowerCase();
    const name = args.slice(1).join(' ') || `Thread_${threadID}`;
    
    if (action === 'enable') {
      activeThreads.set(threadID, { name, enabled: true, created: Date.now() });
      await saveThreads();
      return `✅ Thread "${name}" enabled for bot responses`;
    }
    
    if (action === 'disable') {
      activeThreads.delete(threadID);
      await saveThreads();
      return `✅ Thread disabled`;
    }
    
    if (action === 'list') {
      const threads = Array.from(activeThreads.entries());
      return `📋 Active threads (${threads.length}):\n${threads.map(([id, t]) => `• ${t.name} (${id})`).join('\n')}`;
    }
    
    return '⚠️ Usage: !thread <enable|disable|list> [name]';
  },
  
  async help(api, { senderID, isAdmin: admin }) {
    const baseHelp = `🤖 picobot Commands:

User commands:
- !help - Show this help`;

    const adminHelp = `

Admin commands:
- !whitelist <uid> - Add user to whitelist
- !unwhitelist <uid> - Remove from whitelist  
- !listwhitelist - Show whitelist
- !mode <open|whitelist|admin> - Set response mode
- !status - Show bot status
- !thread <enable|disable|list> [name] - Thread management`;

    return baseHelp + (admin ? adminHelp : '');
  }
};

async function handleCommand(api, msg, command, args) {
  const handler = adminCommands[command];
  if (!handler) return null;
  
  return await handler(api, {
    senderID: msg.senderID,
    threadID: msg.threadID,
    messageID: msg.messageID,
    args,
    isAdmin: isAdmin(msg.senderID)
  });
}

// =============================================
// PICOBOT API INTEGRATION
// =============================================

async function queryPicobot(text, userId, threadId = null, history = []) {
  try {
    const response = await axios.post(CFG.PICOBOT_API, {
      messages: [
        ...history,
        { role: 'user', content: text, userId, threadId, channel: CFG.CHANNEL }
      ],
      context: {
        channel: CFG.CHANNEL,
        threadId,
        userId,
        isAdmin: isAdmin(userId),
        isWhitelisted: isWhitelisted(userId)
      }
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data?.reply || 'No response from picobot';
  } catch (err) {
    log.error('Picobot API error', err.message);
    return '⚠️ Sorry, I\'m having trouble connecting to my brain right now.';
  }
}

// =============================================
// MESSAGE HANDLER
// =============================================

async function handleMessage(api, msg) {
  try {
    const { senderID, threadID, messageID, body, attachments } = msg;
    
    // Skip bot's own messages
    if (senderID === api.getCurrentUserID()) return;
    
    const text = body || '';
    const hasAttachment = attachments && attachments.length > 0;
    
    // Log incoming message
    log.message('IN', senderID, text, threadID);
    await logMessage({
      direction: 'in',
      sender: senderID,
      text,
      threadID,
      messageID,
      hasAttachment
    });
    
    // Auto-react if enabled
    if (CFG.AUTO_REACT && !isAdmin(senderID)) {
      api.setMessageReaction('👋', messageID, () => {}, true);
    }
    
    // Check if in thread mode
    const isThread = msg.type === 'message' && threadID !== msg.senderID;
    if (isThread && CFG.THREAD_MODE) {
      const threadInfo = activeThreads.get(threadID);
      if (!threadInfo) {
        log.debug('Ignoring message from inactive thread', threadID);
        return;
      }
    }
    
    // Check access (admin always passes)
    if (!canRespond(senderID, threadID)) {
      if (isAdmin(senderID)) {
        // Admin can override
      } else if (!isWhitelisted(senderID)) {
        log.warn(`Blocked non-whitelisted user: ${senderID}`);
        return;
      } else if (!checkRateLimit(senderID)) {
        api.sendMessage('⚠️ Rate limit exceeded. Please slow down.', threadID);
        return;
      }
    }
    
    // Handle commands
    if (text.startsWith(CFG.BOT_PREFIX)) {
      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      const result = await handleCommand(api, msg, cmd, args);
      if (result) {
        api.sendMessage(result, threadID);
        log.message('OUT', CFG.BOT_NAME, result, threadID);
        return;
      }
    }
    
    // Get conversation history for context
    const chatKey = threadID || senderID;
    let history = conversationHistory.get(chatKey) || [];
    if (history.length > 10) history = history.slice(-10);
    
    // Query picobot
    const reply = await queryPicobot(text, senderID, threadID, history);
    
    // Update history
    history.push({ role: 'user', content: text });
    history.push({ role: 'assistant', content: reply });
    conversationHistory.set(chatKey, history);
    
    // Send response
    const prefix = isThread && CFG.THREAD_MODE ? `${CFG.THREAD_PREFIX} ` : '';
    const fullReply = `${prefix}${reply}`;
    
    api.sendMessage(fullReply, threadID, (err) => {
      if (err) {
        log.error('Failed to send message', err);
      } else {
        log.message('OUT', CFG.BOT_NAME, fullReply, threadID);
      }
    });
    
    // Log outgoing
    await logMessage({
      direction: 'out',
      sender: CFG.BOT_NAME,
      text: fullReply,
      threadID,
      replyingTo: messageID
    });
    
  } catch (err) {
    log.error('Message handler error', err);
  }
}

// =============================================
// MAIN BOT
// =============================================

async function startBot() {
  log.info('╔════════════════════════════════════╗');
  log.info('║     picobot Messenger Channel      ║');
  log.info('║         Powered by ws3-fca         ║');
  log.info('╚════════════════════════════════════╝');
  
  // Load data
  await loadData();
  
  // Check for appstate
  if (!await fs.pathExists(CFG.APPSTATE_FILE)) {
    log.error('Missing appstate.json');
    log.info('');
    log.info('═══════════════════════════════════════════');
    log.info('  SETUP REQUIRED:');
    log.info('═══════════════════════════════════════════');
    log.info('');
    log.info('1. Login to Facebook in your browser');
    log.info('2. Use "C3C FbState" or "CookieEditor" extension');
    log.info('3. Export cookies as JSON');
    log.info('4. Save to:', CFG.APPSTATE_FILE);
    log.info('');
    log.info('Expected format:');
    log.info(JSON.stringify([{key:'c_user',value:'...',domain:'.facebook.com'}, {key:'xs',value:'...',domain:'.facebook.com'}], null, 2));
    log.info('');
    process.exit(1);
  }
  
  // Load appstate
  let appState;
  try {
    appState = await fs.readJson(CFG.APPSTATE_FILE);
    log.success('Loaded appstate.json');
  } catch (err) {
    log.error('Invalid appstate.json', err.message);
    process.exit(1);
  }
  
  // Login to Facebook
  log.info('Logging into Facebook...');
  
  login({ appState }, (err, api) => {
    if (err) {
      log.error('Login failed', err);
      log.error('Your appstate.json may be expired. Please regenerate it.');
      return;
    }
    
    log.success('Connected to Facebook Messenger!');
    log.info('');
    log.info('═══════════════════════════════════════════');
    log.info(`  Admin UID: ${CFG.ADMIN_UID}`);
    log.info(`  Mode: ${CFG.MODE} ${CFG.WHITE_MODE ? '(whitelist)' : ''}`);
    log.info(`  Threads: ${CFG.THREAD_MODE ? 'enabled' : 'disabled'}`);
    log.info('═══════════════════════════════════════════');
    log.info('');
    
    // Listen for messages
    api.listenMqtt(async (err, msg) => {
      if (err) {
        log.error('Listen error', err);
        return;
      }
      
      if (msg.type === 'message') {
        await handleMessage(api, msg);
      }
    });
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log.info('Shutting down...');
  await saveThreads();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception', err);
  process.exit(1);
});

// Start
startBot().catch(err => {
  log.error('Failed to start', err);
  process.exit(1);
});
