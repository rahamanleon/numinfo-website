/**
 * Direct Send via Bridge File
 * Works even when main bot is running - writes to bridge/outgoing
 */

const fs = require('fs');
const path = require('path');

const targetNumber = process.argv[2] || '8801723153138';
const messageText = process.argv[3] || 'Hi there!';

const OUTGOING_DIR = path.join(__dirname, 'bridge', 'outgoing');

if (!fs.existsSync(OUTGOING_DIR)) {
    fs.mkdirSync(OUTGOING_DIR, { recursive: true });
}

const timestamp = Date.now();
const filename = `out_${timestamp}_${targetNumber}.json`;
const filepath = path.join(OUTGOING_DIR, filename);

const data = {
    id: `out_${timestamp}`,
    source: 'telegram',
    senderNumber: targetNumber.replace(/[^0-9]/g, ''),
    message: messageText,
    timestamp: new Date().toISOString(),
    processed: false
};

fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
console.log(`✅ Message queued for ${targetNumber}:`);
console.log(`   Message: "${messageText}"`);
console.log(`   File: ${filepath}`);
console.log('');
console.log('Note: The WhatsApp bot will pick this up within 1 second if running.');
console.log('If bot is not running, start it with: npm start');
