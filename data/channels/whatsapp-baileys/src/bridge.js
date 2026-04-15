/**
 * AI Bridge for WhatsApp ↔ Telegram Integration
 * Messages flow: WhatsApp → file → Telegram → picoclaw → Telegram → file → WhatsApp
 */

const fs = require('fs');
const path = require('path');

const BRIDGE_DIR = path.join(__dirname, '..', 'bridge');
const INCOMING_DIR = path.join(BRIDGE_DIR, 'incoming');
const OUTGOING_DIR = path.join(BRIDGE_DIR, 'outgoing');
const PROCESSED_DIR = path.join(BRIDGE_DIR, 'processed');

// Ensure directories exist
[INCOMING_DIR, OUTGOING_DIR, PROCESSED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

/**
 * Save incoming WhatsApp message for picoclaw to process
 */
function saveIncomingMessage(messageData) {
    const timestamp = Date.now();
    const filename = `msg_${messageData.senderNumber}_${timestamp}.json`;
    const filepath = path.join(INCOMING_DIR, filename);
    
    const data = {
        id: `${timestamp}_${messageData.senderNumber}`,
        source: 'whatsapp',
        senderNumber: messageData.senderNumber,
        senderName: messageData.pushName,
        message: messageData.text,
        timestamp: new Date().toISOString(),
        processed: false
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`[Bridge] 📤 Message saved for AI: ${filepath}`);
    return data.id;
}

/**
 * Check for AI responses to send back to WhatsApp
 */
function checkForResponses(callback) {
    const files = fs.readdirSync(OUTGOING_DIR);
    
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filepath = path.join(OUTGOING_DIR, file);
            try {
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                
                // Move to processed
                const processedPath = path.join(PROCESSED_DIR, file);
                fs.renameSync(filepath, processedPath);
                
                // Call callback with response
                callback(data);
            } catch (err) {
                console.error('[Bridge] ❌ Error processing response:', err.message);
            }
        }
    });
}

/**
 * Clean up old processed files (keep last 100)
 */
function cleanupOldFiles() {
    const files = fs.readdirSync(PROCESSED_DIR)
        .map(f => ({ name: f, time: fs.statSync(path.join(PROCESSED_DIR, f)).mtime }))
        .sort((a, b) => b.time - a.time);
    
    if (files.length > 100) {
        files.slice(100).forEach(f => {
            fs.unlinkSync(path.join(PROCESSED_DIR, f.name));
        });
    }
}

module.exports = {
    saveIncomingMessage,
    checkForResponses,
    cleanupOldFiles,
    INCOMING_DIR,
    OUTGOING_DIR
};
