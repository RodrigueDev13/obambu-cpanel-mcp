export interface CpanelConfig {
  host: string;
  port: string;
  username: string;
  apiToken: string;
}

export function loadConfigFromEnv(): CpanelConfig {
  const host = process.env.CPANEL_HOST;
  const username = process.env.CPANEL_USERNAME;
  const apiToken = process.env.CPANEL_API_TOKEN;
  const port = process.env.CPANEL_PORT || "2083";

  if (!host || !username || !apiToken) {
    throw new Error(
      "Missing cPanel configuration. Set CPANEL_HOST, CPANEL_USERNAME and CPANEL_API_TOKEN."
    );
  }

  return { host, port, username, apiToken };
}

interface UapiResponse<T = unknown> {
  status: number;
  errors: string[] | null;
  messages: string[] | null;
  data: T;
  metadata?: unknown;
}

export class CpanelClient {
  constructor(private config: CpanelConfig) {}

  async call<T = unknown>(
    moduleName: string,
    functionName: string,
    params: Record<string, string | number | undefined> = {}
  ): Promise<T> {
    const url = new URL(
      `https://${this.config.host}:${this.config.port}/execute/${moduleName}/${functionName}`
    );
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `cpanel ${this.config.username}:${this.config.apiToken}`,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `cPanel HTTP ${res.status} calling ${moduleName}::${functionName}: ${body.slice(0, 500)}`
      );
    }

    const json = (await res.json()) as UapiResponse<T>;

    if (json.status !== 1) {
      const errors = json.errors?.join("; ") || "Unknown cPanel API error";
      throw new Error(`cPanel API error in ${moduleName}::${functionName}: ${errors}`);
    }

    return json.data;
  }
}
