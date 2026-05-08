# Hudu MCP Server

Connect Claude AI to your [Hudu](https://www.hudu.com) IT documentation platform. Once installed, Claude can search, read, create, and update your Hudu knowledge base, assets, passwords, companies, and more — directly from any Claude interface.

---

## What This Does

This server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), giving Claude secure, structured access to the Hudu REST API. It runs as a local stdio process that Claude Desktop or Claude Code launches on demand.

### Available Tools (147 total)

| Category | Tools |
|----------|-------|
| **Articles** | list, get, create, update, delete, archive, unarchive |
| **Assets** | list (global + per-company), get, create, update, delete, archive, unarchive, move layout |
| **Asset Layouts** | list, get, create, update |
| **Asset Passwords** | list, get, create, update, delete, archive, unarchive |
| **Companies** | list, get, create, update, delete, archive, unarchive |
| **Expirations** | list, update, delete |
| **Exports** | list, get, create |
| **S3 Exports** | create |
| **Flag Types** | list, get, create, update, delete |
| **Flags** | list, get, create, update, delete |
| **Folders** | list, get, create, update, delete |
| **Groups** | list, get |
| **IP Addresses** | list, get, create, update, delete |
| **Lists** | list, get, create, update, delete |
| **Magic Dash** | list, upsert, delete (by title or ID), update positions |
| **Matchers** | list, update, delete |
| **Networks** | list, get, create, update, delete |
| **Password Folders** | list, get, create, update, delete |
| **Photos** | list, get, create, update, delete |
| **Public Photos** | list, get, create, update |
| **Procedures** | list, get, create, update, delete, kickoff, duplicate, create from template |
| **Procedure Tasks** | list, get, create, update, delete |
| **Rack Storages** | list, get, create, update, delete |
| **Rack Storage Items** | list, get, create, update, delete |
| **Relations** | list, create, delete |
| **Uploads** | list, get, delete |
| **Users** | list, get |
| **VLANs** | list, get, create, update, delete |
| **VLAN Zones** | list, get, create, update, delete |
| **Websites** | list, get, create, update, delete |
| **Activity Logs** | list, delete |
| **Navigation** | jump to card, jump to company |
| **API Info** | get version |

---

## Prerequisites

- **Windows** (the installer is PowerShell-based; macOS/Linux users see [Manual Setup](#manual-setup))
- **Node.js 18 or newer** — the installer will download it automatically if missing
- **Claude Desktop** — download from [claude.ai](https://claude.ai/download)
- **A Hudu API key** — generate one at **Hudu Admin → Basic Information → API Keys**

---

## Quick Install (Windows)

Run this one-liner in PowerShell to download and install everything:

```powershell
powershell -ExecutionPolicy Bypass -c "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Allied-Business-Solutions/hudu-mcp/main/install.ps1' -OutFile '$env:TEMP\install-hudu-mcp.ps1'; & '$env:TEMP\install-hudu-mcp.ps1'"
```

The installer will:
1. Check for / install Node.js
2. Prompt for your Hudu base URL (e.g. `https://your-company.huducloud.com`)
3. Prompt for your Hudu API key
4. Install the server to `%LOCALAPPDATA%\Programs\HuduMCP`
5. Wire it into Claude Desktop automatically

**Restart Claude Desktop** after the installer finishes.

---

## Manual Setup

### 1. Clone the repo

```bash
git clone https://github.com/Allied-Business-Solutions/hudu-mcp.git
cd hudu-mcp
npm install
```

### 2. Configure Claude Desktop

Open (or create) your Claude Desktop config file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the `hudu` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "hudu": {
      "command": "node",
      "args": ["C:/path/to/hudu-mcp/stdio.js"],
      "env": {
        "HUDU_API_KEY": "your_api_key_here",
        "HUDU_BASE_URL": "https://your-instance.huducloud.com/api/v1"
      }
    }
  }
}
```

Replace the path, API key, and URL with your own values. Restart Claude Desktop.

### 3. Configure Claude Code

Add to `~/.claude/settings.json` (or `.claude/settings.json` in your project):

```json
{
  "mcpServers": {
    "hudu": {
      "command": "node",
      "args": ["/path/to/hudu-mcp/stdio.js"],
      "env": {
        "HUDU_API_KEY": "your_api_key_here",
        "HUDU_BASE_URL": "https://your-instance.huducloud.com/api/v1"
      }
    }
  }
}
```

---

## Uninstall (Windows)

```powershell
powershell -ExecutionPolicy Bypass -c "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/Allied-Business-Solutions/hudu-mcp/main/uninstall.ps1' -OutFile '$env:TEMP\uninstall-hudu-mcp.ps1'; & '$env:TEMP\uninstall-hudu-mcp.ps1'"
```

Or run `uninstall.ps1` from the cloned repo directly.

---

## Example Prompts

Once connected, you can ask Claude things like:

> "Search Hudu for any articles about VPN setup and summarize what we have"

> "Find all assets for Contoso Corp and list their serial numbers"

> "Create a new article called 'Windows 11 Deployment Guide' under the Contoso Corp company with these steps: [paste steps]"

> "Look up the password entry for the Contoso firewall admin account"

> "What procedures do we have documented for onboarding new employees?"

> "Show me all SSL certificate expirations coming up in the next 30 days"

---

## Troubleshooting

**Tools don't appear in Claude**
Verify the config file is valid JSON and the path to `stdio.js` is correct. Restart Claude Desktop after any config change.

**`HUDU_API_KEY is required` error**
The `env` block in your Claude config is missing or the key name is wrong. Check that it's exactly `HUDU_API_KEY`.

**`HUDU_BASE_URL is required` error**
Same — check that `HUDU_BASE_URL` is set and ends with `/api/v1`.

**401 Unauthorized from Hudu**
Your API key is invalid or expired. Generate a new one from Hudu Admin → Basic Information → API Keys.

**Node.js not found**
Install Node.js 18+ from [nodejs.org](https://nodejs.org) and restart your terminal/Claude Desktop.

---

## File Structure

```
hudu-mcp/
├── stdio.js        ← MCP server (all tools defined here)
├── package.json    ← Dependencies
├── install.ps1     ← Windows installer for Claude Desktop
├── uninstall.ps1   ← Windows uninstaller
├── .env.example    ← Template for environment variables
├── .gitignore
└── README.md
```

---

## Contributing

To add new tools, copy an existing `case` block in the `callTool` switch and add a corresponding entry in the `TOOLS` array in `stdio.js`. The [Hudu API docs](https://developer.hudu.com) describe all available endpoints.

---

## License

MIT
