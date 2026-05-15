# Hudu MCP Server

Connect Claude AI to your [Hudu](https://www.hudu.com) IT documentation platform. Once installed, Claude can search, read, create, and update your Hudu knowledge base, assets, passwords, companies, and more — directly from any Claude interface.

---

## What This Does

This server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), giving Claude secure, structured access to the Hudu REST API. It runs as a local stdio process that Claude Desktop or Claude Code launches on demand.

### Available Tools

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

- **Node.js 18 or newer** — [nodejs.org](https://nodejs.org)
- **Claude Desktop** or **Claude Code**
- **A Hudu API key** — generate one at **Hudu Admin → Basic Information → API Keys**

---

## Installation

### 1. Clone and build

Clone the repo into the standard install location and build:

```powershell
git clone https://github.com/Allied-Business-Solutions/hudu-mcp.git "$env:LOCALAPPDATA\Programs\HuduMCP"
cd "$env:LOCALAPPDATA\Programs\HuduMCP"
npm install
npm run build
```

This compiles the TypeScript source into `dist/`.

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
      "args": ["C:/Users/YOUR_USERNAME/AppData/Local/Programs/HuduMCP/dist/index.js"],
      "env": {
        "HUDU_API_KEY": "your_api_key_here",
        "HUDU_BASE_URL": "https://your-instance.huducloud.com/api/v1"
      }
    }
  }
}
```

Replace `YOUR_USERNAME` with your Windows username, then fill in your API key and Hudu URL. Restart Claude Desktop.

### 3. Configure Claude Code

Add to `~/.claude/settings.json` (or `.claude/settings.json` in your project):

```json
{
  "mcpServers": {
    "hudu": {
      "command": "node",
      "args": ["C:/Users/YOUR_USERNAME/AppData/Local/Programs/HuduMCP/dist/index.js"],
      "env": {
        "HUDU_API_KEY": "your_api_key_here",
        "HUDU_BASE_URL": "https://your-instance.huducloud.com/api/v1"
      }
    }
  }
}
```

Replace `YOUR_USERNAME` with your Windows username, then fill in your API key and Hudu URL.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HUDU_API_KEY` | Your Hudu API key (from Hudu Admin → Basic Information → API Keys) |
| `HUDU_BASE_URL` | Your Hudu instance API base URL, e.g. `https://your-instance.huducloud.com/api/v1` |

See `.env.example` for a template.

---

## Example Prompts

Once connected, you can ask Claude things like:

> "Search Hudu for any articles about VPN setup and summarize what we have"

> "Find all assets for Acme Corp and list their serial numbers"

> "Create a new article called 'Windows 11 Deployment Guide' under the Acme Corp company with these steps: [paste steps]"

> "Look up the password entry for the Acme firewall admin account"

> "What procedures do we have documented for onboarding new employees?"

> "Show me all SSL certificate expirations coming up in the next 30 days"

---

## Troubleshooting

**Tools don't appear in Claude**
Verify the config file is valid JSON and the path to `dist/index.js` is correct (e.g. `C:/Users/YOUR_USERNAME/AppData/Local/Programs/HuduMCP/dist/index.js`). Restart Claude Desktop after any config change.

**`HUDU_API_KEY is required` error**
The `env` block in your Claude config is missing or the key name is wrong. Check that it's exactly `HUDU_API_KEY`.

**`HUDU_BASE_URL is required` error**
Same — check that `HUDU_BASE_URL` is set and ends with `/api/v1`.

**401 Unauthorized from Hudu**
Your API key is invalid or expired. Generate a new one from Hudu Admin → Basic Information → API Keys.

**Node.js not found**
Install Node.js 18+ from [nodejs.org](https://nodejs.org) and restart your terminal/Claude Desktop.

---

## Development

```bash
npm run build    # compile TypeScript → dist/
npm run dev      # watch mode (recompiles on save)
npm start        # run the compiled server
```

## File Structure

```
hudu-mcp/
├── src/
│   ├── api.ts       ← HTTP client helpers
│   ├── tools.ts     ← MCP tool definitions
│   └── index.ts     ← Server entry point + tool dispatch
├── dist/            ← Compiled output (git-ignored)
├── reference/
│   └── HuduRESTAPI.json  ← Hudu OpenAPI spec
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Contributing

To add a new tool:
1. Add a `Tool` entry to the `TOOLS` array in `src/tools.ts`
2. Add the corresponding `case` to the `callTool` switch in `src/index.ts`
3. Run `npm run build` to verify it compiles

The [Hudu API docs](https://developer.hudu.com) describe all available endpoints.

---

## License

MIT
