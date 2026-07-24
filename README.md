# obambu-cpanel-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that lets an AI assistant (Claude, etc.) manage a cPanel hosting account through the [cPanel UAPI](https://api.docs.cpanel.net/openapi/cpanel/overview/).

It exposes tools for domains, DNS zones, email accounts, MySQL databases, and file listing, plus a generic escape hatch to call any other UAPI module/function.

## Requirements

- Node.js 18+
- A cPanel account with API token access (Security → Manage API Tokens in cPanel)

## Setup

```bash
git clone https://github.com/<your-username>/obambu-cpanel-mcp.git
cd obambu-cpanel-mcp
npm install
cp .env.example .env
```

Edit `.env` with your cPanel details:

```
CPANEL_HOST=your-server-hostname-or-ip
CPANEL_PORT=2083
CPANEL_USERNAME=your-cpanel-username
CPANEL_API_TOKEN=paste-your-api-token-here
```

Build and run:

```bash
npm run build
npm start
```

For local development without building first:

```bash
npm run dev
```

## Using it with an MCP client

Add it to your MCP client config (e.g. Claude Desktop / Claude Code), pointing at the built entrypoint:

```json
{
  "mcpServers": {
    "obambu-cpanel": {
      "command": "node",
      "args": ["/absolute/path/to/obambu-cpanel-mcp/dist/index.js"],
      "env": {
        "CPANEL_HOST": "your-server-hostname-or-ip",
        "CPANEL_PORT": "2083",
        "CPANEL_USERNAME": "your-cpanel-username",
        "CPANEL_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available tools

| Tool | Description |
|---|---|
| `get_account_summary` | Disk/bandwidth quota usage and general stats |
| `list_domains` | Domains, subdomains, addon domains and parked domains |
| `list_dns_records` | Read a domain's DNS zone |
| `add_dns_record` | Add a DNS record |
| `edit_dns_record` | Edit an existing DNS record |
| `remove_dns_record` | Remove a DNS record |
| `list_emails` | List email accounts |
| `create_email` | Create an email account |
| `delete_email` | Delete an email account |
| `list_files` | List files/directories under the account home directory |
| `list_databases` | List MySQL databases |
| `list_database_users` | List MySQL database users |
| `create_database` | Create a MySQL database |
| `create_database_user` | Create a MySQL database user |
| `grant_database_privileges` | Grant a user privileges on a database |
| `cpanel_uapi_call` | Call any UAPI module/function directly for anything not covered above |

## Notes on `Fileman`

Only `list_files` (backed by `Fileman::list_files`) and, through the `cpanel_uapi_call` escape hatch, `get_file_content` / `save_file_content` are known to work reliably for reading and writing individual files. Bulk filesystem operations (`extract_files`, `rename`, `mkdir`, `fileop`, `delete_files`, ...) are not guaranteed to be available depending on your cPanel version/provider — test before relying on them, and prefer cPanel's File Manager UI for bulk moves, extraction, and deletion.

## Security

- Never commit your `.env` file (it's git-ignored by default).
- Scope your cPanel API token as narrowly as your provider allows.
- The `cpanel_uapi_call` tool can call *any* UAPI function available to your account — treat it with the same care as direct API/token access.

## License

MIT
