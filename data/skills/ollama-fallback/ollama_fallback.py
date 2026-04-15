#!/usr/bin/env python3
"""
Ollama API with Automatic Fallback
Switches to backup API key when primary hits rate limits
"""

import os
import requests
import time
from typing import Optional, Dict, Any, List

class OllamaFallbackClient:
    def __init__(self, 
                 primary_key: str = None,
                 backup_keys: List[str] = None,
                 base_url: str = "https://api.ollama.com"):
        """
        Initialize with primary and backup API keys
        
        Args:
            primary_key: Your main Ollama API key
            backup_keys: List of backup keys to use when primary fails
            base_url: Ollama API base URL
        """
        self.base_url = base_url.rstrip('/')
        self.primary_key = primary_key or os.getenv('OLLAMA_PRIMARY_KEY')
        self.backup_keys = backup_keys or []
        
        # Add the provided backup key
        provided_backup = "6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G"
        if provided_backup not in self.backup_keys:
            self.backup_keys.insert(0, provided_backup)
        
        self.current_key_index = 0
        self.all_keys = [self.primary_key] + self.backup_keys if self.primary_key else self.backup_keys
        
        if not self.all_keys or not self.all_keys[0]:
            raise ValueError("No API keys provided! Set OLLAMA_PRIMARY_KEY or pass primary_key")
        
        print(f"[OllamaFallback] Initialized with {len(self.all_keys)} key(s)")
        
    def _get_current_key(self) -> str:
        """Get the currently active API key"""
        return self.all_keys[self.current_key_index]
    
    def _switch_to_next_key(self):
        """Switch to next available key"""
        self.current_key_index += 1
        if self.current_key_index >= len(self.all_keys):
            self.current_key_index = 0  # Reset to try again from beginning
            raise RuntimeError("All API keys exhausted! Waiting before retry...")
        
        key_preview = self._get_current_key()[:8] + "..." + self._get_current_key()[-8:]
        print(f"[OllamaFallback] Switched to key {self.current_key_index + 1}/{len(self.all_keys)}: {key_preview}")
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make request with automatic fallback on rate limit"""
        url = f"{self.base_url}{endpoint}"
        max_attempts = len(self.all_keys)
        
        for attempt in range(max_attempts):
            try:
                headers = kwargs.pop('headers', {})
                headers['Authorization'] = f"Bearer {self._get_current_key()}"
                
                response = requests.request(method, url, headers=headers, **kwargs)
                
                # Success
                if response.status_code == 200:
                    return response.json() if response.content else {}
                
                # Rate limit hit - switch key
                if response.status_code == 429:
                    print(f"[OllamaFallback] Rate limit hit (key {self.current_key_index + 1})")
                    try:
                        self._switch_to_next_key()
                        continue  # Retry with new key
                    except RuntimeError as e:
                        # All keys exhausted
                        time.sleep(5)  # Wait before final retry
                        continue
                
                # Other errors
                response.raise_for_status()
                
            except requests.exceptions.RequestException as e:
                if attempt == max_attempts - 1:
                    raise
                print(f"[OllamaFallback] Request failed: {e}")
                time.sleep(1)
                continue
        
        raise RuntimeError("All API keys failed")
    
    # === Convenience Methods ===
    
    def generate(self, model: str, prompt: str, **options) -> Dict:
        """Generate text with model"""
        data = {
            "model": model,
            "prompt": prompt,
            **options
        }
        return self._make_request("POST", "/api/generate", json=data)
    
    def chat(self, model: str, messages: List[Dict], **options) -> Dict:
        """Chat completion API"""
        data = {
            "model": model,
            "messages": messages,
            **options
        }
        return self._make_request("POST", "/api/chat", json=data)
    
    def list_models(self) -> Dict:
        """List available models"""
        return self._make_request("GET", "/api/tags")
    
    def pull(self, name: str) -> Dict:
        """Pull a model"""
        return self._make_request("POST", "/api/pull", json={"name": name})
    
    def get_current_key_info(self) -> str:
        """Get info about current active key"""
        return f"Using key {self.current_key_index + 1} of {len(self.all_keys)}"


# === Usage Example ===
if __name__ == "__main__":
    import sys
    
    # Initialize client
    # Priority: 1) Environment variable, 2) Constructor argument
    client = OllamaFallbackClient(
        primary_key=os.getenv('OLLAMA_PRIMARY_KEY'),
        backup_keys=["6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G"]
    )
    
    print(f"Status: {client.get_current_key_info()}")
    
    # Example: List models
    try:
        models = client.list_models()
        print(f"Available models: {len(models.get('models', []))}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example: Generate
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
        print(f"\nPrompt: {prompt}")
        try:
            result = client.generate("llama3.2", prompt)
            print(f"Response: {result.get('response', 'No response')}")
        except Exception as e:
            print(f"Error: {e}")