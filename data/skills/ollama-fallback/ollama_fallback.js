/**
 * Ollama Fallback Client - JavaScript
 * Automatically switches to backup API when primary hits limits
 */

class OllamaFallbackClient {
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl || 'https://api.ollama.com').replace(/\/$/, '');
        this.primaryKey = options.primaryKey || process.env.OLLAMA_PRIMARY_KEY;
        this.backupKeys = options.backupKeys || [];
        
        // Add the provided backup key
        const providedBackup = '6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G';
        if (!this.backupKeys.includes(providedBackup)) {
            this.backupKeys.unshift(providedBackup);
        }
        
        this.allKeys = this.primaryKey 
            ? [this.primaryKey, ...this.backupKeys.filter(k => k !== this.primaryKey)]
            : this.backupKeys;
        
        this.currentKeyIndex = 0;
        
        if (!this.allKeys.length || !this.allKeys[0]) {
            throw new Error('No API keys provided! Set OLLAMA_PRIMARY_KEY or pass primaryKey');
        }
        
        console.log(`[OllamaFallback] Initialized with ${this.allKeys.length} key(s)`);
    }
    
    _getCurrentKey() {
        return this.allKeys[this.currentKeyIndex];
    }
    
    async _switchToNextKey() {
        this.currentKeyIndex++;
        if (this.currentKeyIndex >= this.allKeys.length) {
            this.currentKeyIndex = 0;
            throw new Error('All API keys exhausted! Please wait before retry.');
        }
        const key = this._getCurrentKey();
        console.log(`[OllamaFallback] Switched to key ${this.currentKeyIndex + 1}/${this.allKeys.length}: ${key.slice(0, 8)}...${key.slice(-8)}`);
    }
    
    async _fetchWithFallback(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const maxAttempts = this.allKeys.length;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${this._getCurrentKey()}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    return await response.json();
                }
                
                if (response.status === 429) {
                    console.log(`[OllamaFallback] Rate limit hit (key ${this.currentKeyIndex + 1})`);
                    await this._switchToNextKey();
                    continue;
                }
                
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                
            } catch (error) {
                if (attempt === maxAttempts - 1) throw error;
                console.log(`[OllamaFallback] Request failed: ${error.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        throw new Error('All API keys failed');
    }
    
    // === API Methods ===
    
    async generate(model, prompt, options = {}) {
        return this._fetchWithFallback('/api/generate', {
            method: 'POST',
            body: JSON.stringify({ model, prompt, ...options })
        });
    }
    
    async chat(model, messages, options = {}) {
        return this._fetchWithFallback('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ model, messages, ...options })
        });
    }
    
    async listModels() {
        return this._fetchWithFallback('/api/tags', { method: 'GET' });
    }
    
    async pull(name) {
        return this._fetchWithFallback('/api/pull', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }
    
    getCurrentKeyInfo() {
        return `Using key ${this.currentKeyIndex + 1} of ${this.allKeys.length}`;
    }
}

// === Usage ===

// Browser/Node.js usage:
const client = new OllamaFallbackClient({
    primaryKey: process.env.OLLAMA_PRIMARY_KEY,
    backupKeys: ['6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G']
});

// Example: Generate text
async function example() {
    console.log(client.getCurrentKeyInfo());
    
    try {
        const result = await client.generate('llama3.2', 'Hello, how are you?');
        console.log('Response:', result.response);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OllamaFallbackClient };
}

// Run example if executed directly
if (require.main === module) {
    example().catch(console.error);
}