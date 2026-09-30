import { config } from "../config.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly upstream?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class UpstreamError extends HttpError {
  constructor(message: string, readonly status = 502) {
    super(status, message, "open-meteo");
    this.name = "UpstreamError";
  }
}

async function once(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": "AtmoAi/1.0 (+backend proxy)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET a JSON resource with a hard timeout and bounded retries.
 * Only network/5xx responses are retried — 4xx is surfaced immediately.
 */
export async function getJson<T>(url: string): Promise<T> {
  const { upstreamTimeoutMs, upstreamRetries } = config;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= upstreamRetries; attempt++) {
    try {
      const res = await once(url, upstreamTimeoutMs);

      if (res.status >= 400 && res.status < 500) {
        let detail = "";
        try {
          detail = (await res.json())?.reason ?? "";
        } catch {
          /* body was not JSON */
        }
        throw new HttpError(
          res.status === 404 ? 404 : 400,
          detail || `Upstream rejected the request (${res.status})`,
        );
      }

      if (!res.ok) throw new UpstreamError(`Upstream returned ${res.status}`);

      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof HttpError && err.status < 500) throw err;
      if (attempt === upstreamRetries) break;
      // linear backoff: 200ms, 400ms, ...
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  const msg =
    lastErr instanceof Error
      ? lastErr.name === "AbortError"
        ? `Upstream timed out after ${upstreamTimeoutMs}ms`
        : lastErr.message
      : "Unknown upstream failure";
  throw new UpstreamError(msg, 504);
}
