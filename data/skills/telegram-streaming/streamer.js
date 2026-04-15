/**
 * Telegram Streaming Response Utility
 * Splits long messages into chunks and sends progressively
 */

const MAX_CHUNK_SIZE = 4096; // Telegram limit
const DEFAULT_CHUNK_SIZE = 1000; // Comfortable reading size
const DEFAULT_DELAY_MS = 100;

/**
 * Split text into chunks at natural boundaries
 */
function splitIntoChunks(text, maxSize = DEFAULT_CHUNK_SIZE) {
  const chunks = [];
  const splitMarkers = ['\n\n', '\n', '. ', ' '];
  
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }
    
    // Find best split point
    let splitAt = maxSize;
    let found = false;
    
    // Search backwards for natural break
    for (const marker of splitMarkers) {
      const pos = remaining.lastIndexOf(marker, maxSize);
      if (pos > maxSize * 0.5) { // At least 50% of max size
        splitAt = pos + marker.length;
        found = true;
        break;
      }
    }
    
    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }
  
  return chunks;
}

/**
 * Send streaming response with chunks
 */
async function sendStreamingResponse(options) {
  const {
    chat_id,
    content,
    reply_to_message_id,
    chunk_size = DEFAULT_CHUNK_SIZE,
    delay_ms = DEFAULT_DELAY_MS,
    channel = 'telegram'
  } = options;

  if (!content || content.length === 0) {
    return { sent: 0, message_ids: [] };
  }

  // If content is short enough, send as single message
  if (content.length <= DEFAULT_CHUNK_SIZE) {
    const result = await sendChunk({
      channel,
      chat_id,
      content,
      reply_to_message_id
    });
    return { sent: 1, message_ids: [result.message_id] };
  }

  // Split into chunks
  const chunks = splitIntoChunks(content, chunk_size);
  const message_ids = [];
  let firstMessageId = null;

  // Send first chunk immediately
  const firstResult = await sendChunk({
    channel,
    chat_id,
    content: chunks[0],
    reply_to_message_id
  });
  
  firstMessageId = firstResult.message_id;
  message_ids.push(firstMessageId);

  // Send remaining chunks with delay, replying to first message
  for (let i = 1; i < chunks.length; i++) {
    await delay(delay_ms);
    
    const result = await sendChunk({
      channel,
      chat_id,
      content: chunks[i],
      reply_to_message_id: firstMessageId // Thread all to first message
    });
    
    message_ids.push(result.message_id);
  }

  return { 
    sent: chunks.length, 
    message_ids,
    first_message_id: firstMessageId
  };
}

/**
 * Send a single chunk via message tool
 */
async function sendChunk({ channel, chat_id, content, reply_to_message_id }) {
  // This will be called by the platform's message sending system
  return {
    message_id: Date.now().toString(), // Placeholder
    chat_id,
    content
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  splitIntoChunks,
  sendStreamingResponse,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE
};
