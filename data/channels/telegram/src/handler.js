/**
 * Telegram Bot Handler with Progressive Message Support
 * 
 * Features:
 * - Progressive message editing (Thinking... → Hello → Hello, this is AI)
 * - Word-by-word streaming
 * - Thinking animation
 * - Rate limit protection
 */

const TelegramBot = require('node-telegram-bot-api');
const ProgressiveSender = require('./progressiveSender');

// Configuration
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '8510092274';

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set!');
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

const sender = new ProgressiveSender(bot);

console.log('🤖 Telegram Bot initializing...');

// ============== COMMAND HANDLERS ==============

// /start - Welcome with progressive animation
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  await sender.sendProgressive(chatId, 
    `👋 *Hello, ${msg.from.first_name || 'there'}!*\n\n` +
    `I'm your AI assistant with progressive responses.\n\n` +
    `*Available commands:*\n` +
    `/test - Demo progressive editing\n` +
    `/stream - Demo word-by-word streaming\n` +
    `/think - Demo thinking animation\n` +
    `/help - Show help`, {
      parseMode: 'Markdown',
      editDelay: 350
    }
  );
});

// /test - Classic progressive editing demo
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  
  await sender.sendProgressive(chatId,
    '✅ *Test complete!*\n\nThis is the final text after progressive edits.',
    {
      steps: [
        '🤔 Thinking...',
        '🤔 Thinking... analyzing...',
        '📝 Processing...',
        '👋 Hello',
        '👋 Hello, this is AI',
        '👋 Hello, this is AI responding...',
        '✅ *Test complete!*\n\nThis is the final text after progressive edits.'
      ],
      editDelay: 400
    }
  );
});

// /stream - Word-by-word streaming demo
bot.onText(/\/stream/, async (msg) => {
  const chatId = msg.chat.id;
  
  const streamText = 'Hello! This is a streaming text demonstration that appears word by word, simulating a live typing experience!';
  
  await sender.streamText(chatId, streamText, {
    wordDelay: 70,
    parseMode: 'Markdown'
  });
});

// /think - Thinking animation demo
bot.onText(/\/think/, async (msg) => {
  const chatId = msg.chat.id;
  
  await sender.withThinking(chatId,
    '💡 *Analysis complete!*\n\nThe thinking animation has finished and here is the result.',
    {
      thinkSteps: 6,
      thinkDelay: 400
    }
  );
});

// /help - Show available commands
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId,
    `📋 *Telegram Bot Commands*\n\n` +
    `/start - Welcome message\n` +
    `/test - Progressive editing demo\n` +
    `/stream - Word-by-word streaming\n` +
    `/think - Thinking animation demo\n` +
    `/status - Bot status\n` +
    `/help - Show this message\n\n` +
    `Or just send me any message!`,
    { parse_mode: 'Markdown' }
  );
});

// /status - Bot status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const uptime = process.uptime();
  const uptimeStr = formatUptime(uptime);
  
  await bot.sendMessage(chatId,
    `📊 *Bot Status*\n\n` +
    `✅ Online\n` +
    `⏱ Uptime: ${uptimeStr}\n` +
    `📱 Chat ID: ${chatId}`,
    { parse_mode: 'Markdown' }
  );
});

// ============== MESSAGE HANDLERS ==============

// Generic message handler with streaming response
bot.on('message', async (msg) => {
  // Skip commands
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userText = msg.text || '[non-text message]';
  
  console.log(`[${chatId}] ${msg.from.username || msg.from.first_name}: ${userText}`);
  
  // Simulate AI processing with thinking & streaming
  await sender.withThinking(chatId, 
    `💬 *Response:*\n\nReceived your message: "${userText}"\n\n` +
    `This response was generated with the thinking animation, ` +
    `then displayed as the final result.`,
    { thinkSteps: 4, thinkDelay: 500 }
  );
});

// ============== ERROR HANDLING ==============

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

bot.on('error', (err) => {
  console.error('Bot error:', err.message);
});

// ============== UTILITIES ==============

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// ============== STARTUP ==============

console.log('✅ Telegram Bot started!');
console.log(`📱 Admin Chat ID: ${ADMIN_CHAT_ID}`);
console.log('');
console.log('Commands: /start | /test | /stream | /think | /status | /help');

// Notify admin on startup
if (ADMIN_CHAT_ID) {
  bot.sendMessage(ADMIN_CHAT_ID,
    '🤖 *Bot Started*\n\n' +
    `⏰ ${new Date().toLocaleString()}`,
    { parse_mode: 'Markdown' }
  ).catch(() => {}); // Ignore errors
}

module.exports = { bot, sender };
