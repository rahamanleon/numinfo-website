#!/data/data/com.termux/files/usr/bin/env node

/**
 * WhatsApp Bridge Watcher for Telegram
 * Watches incoming WhatsApp messages and forwards them to Telegram (picoclaw)
 * Monitors for responses from picoclaw and sends back to WhatsApp
 */

const fs = require('fs');
const path = require('path');

const BRIDGE_INCOMING = '/data/data/com.termux/files/home/.picoclaw/data/channels/whatsapp-baileys/bridge/incoming';
const BRIDGE_OUTGOING = '/data/data/com.termux/files/home/.picoclaw/data/channels/whatsapp-baileys/bridge/outgoing';
const MEMORY_FILE = '/data/data/com.termux/files/home/.picoclaw/data/memory/whatsapp_bridge.json';

// Ensure bridge directories exist
[BRIDGE_INCOMING, BRIDGE_OUTGOING].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Track processed messages
const processed = new Set();
let lastCheck = Date.now();

console.log('[Bridge Watcher] 👁️ Watching for WhatsApp messages...');
console.log(`[Bridge Watcher] 📁 Incoming: ${BRIDGE_INCOMING}`);
console.log(`[Bridge Watcher] 📁 Outgoing: ${BRIDGE_OUTGOING}`);

// Main polling loop
async function pollIncomingMessages() {
    try {
        const files = fs.readdirSync(BRIDGE_INCOMING);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filepath = path.join(BRIDGE_INCOMING, file);
            
            // Skip already processed
            if (processed.has(file)) continue;
            processed.add(file);
            
            try {
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                
                if (!data.processed) {
                    // Forward to Telegram (console output for now - picoclaw will intercept)
                    console.log('\n📨 === WHATSAPP MESSAGE RECEIVED ===');
                    console.log(`From: ${data.senderName} (${data.senderNumber})`);
                    console.log(`Message: "${data.message}"`);
                    console.log(`Time: ${data.timestamp}`);
                    console.log('════════════════════════════════════\n');
                    
                    // Mark as processed
                    data.processed = true;
                    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
                    
                    // Emit to Telegram interface
                    // This will be picked up by the running picoclaw instance
                    const telegramMessage = {
                        from: 'whatsapp',
                        id: data.id,
                        sender: data.senderName,
                        number: data.senderNumber,
                        text: data.message,
                        timestamp: data.timestamp
                    };
                    
                    // Save to memory for picoclaw to read
                    const bridgeMemory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8') || '{}');
                    bridgeMemory.messages = bridgeMemory.messages || [];
                    bridgeMemory.messages.push(telegramMessage);
                    // Keep last 50 messages
                    if (bridgeMemory.messages.length > 50) {
                        bridgeMemory.messages = bridgeMemory.messages.slice(-50);
                    }
                    fs.writeFileSync(MEMORY_FILE, JSON.stringify(bridgeMemory, null, 2));
                    
                    console.log(`[Bridge Watcher] ✅ Message ${data.id} forwarded to memory`);
                }
            } catch (err) {
                console.error(`[Bridge Watcher] ❌ Error processing ${file}:`, err.message);
            }
        }
        
        // Cleanup processed set periodically
        if (processed.size > 1000) {
            processed.clear();
        }
        
    } catch (err) {
        console.error('[Bridge Watcher] ❌ Polling error:', err.message);
    }
}

/**
 * Send response back to WhatsApp
 * Called by picoclaw when it has a reply
 */
function sendResponse(number, text, replyToId) {
    const timestamp = Date.now();
    const response = {
        id: `resp_${timestamp}`,
        senderNumber: number,
        message: text,
        replyTo: replyToId,
        timestamp: new Date().toISOString()
    };
    
    const filename = `resp_${number}_${timestamp}.json`;
    const filepath = path.join(BRIDGE_OUTGOING, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(response, null, 2));
    console.log(`[Bridge Watcher] 📤 Response saved: ${filepath}`);
    
    // Also update memory
    try {
        const bridgeMemory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8') || '{}');
        bridgeMemory.responses = bridgeMemory.responses || [];
        bridgeMemory.responses.push(response);
        if (bridgeMemory.responses.length > 50) {
            bridgeMemory.responses = bridgeMemory.responses.slice(-50);
        }
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(bridgeMemory, null, 2));
    } catch (e) {}
}

// Process command line arguments
if (process.argv.length > 2) {
    const command = process.argv[2];
    
    if (command === 'send' && process.argv.length >= 5) {
        const number = process.argv[3];
        const text = process.argv.slice(4).join(' ');
        sendResponse(number, text, null);
        console.log(`[Bridge Watcher] ✅ Sent response to ${number}`);
        process.exit(0);
    }
}

// Start watching
console.log('[Bridge Watcher] ⏱️ Starting poll loop every 500ms...');
const interval = setInterval(pollIncomingMessages, 500);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Bridge Watcher] 👋 Stopping...');
    clearInterval(interval);
    process.exit(0);
});

// Export for programmatic use
module.exports = { sendResponse, pollIncomingMessages };
