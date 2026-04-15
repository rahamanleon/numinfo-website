/**
 * Send WhatsApp message via Baileys socket
 * Usage: node send-message.js <number> <message>
 */

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Get arguments
const targetNumber = process.argv[2];
const messageText = process.argv[3];

if (!targetNumber || !messageText) {
    console.log('Usage: node send-message.js <number> <message>');
    console.log('Example: node send-message.js "8801723153138" "hi number"');
    process.exit(1);
}

const SESSION_DIR = path.join(__dirname, 'sessions');
const CREDS_FILE = path.join(SESSION_DIR, 'creds.json');

// Check if authenticated
if (!fs.existsSync(CREDS_FILE)) {
    console.error('❌ Not authenticated! Please start the bot first with: npm start');
    process.exit(1);
}

const logger = pino({ level: 'silent' });

async function sendMessage() {
    try {
        console.log(`📤 Sending message to ${targetNumber}...`);
        
        const { state } = await useMultiFileAuthState(SESSION_DIR);
        
        const sock = makeWASocket({
            logger,
            auth: state,
            browser: ['picoclaw', 'Chrome', '1.0.0'],
            connectTimeoutMs: 30000,
        });

        // Wait for connection
        await new Promise((resolve, reject) => {
            let resolved = false;
            
            sock.ev.on('connection.update', (update) => {
                const { connection, qr } = update;
                
                if (qr && !resolved) {
                    resolved = true;
                    reject(new Error('QR code shown - session expired, please restart the bot'));
                }
                
                if (connection === 'open' && !resolved) {
                    resolved = true;
                    resolve();
                }
                
                if (connection === 'close' && !resolved) {
                    resolved = true;
                    reject(new Error('Connection closed'));
                }
            });
            
            // Timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Connection timeout'));
                }
            }, 30000);
        });

        // Format number to JID
        const jid = `${targetNumber.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        
        // Send message
        await sock.sendMessage(jid, { text: messageText });
        console.log(`✅ Message sent to ${targetNumber}: "${messageText}"`);
        
        // Cleanup
        await sock.end();
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

sendMessage();
