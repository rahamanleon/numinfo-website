#!/usr/bin/env python3
"""
Ollama Client with Rate Limit Handling
- Primary key: (default)
- Backup key: 6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G

Handles HTTP 429 (Too Many Requests) with automatic key switching.
"""

import requests
import time
import json
import sys
import os

class OllamaClient:
    """Ollama API client with fallback to backup key on rate limit."""
    
    def __init__(self):
        self.urls = [
            "https://ms-ollymolly.imak47.co.in",  # Primary
            "https://ms-ollymolly.imak47.co.in"   # Same API, different token
        ]
        self.primary_token = os.environ.get('OLLAMA_PRIMARY_TOKEN', '')
        self.backup_token = "6ba262d810474075ba9aee5a880ca0af.BxlSYMDcBB5dr2U09L22DP1G"
        self.current_key = "primary"
        self.headers = {"Authorization": f"Bearer {self.primary_token}"}
        self.retry_count = 0
        self.max_retries = 3
        self.retry_delay = 1
        
    def switch_to_backup(self):
        """Switch to backup key."""
        if self.current_key == "primary":
            print("🔄 Switching to backup key...", file=sys.stderr)
            self.headers = {"Authorization": f"Bearer {self.backup_token}"}
            self.current_key = "backup"
            return True
        return False
    
    def switch_to_primary(self):
        """Switch back to primary key."""
        if self.current_key == "backup":
            print("🔄 Switching back to primary key...", file=sys.stderr)
            self.headers = {"Authorization": f"Bearer {self.primary_token}"}
            self.current_key = "primary"
            return True
        return False
    
    def request(self, prompt, model="llama3.2", stream=False):
        """
        Make request with automatic retry on rate limit.
        
        Flow:
        HTTP 429 → Switch key → Retry
        HTTP 2xx → Return result
        HTTP 4xx/5xx → Error (if both failed)
        """
        url = f"{self.urls[0]}/api/generate"
        
        data = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        
        for attempt in range(self.max_retries + 1):
            try:
                response = requests.post(
                    url,
                    headers=self.headers,
                    json=data,
                    timeout=60
                )
                
                # Success
                if response.status_code == 200:
                    if stream:
                        return response
                    result = response.json()
                    print(f"✅ Success with {self.current_key} key")
                    return result
                
                # Rate limited - switch to backup
                if response.status_code == 429:
                    print(f"⚠️  Rate limit hit (HTTP 429) on {self.current_key}")
                    
                    if self.switch_to_backup():
                        self.retry_count += 1
                        print(f"⏳ Retrying ({self.retry_count}/{self.max_retries})...")
                        time.sleep(self.retry_delay * self.retry_count)  # Exponential backoff
                        continue
                    else:
                        print("❌ Backup key also hit rate limit")
                        raise Exception("Rate limit exceeded on both keys")
                
                # Other error
                response.raise_for_status()
                
            except requests.exceptions.RequestException as e:
                print(f"❌ Request failed: {e}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise
        
        raise Exception(f"Failed after {self.max_retries} retries")
    
    def chat(self, messages, model="llama3.2"):
        """Chat completion API."""
        url = f"{self.urls[0]}/api/chat"
        
        data = {
            "model": model,
            "messages": messages,
            "stream": False
        }
        
        for attempt in range(self.max_retries + 1):
            try:
                response = requests.post(url, headers=self.headers, json=data, timeout=60)
                
                if response.status_code == 200:
                    return response.json()
                
                if response.status_code == 429:
                    print(f"⚠️  Rate limit (429) on {self.current_key}")
                    if self.switch_to_backup():
                        time.sleep(self.retry_delay * (attempt + 1))
                        continue
                    raise Exception("Both keys rate limited")
                
                response.raise_for_status()
                
            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                raise
        
        raise Exception("Max retries exceeded")


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python ollama_client.py 'Your prompt here'")
        sys.exit(1)
    
    prompt = " ".join(sys.argv[1:])
    client = OllamaClient()
    
    try:
        print(f"🤖 Querying Ollama with prompt: {prompt[:50]}...")
        result = client.request(prompt)
        print("\n" + "="*50)
        print("RESPONSE:")
        print("="*50)
        print(result.get('response', 'No response'))
        print("="*50)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
