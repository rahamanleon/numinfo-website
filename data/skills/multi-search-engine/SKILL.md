# Multi Search Engine

**Version:** 2.1.3  
**Author:** g_pyAng (@gpyangyoujun)  
**License:** MIT-0  
**Source:** https://clawhub.ai/gpyangyoujun/multi-search-engine

## Description

Multi search engine integration with 16 engines (7 CN + 9 Global). Supports advanced search operators, time filters, site search, privacy engines, and WolframAlpha queries.

## Features

- **16 Search Engines**: 7 Chinese + 9 Global engines
- **Advanced Operators**: Supports boolean operators, phrase search, exclusions
- **Time Filters**: Filter results by time period
- **Site Search**: Search within specific domains
- **Privacy Engines**: DuckDuckGo and other privacy-focused options
- **WolframAlpha**: Direct computation queries
- **Automatic Retry**: Handles 403/429 errors with session cookies
- **Rate Limiting**: Built-in delays (1-2s) to avoid IP blocking

## Search Engines Supported

### Global (9)
- Google
- Bing
- DuckDuckGo
- Yahoo
- Yandex
- Brave
- Startpage
- SearX
- Mojeek

### Chinese (7)
- Baidu
- Sogou
- 360 Search
- Bing China

## Usage

### Basic Search
```
/search <query>
```

### With Engine Selection
```
/search <query> --engine=<engine>
```

### With Time Filter
```
/search <query> --time=<day|week|month|year>
```

### Site Search
```
/search <query> --site=example.com
```

### WolframAlpha Query
```
/wolfram <computation query>
```

## Advanced Operators

- `"exact phrase"` - Search for exact phrase
- `+word` - Include word (required)
- `-word` - Exclude word
- `site:domain.com` - Search within domain
- `filetype:pdf` - Search for file type
- `intitle:term` - In page title
- `inurl:term` - In URL

## Technical Details

### Request Behavior
- Sets browser-like headers (User-Agent spoofing)
- In-memory session cookies (not persisted to disk)
- Automatic cookie acquisition when 403/429 received
- Rate limiting: 1-2 second delays between requests

### Security & Privacy
- Cookies remain in-memory only (cleared after session)
- No disk persistence of request data
- Platform may log requests (check your environment)
- Avoid sensitive queries if confidentiality needed

## Warnings

⚠️ **Rate limiting** is recommended to prevent IP blocking  
⚠️ Browser-like headers and cookie acquisition may have ToS implications  
⚠️ Verify logging policies in strict network environments  

## Installation

This is an **instruction-only skill** - no binary files or installation required. The skill uses `web_fetch` tool to perform searches directly.

## Requirements

- `web_fetch` tool capability
- Internet access
- No additional dependencies

## Related

- Originally published on ClawHub
- GitHub: https://github.com/gpyangyoujun/multi-search-engine
