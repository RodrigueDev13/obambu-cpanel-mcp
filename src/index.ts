import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CpanelClient, loadConfigFromEnv } from "./cpanelClient.js";

const config = loadConfigFromEnv();
const cpanel = new CpanelClient(config);

const server = new McpServer({
  name: "obambu-cpanel",
  version: "0.1.0",
});

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

// --- Account overview -------------------------------------------------

server.tool(
  "get_account_summary",
  "Get an overview of the cPanel account: disk/bandwidth quota usage and general stats.",
  {},
  async () => {
    try {
      const [quota, stats] = await Promise.all([
        cpanel.call("Quota", "get_quota_info"),
        cpanel.call("StatsBar", "get_stats"),
      ]);
      return ok({ quota, stats });
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Domains ------------------------------------------------------------

server.tool(
  "list_domains",
  "List all domains, subdomains, addon domains and parked domains on the account.",
  {},
  async () => {
    try {
      const data = await cpanel.call("DomainInfo", "list_domains");
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

// --- DNS ------------------------------------------------------------

server.tool(
  "list_dns_records",
  "List DNS zone records for a domain.",
  { zone: z.string().describe("Domain name whose DNS zone to read, e.g. example.com") },
  async ({ zone }) => {
    try {
      const data = await cpanel.call("DNS", "parse_zone", { zone });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "add_dns_record",
  "Add a DNS record to a zone. Provide type-specific fields in `fields` " +
    "(e.g. A record: {address: '1.2.3.4'}; CNAME: {cname: 'target.example.com'}; " +
    "TXT: {txtdata: 'value'}; MX: {exchange: 'mail.example.com', preference: '10'}).",
  {
    zone: z.string().describe("Domain name owning the zone, e.g. example.com"),
    name: z.string().describe("Record name, e.g. sub.example.com or example.com"),
    type: z.string().describe("Record type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA..."),
    ttl: z.number().int().optional().describe("TTL in seconds, defaults to 14400"),
    fields: z
      .record(z.string())
      .optional()
      .describe("Type-specific value fields required by cPanel for this record type"),
  },
  async ({ zone, name, type, ttl, fields }) => {
    try {
      const data = await cpanel.call("DNS", "add_zone_record", {
        zone,
        name,
        type,
        ttl,
        ...(fields ?? {}),
      });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "edit_dns_record",
  "Edit an existing DNS record. `line` is the record's line number as returned by list_dns_records.",
  {
    zone: z.string().describe("Domain name owning the zone"),
    line: z.number().int().describe("Line number of the record in the zone (from list_dns_records)"),
    type: z.string().describe("Record type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA..."),
    ttl: z.number().int().optional(),
    fields: z
      .record(z.string())
      .optional()
      .describe("Type-specific value fields to update for this record type"),
  },
  async ({ zone, line, type, ttl, fields }) => {
    try {
      const data = await cpanel.call("DNS", "edit_zone_record", {
        zone,
        line,
        type,
        ttl,
        ...(fields ?? {}),
      });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "remove_dns_record",
  "Remove a DNS record from a zone. `line` is the record's line number as returned by list_dns_records.",
  {
    zone: z.string().describe("Domain name owning the zone"),
    line: z.number().int().describe("Line number of the record to remove"),
  },
  async ({ zone, line }) => {
    try {
      const data = await cpanel.call("DNS", "remove_zone_record", { zone, line });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Email ------------------------------------------------------------

server.tool(
  "list_emails",
  "List email accounts, optionally filtered by domain.",
  { domain: z.string().optional().describe("Limit results to this domain") },
  async ({ domain }) => {
    try {
      const data = await cpanel.call("Email", "list_pops", { domain });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "create_email",
  "Create a new email account.",
  {
    email: z.string().describe("Local part of the address, e.g. 'contact' for contact@example.com"),
    domain: z.string().describe("Domain for the mailbox, e.g. example.com"),
    password: z.string().describe("Password for the new mailbox"),
    quotaMb: z.number().int().optional().describe("Mailbox quota in MB, 0 for unlimited"),
  },
  async ({ email, domain, password, quotaMb }) => {
    try {
      const data = await cpanel.call("Email", "add_pop", {
        email,
        domain,
        password,
        quota: quotaMb,
      });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "delete_email",
  "Delete an email account.",
  {
    email: z.string().describe("Local part of the address to delete"),
    domain: z.string().describe("Domain of the mailbox"),
  },
  async ({ email, domain }) => {
    try {
      const data = await cpanel.call("Email", "delete_pop", { email, domain });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Files ------------------------------------------------------------

server.tool(
  "list_files",
  "List files and directories at a path within the account's home directory.",
  { dir: z.string().default("/").describe("Directory to list, relative to the home directory") },
  async ({ dir }) => {
    try {
      const data = await cpanel.call("Fileman", "list_files", { dir });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Databases ------------------------------------------------------------

server.tool("list_databases", "List MySQL databases on the account.", {}, async () => {
  try {
    const data = await cpanel.call("Mysql", "list_databases");
    return ok(data);
  } catch (err) {
    return fail(err);
  }
});

server.tool("list_database_users", "List MySQL database users on the account.", {}, async () => {
  try {
    const data = await cpanel.call("Mysql", "list_users");
    return ok(data);
  } catch (err) {
    return fail(err);
  }
});

server.tool(
  "create_database",
  "Create a new MySQL database.",
  { name: z.string().describe("Database name (without the cPanel account prefix)") },
  async ({ name }) => {
    try {
      const data = await cpanel.call("Mysql", "create_database", { name });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "create_database_user",
  "Create a new MySQL database user.",
  {
    name: z.string().describe("Username (without the cPanel account prefix)"),
    password: z.string().describe("Password for the new user"),
  },
  async ({ name, password }) => {
    try {
      const data = await cpanel.call("Mysql", "create_user", { name, password });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

server.tool(
  "grant_database_privileges",
  "Grant a database user privileges on a database.",
  {
    user: z.string().describe("Full database username (as returned by list_database_users)"),
    database: z.string().describe("Full database name (as returned by list_databases)"),
    privileges: z
      .string()
      .default("ALL PRIVILEGES")
      .describe("Comma-separated privileges, defaults to ALL PRIVILEGES"),
  },
  async ({ user, database, privileges }) => {
    try {
      const data = await cpanel.call("Mysql", "set_privileges_on_database", {
        user,
        database,
        privileges,
      });
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Escape hatch ------------------------------------------------------------

server.tool(
  "cpanel_uapi_call",
  "Call any cPanel UAPI module/function directly. Use this for functionality not covered " +
    "by the other tools. Refer to cPanel UAPI documentation for module/function names and parameters.",
  {
    module: z.string().describe("UAPI module name, e.g. 'Email', 'DNS', 'Mysql', 'DomainInfo'"),
    function: z.string().describe("UAPI function name within the module"),
    params: z
      .record(z.union([z.string(), z.number()]))
      .optional()
      .describe("Query parameters to pass to the function"),
  },
  async ({ module, function: fn, params }) => {
    try {
      const data = await cpanel.call(module, fn, params ?? {});
      return ok(data);
    } catch (err) {
      return fail(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
