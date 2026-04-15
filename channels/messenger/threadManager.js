/**
 * Thread Management Module
 * Handles group/thread specific bot behaviors
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const CFG = {
  THREADS_FILE: path.join(__dirname, 'threads.json'),
  THREAD_BLACKLIST_FILE: path.join(__dirname, 'thread_blacklist.json')
};

// Thread states
const threadStates = new Map();
let threadBlacklist = new Set();

class ThreadManager {
  constructor(api) {
    this.api = api;
    this.threads = new Map();
  }

  async init() {
    await this.loadData();
  }

  async loadData() {
    try {
      if (await fs.pathExists(CFG.THREADS_FILE)) {
        const data = await fs.readJson(CFG.THREADS_FILE);
        this.threads = new Map(Object.entries(data));
      }
      
      if (await fs.pathExists(CFG.THREAD_BLACKLIST_FILE)) {
        const data = await fs.readJson(CFG.THREAD_BLACKLIST_FILE);
        threadBlacklist = new Set(data.threads || []);
      }
    } catch (err) {
      console.error(chalk.red('Failed to load thread data'), err);
    }
  }

  async saveData() {
    try {
      const obj = Object.fromEntries(this.threads);
      await fs.writeJson(CFG.THREADS_FILE, obj, { spaces: 2 });
    } catch (err) {
      console.error(chalk.red('Failed to save thread data'), err);
    }
  }

  // Check if thread is active for bot responses
  isActive(threadID) {
    const t = this.threads.get(threadID);
    return t && t.enabled;
  }

  // Get thread info
  getThread(threadID) {
    return this.threads.get(threadID);
  }

  // Enable thread
  async enable(threadID, name = null) {
    this.threads.set(threadID, {
      enabled: true,
      name: name || `Thread_${threadID.slice(-8)}`,
      created: Date.now(),
      messageCount: 0,
      lastActivity: Date.now(),
      settings: {
        prefix: '[Thread]',
        autoReact: true,
        welcomeMessage: false
      }
    });
    await this.saveData();
    return true;
  }

  // Disable thread
  async disable(threadID) {
    this.threads.delete(threadID);
    await this.saveData();
    return true;
  }

  // Update thread stats
  async updateStats(threadID, msgCount = 1) {
    const t = this.threads.get(threadID);
    if (t) {
      t.messageCount += msgCount;
      t.lastActivity = Date.now();
      await this.saveData();
    }
  }

  // Update thread settings
  async updateSettings(threadID, settings) {
    const t = this.threads.get(threadID);
    if (t) {
      t.settings = { ...t.settings, ...settings };
      await this.saveData();
    }
    return t;
  }

  // Get all active threads
  getAllActive() {
    return Array.from(this.threads.entries())
      .filter(([_, t]) => t.enabled)
      .map(([id, t]) => ({ id, ...t }));
  }

  // Check if blacklisted
  isBlacklisted(threadID) {
    return threadBlacklist.has(threadID);
  }

  // Add to blacklist
  async blacklist(threadID) {
    threadBlacklist.add(threadID);
    this.threads.delete(threadID);
    await fs.writeJson(CFG.THREAD_BLACKLIST_FILE, 
      { threads: Array.from(threadBlacklist) }, 
      { spaces: 2 }
    );
    await this.saveData();
  }

  // Get thread name (fetch from API if needed)
  async getThreadName(threadID) {
    const cached = this.threads.get(threadID);
    if (cached && cached.name) return cached.name;
    
    // Try to get from API
    return new Promise((resolve) => {
      this.api.getThreadInfo(threadID, (err, info) => {
        if (!err && info) {
          resolve(info.threadName || info.threadID || `Thread_${threadID.slice(-8)}`);
        } else {
          resolve(`Thread_${threadID.slice(-8)}`);
        }
      });
    });
  }

  // Get thread info summary
  async getInfo(threadID) {
    const info = await new Promise((resolve) => {
      this.api.getThreadInfo(threadID, (err, data) => {
        resolve(err ? null : data);
      });
    });
    return info;
  }

  // Format thread list for display
  formatList() {
    const threads = this.getAllActive();
    if (threads.length === 0) return 'No active threads';
    
    return threads.map((t, i) => {
      const lastActivity = new Date(t.lastActivity).toLocaleString();
      return `${i + 1}. ${t.name}\n   ID: ${t.id}\n   Messages: ${t.messageCount} | Last active: ${lastActivity}`;
    }).join('\n\n');
  }
}

module.exports = ThreadManager;
