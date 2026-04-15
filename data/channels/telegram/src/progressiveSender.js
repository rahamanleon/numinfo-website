/**
 * Progressive Message Sender - Telegram
 * Simulates streaming by editing messages progressively
 * 
 * Flow: Bot → "Thinking..." → edits → "Hello" → edits → "Hello, this is AI"
 */

class ProgressiveSender {
  constructor(bot) {
    this.bot = bot;
    this.editTimestamps = new Map(); // Rate limit tracking
  }

  /**
   * Send a message with progressive editing steps
   * @param {number} chatId - Telegram chat ID
   * @param {string} finalText - Final message content
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - Final message object
   */
  async sendProgressive(chatId, finalText, options = {}) {
    const {
      steps = [
        '🤔 Thinking...',
        '🤔 Thinking... analyzing',
        '👋 Hello',
        '👋 Hello, this is AI',
        finalText
      ],
      editDelay = 400,
      parseMode = 'Markdown'
    } = options;

    // Step 1: Send initial placeholder
    const msg = await this.bot.sendMessage(chatId, steps[0], {
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    // Progressively edit the message
    for (let i = 1; i < steps.length; i++) {
      await this._delay(editDelay);
      
      try {
        await this._safeEdit(chatId, msg.message_id, steps[i], parseMode);
      } catch (err) {
        console.error(`[ProgressiveSender] Edit failed: ${err.message}`);
        
        // Fallback: delete and resend on final step
        if (i === steps.length - 1) {
          await this.bot.deleteMessage(chatId, msg.message_id);
          const newMsg = await this.bot.sendMessage(chatId, finalText, {
            parse_mode: parseMode,
            disable_web_page_preview: true
          });
          return newMsg;
        }
      }
    }

    return msg;
  }

  /**
   * Stream text word-by-word with cursor effect
   * @param {number} chatId - Telegram chat ID
   * @param {string} fullText - Complete text to stream
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - Final message object
   */
  async streamText(chatId, fullText, options = {}) {
    const {
      wordDelay = 80,
      parseMode = 'Markdown',
      cursor = '▍'
    } = options;

    const words = fullText.split(' ');
    
    // Start with just cursor
    let msg = await this.bot.sendMessage(chatId, cursor, {
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + ' ';
      
      // Add cursor if not the last word
      const displayText = i < words.length - 1 
        ? currentText + cursor 
        : currentText.trim();

      try {
        await this._safeEdit(chatId, msg.message_id, displayText, parseMode);
        await this._delay(wordDelay);
      } catch (err) {
        // Ignore "message not modified" errors (same content)
        if (!err.message.includes('message is not modified')) {
          console.error(`[ProgressiveSender] Stream error: ${err.message}`);
        }
      }
    }

    return msg;
  }

  /**
   * Thinking animation with dots
   * @param {number} chatId - Telegram chat ID
   * @param {string} finalText - Final message after thinking
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - Final message object
   */
  async withThinking(chatId, finalText, options = {}) {
    const {
      thinkSteps = 5,
      thinkDelay = 500,
      parseMode = 'Markdown'
    } = options;

    // Start with thinking
    const msg = await this.bot.sendMessage(chatId, '🤔', {
      parse_mode: parseMode
    });

    // Animate dots
    for (let i = 0; i < thinkSteps; i++) {
      await this._delay(thinkDelay);
      const dots = '.'.repeat((i % 3) + 1);
      
      try {
        await this._safeEdit(chatId, msg.message_id, `🤔 Thinking${dots}`, parseMode);
      } catch (err) {
        // Ignore errors during animation
      }
    }

    // Final result
    await this._delay(300);
    try {
      await this._safeEdit(chatId, msg.message_id, finalText, parseMode);
    } catch (err) {
      await this.bot.deleteMessage(chatId, msg.message_id);
      msg = await this.bot.sendMessage(chatId, finalText, { parse_mode: parseMode });
    }

    return msg;
  }

  /**
   * Safe edit with rate limit protection (1 edit/sec)
   * @private
   */
  async _safeEdit(chatId, messageId, text, parseMode) {
    const key = `${chatId}_${messageId}`;
    const lastEdit = this.editTimestamps.get(key) || 0;
    const now = Date.now();
    const waitTime = Math.max(0, 1000 - (now - lastEdit));

    if (waitTime > 0) {
      await this._delay(waitTime);
    }

    await this.bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    this.editTimestamps.set(key, Date.now());
  }

  /**
   * Simple delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProgressiveSender;
