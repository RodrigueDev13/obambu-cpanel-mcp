# obambu-cpanel-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that lets an AI assistant (Claude, etc.) manage a cPanel hosting account through the [cPanel UAPI](https://api.docs.cpanel.net/openapi/cpanel/overview/).

It exposes tools for domains, DNS zones, email accounts, MySQL databases, and file listing, plus a generic escape hatch to call any other UAPI module/function.

## Requirements

- Node.js 18+
- A cPanel account with API token access (Security → Manage API Tokens in cPanel)

## Getting your cPanel credentials (Obambu example)

The four env vars below can come from any cPanel host, but here's how to find them on **Obambu**:

- **`CPANEL_HOST`** — your server hostname, e.g. `cp4.obambu.com` (or your own domain if cPanel is reachable at `https://yourdomain.com:2083`). Find it in your Obambu welcome email, or in your domain's DNS zone: look for an `A` record named `cpanel` (e.g. `cpanel.yourdomain.com`) — that same server also answers at its `cpX.obambu.com` hostname.
- **`CPANEL_PORT`** — `2083` (cPanel's default HTTPS port). Leave it unless your host says otherwise.
- **`CPANEL_USERNAME`** — your cPanel account username, shown top-right when logged into cPanel, or in the welcome email Obambu sent when the hosting account was created.
- **`CPANEL_API_TOKEN`** — generate one yourself, it is *not* your cPanel password:
  1. Log into cPanel at `https://<CPANEL_HOST>:2083`
  2. Go to **Security → Manage API Tokens**
  3. Click **Create**, give it a name (e.g. `mcp-server`), optionally restrict it to specific ACLs, then **Create**
  4. Copy the token immediately — cPanel only shows it once

## Using it with an MCP client (npx, recommended)

Published on npm as [`obambu-cpanel-mcp`](https://www.npmjs.com/package/obambu-cpanel-mcp) — no clone or build needed. Add it to your MCP client config (e.g. Claude Desktop / Claude Code):

```json
{
  "mcpServers": {
    "obambu-cpanel": {
      "command": "npx",
      "args": ["-y", "obambu-cpanel-mcp"],
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

## Running from source

```bash
git clone https://github.com/RodrigueDev13/obambu-cpanel-mcp.git
cd obambu-cpanel-mcp
npm install
cp .env.example .env
```

Edit `.env` with your cPanel details, then:

```bash
npm run build
npm start
```

For local development without building first:

```bash
npm run dev
```

When running from source, point your MCP client at the built entrypoint instead of `npx`:

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

## Usage examples

Once connected, just talk to your assistant in plain language — it picks the right tool:

- *"Test the connection to my cPanel account"* → `get_account_summary`
- *"What domains and subdomains are on this hosting account?"* → `list_domains`
- *"Show me the DNS records for example.com"* → `list_dns_records`
- *"Add an A record for shop.example.com pointing to 1.2.3.4"* → `add_dns_record`
- *"Create a mailbox contact@example.com"* → `create_email`
- *"Create a MySQL database and user for my new app, then grant privileges"* → `create_database` + `create_database_user` + `grant_database_privileges`
- *"List the files in public_html"* → `list_files`
- *"Read config/filesystems.php and fix this path"* → `cpanel_uapi_call` with `module: "Fileman", function: "get_file_content"` / `save_file_content`

Because tool calls map directly to UAPI modules, this is also useful for real migration/deployment workflows — e.g. moving a site to a new cPanel account, provisioning a database for a fresh app, or auditing DNS before a domain cutover.

## Notes on `Fileman`

Only `list_files` (backed by `Fileman::list_files`) and, through the `cpanel_uapi_call` escape hatch, `get_file_content` / `save_file_content` are known to work reliably for reading and writing individual files. Bulk filesystem operations (`extract_files`, `rename`, `mkdir`, `fileop`, `delete_files`, ...) are not guaranteed to be available depending on your cPanel version/provider — test before relying on them, and prefer cPanel's File Manager UI for bulk moves, extraction, and deletion.

## Security

- Never commit your `.env` file (it's git-ignored by default).
- Scope your cPanel API token as narrowly as your provider allows.
- The `cpanel_uapi_call` tool can call *any* UAPI function available to your account — treat it with the same care as direct API/token access.

## License

MIT
