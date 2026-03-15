# AntiGTrade for Antigravity IDE

Live OKX trading dashboard — runs as a panel inside Antigravity.

## Install

1. Open Antigravity IDE
2. Press `Ctrl+Shift+P` → "Extensions: Install from VSIX"
3. Select `antigtrade-1.1.0.vsix`
4. The dashboard opens automatically

## Usage

- **Reopen:** `Ctrl+Shift+T` or Command Palette → "Open AntiGTrade Dashboard"
- **Trade via AI:** Use the Antigravity chat with OKX MCP configured

## OKX MCP Setup (for AI trading)

Add to your Antigravity MCP config:

```json
{
  "mcpServers": {
    "okx-trade": {
      "command": "npx",
      "args": ["-y", "okx-trade-mcp", "--demo"],
      "env": {
        "OKX_API_KEY": "your_key",
        "OKX_SECRET_KEY": "your_secret",
        "OKX_PASSPHRASE": "your_passphrase"
      }
    }
  }
}
```

## Requirements

- Node.js 18+
- Antigravity IDE (or any VS Code fork)

## Security notes

- OKX API credentials are stored in `~/.okx/config.toml` (demo/live profile); file is written with 600 permissions.
- Switching from Demo to Live prompts for confirmation; live mode is labeled in the header.
- Orders in live mode above a safe notional threshold require an extra confirmation.
- The chart library is bundled locally (`vendor/lightweight-charts.standalone.production.js`) and loaded with a strict CSP—no external CDN required.

## Testing

- Run validation tests: `npm test`
