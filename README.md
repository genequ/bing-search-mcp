# Bing Search MCP Server

> Multi-region Bing search server for Claude Desktop and other MCP clients

A Model Context Protocol (MCP) server that enables AI assistants like Claude to search the web using Bing's search engine with support for multiple regions and languages.

## Features

- [**Multi-Region Search**](#supported-regions) - Search in 12+ languages/regions
- [**Web Crawling**](#web-crawling) - Batch fetch full page content from search results
- [**Smart Filtering**](#blacklisted-sites) - Auto-skip sites that block crawlers
- [**No API Key**](#requirements) - Works out of the box, no registration needed
- [**Type-Safe**](#development) - Built with TypeScript

## Supported Regions

| Region | Market Code | Search Domain |
|--------|-------------|---------------|
| China (Simplified) | `zh-CN` | cn.bing.com |
| United States | `en-US` | www.bing.com |
| United Kingdom | `en-GB` | www.bing.com |
| Japan | `ja-JP` | www.bing.com |
| Korea | `ko-KR` | www.bing.com |
| Germany | `de-DE` | www.bing.com |
| France | `fr-FR` | www.bing.com |
| Spain | `es-ES` | www.bing.com |
| Italy | `it-IT` | www.bing.com |
| Brazil (Portuguese) | `pt-BR` | www.bing.com |
| Russia | `ru-RU` | www.bing.com |

## Installation & Configuration

### Prerequisites

- **Node.js** 18+ installed
- **Claude Desktop** app (for Claude Code integration)
- Access to Bing (no VPN needed for most regions)

### Option 1: Install from NPM (Recommended)

Run the installation script:

```bash
curl -sSL https://raw.githubusercontent.com/genequ/bing-search-mcp/main/install.sh | bash
```

Or manually install globally:

```bash
npm install -g bing-search-mcp
```

### Option 2: Install from Source

```bash
git clone https://github.com/genequ/bing-search-mcp.git
cd bing-search-mcp
npm install
npm run build
npm link
```

### Configure Claude Desktop

#### Step 1: Locate Config File

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```
Press `Cmd + Shift + G` in Finder and paste the path.

**Windows:**
```
%AppData%\Claude\claude_desktop_config.json
```
Paste in File Explorer address bar.

#### Step 2: Add Configuration

Add the following to your `claude_desktop_config.json`:

**macOS / Linux:**
```json
{
  "mcpServers": {
    "bing-search": {
      "command": "npx",
      "args": ["-y", "bing-search-mcp"]
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "bing-search": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "bing-search-mcp"]
    }
  }
}
```

**With other MCP servers:**
```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
    "bing-search": {
      "command": "npx",
      "args": ["-y", "bing-search-mcp"]
    }
  }
}
```

#### Step 3: Restart Claude Desktop

Completely quit Claude Desktop (not just minimize) and reopen it.

#### Step 4: Verify Installation

In Claude, try:
- "Search for TypeScript tutorials"
- "帮我搜索人工智能的最新进展"
- "日本語でプログラミングを検索して"

## Available Tools

### `bing_search`

Search the web using Bing's search engine.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | *(required)* | Search keywords |
| `market` | string | `en-US` | Region code (see table above) |
| `count` | number | `10` | Number of results (1-50) |
| `offset` | number | `0` | Pagination offset |

**Response Format:**
```json
{
  "query": "machine learning",
  "count": 10,
  "results": [
    {
      "uuid": "abc123",
      "title": "Introduction to Machine Learning",
      "url": "https://example.com/ml-intro",
      "snippet": "Learn the basics of ML..."
    }
  ],
  "urlMap": {
    "abc123": "https://example.com/ml-intro"
  }
}
```

### `crawl_webpage`

Fetch full content from search results by UUID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuids` | string[] | Yes | Array of result UUIDs |
| `urlMap` | object | Yes | UUID to URL mapping |

**Example:**
```json
{
  "uuids": ["abc123", "def456"],
  "urlMap": {
    "abc123": "https://example.com/page1",
    "def456": "https://example.com/page2"
  }
}
```

**Response Format:**
```json
{
  "results": {
    "abc123": {
      "title": "Page Title",
      "content": "Full page text content..."
    }
  },
  "skipped": ["def456"],
  "errors": {}
}
```

## Usage Examples

### Example 1: Basic Search

**User:** "Search for Python async programming tutorials"

**Claude calls:**
```json
{
  "name": "bing_search",
  "arguments": {
    "query": "Python async programming tutorials",
    "market": "en-US",
    "count": 10
  }
}
```

### Example 2: Multi-Region Search

**User:** "日本語で機械学習について検索してください"

**Claude calls:**
```json
{
  "name": "bing_search",
  "arguments": {
    "query": "機械学習 チュートリアル",
    "market": "ja-JP",
    "count": 10
  }
}
```

### Example 3: Chinese Search

**User:** "帮我搜索 Claude AI 的最新新闻"

**Claude calls:**
```json
{
  "name": "bing_search",
  "arguments": {
    "query": "Claude AI 最新新闻",
    "market": "zh-CN",
    "count": 15
  }
}
```

### Example 4: Batch Crawling

**User:** "Search for TypeScript best practices and fetch the full content of the top 5 results"

**Claude workflow:**
1. Call `bing_search` with `query: "TypeScript best practices"`
2. Extract UUIDs and URLs from search results
3. Call `crawl_webpage` with UUIDs and urlMap

## Blacklisted Sites

These sites are automatically skipped during crawling due to access restrictions:

- Zhihu (zhihu.com)
- Xiaohongshu (xiaohongshu.com)
- Weibo (weibo.com)
- WeChat (weixin.qq.com)
- Douyin/TikTok (douyin.com, tiktok.com)
- Bilibili (bilibili.com)
- CSDN (csdn.net)

## Troubleshooting

### Search returns no results

1. **Check network connectivity** to `cn.bing.com` or `www.bing.com`
2. **Try different keywords** - be more specific
3. **Rate limiting** - Wait a few minutes if searching frequently

### Claude doesn't use search tool

1. Verify JSON syntax in config file
2. Fully restart Claude Desktop
3. Try explicit prompts: "Use Bing search to find..."

### Some sites can't be crawled

This is expected. Blacklisted sites and sites with strong anti-bot protection will be skipped. The search results will still show links to these sites.

### "npx command not found" (Windows)

Install Node.js from https://nodejs.org/ and restart your terminal.

## Development

### Project Structure

```
bing-search-mcp/
├── src/
│   ├── index.ts        # MCP server entry point
│   ├── bingSearch.ts   # Search implementation (axios + Puppeteer)
│   ├── parser.ts       # HTML parsing and result extraction
│   ├── crawler.ts      # Web page content fetching
│   └── types.ts        # TypeScript type definitions
├── build/              # Compiled output
├── package.json
└── tsconfig.json
```

### Build & Test

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally for testing
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector build/index.js
```

## Technical Details

### Search Implementation

- **Chinese market (zh-CN)**: Uses `axios` for faster, lightweight requests
- **Other markets**: Uses `Puppeteer` with headless Chrome to handle JavaScript-rendered content

### Why Puppeteer for Non-Chinese Markets?

1. **JavaScript Rendering**: International Bing versions use client-side rendering
2. **Anti-Bot Detection**: Puppeteer mimics real browser behavior
3. **Content Completeness**: Ensures all search results are loaded

## Limitations

1. **Network Access**: Requires access to Bing servers
2. **Rate Limits**: Don't search too frequently (wait 1-2 seconds between requests)
3. **Privacy**: Searches go directly to Bing; no logs are stored
4. **Accuracy**: Results may vary if anti-bot measures are triggered

For production use with guaranteed stability, consider [tavily-mcp](https://github.com/tavily-ai/tavily-mcp).

## License

MIT

## Contributing

Issues and pull requests are welcome!
