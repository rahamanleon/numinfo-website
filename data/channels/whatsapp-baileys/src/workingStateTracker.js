// Working State Tracker for WhatsApp Baileys
// Based on it-working-state-tracker skill
// Shows live processing status without exposing internal reasoning

class WorkingStateTracker {
  constructor(bot, chatJid) {
    this.bot = bot;
    this.chatJid = chatJid;
    this.messageId = null;
    this.currentState = null;
    this.lastUpdate = 0;
  }

  async init() {
    const result = await this.bot.sendMessage(
      this.chatJid,
      { text: '🟡 it working: initializing...' }
    );
    this.messageId = result.key.id;
    this.lastUpdate = Date.now();
    return this;
  }

  async update(emoji, action, detail = '') {
    const text = detail
      ? `${emoji} it working: ${action}\n└─ ${detail}`
      : `${emoji} it working: ${action}`;
    
    if (text === this.currentState) return;
    this.currentState = text;

    // WhatsApp: Send new message every 1.5s minimum (can't edit)
    const now = Date.now();
    if (now - this.lastUpdate < 1500) return;
    this.lastUpdate = now;

    try {
      const result = await this.bot.sendMessage(
        this.chatJid,
        { text: text }
      );
      this.messageId = result.key.id;
    } catch (e) {
      // Ignore errors
    }
  }

  async complete(result = '') {
    const text = result
      ? `✅ it working: completed\n└─ ${result}`
      : '✅ it working: completed';
    
    await this.bot.sendMessage(
      this.chatJid,
      { text: text }
    );
  }

  async fail(reason = '') {
    const text = reason
      ? `❌ it working: failed\n└─ ${reason}`
      : '❌ it working: failed';
    
    await this.bot.sendMessage(
      this.chatJid,
      { text: text }
    );
  }

  // Convenience methods
  async receiving()     { return this.update('🟡', 'receiving input'); }
  async understanding(){ return this.update('🧠', 'understanding request'); }
  async loading()      { return this.update('📦', 'loading context'); }
  async compressing()  { return this.update('🧹', 'compressing memory'); }
  async splitting()    { return this.update('🧩', 'splitting task'); }
  async preparing()    { return this.update('⚙️', 'preparing execution'); }
  async processing()   { return this.update('🔍', 'processing data'); }
  async generating()   { return this.update('✍️', 'generating response'); }
  async validating()   { return this.update('🧪', 'validating output'); }
  async formatting()   { return this.update('🧾', 'formatting result'); }
  
  async executing(tool) { return this.update('🔧', `executing: ${tool}`); }
  async waiting()       { return this.update('⏳', 'waiting for result'); }
  async retrying(attempt, max) { 
    return this.update('⚠️', `retrying (${attempt}/${max})`); 
  }
}

module.exports = WorkingStateTracker;
