import http from "node:http";
import https from "node:https";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRIMARY_TARGET = (
  process.env.API_PROXY_TARGET || "http://14.224.212.102:3060"
).replace(/\/$/, "");
const FALLBACK_TARGET = (
  process.env.API_PROXY_FALLBACK || "https://14.224.212.102"
).replace(/\/$/, "");
const FALLBACK_HOST = process.env.API_PROXY_HOST || "backendpos.hisweetievietnam.com";

const SKIP_REQ_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "transfer-encoding",
  "keep-alive",
  "proxy-connection",
]);

const SKIP_RES_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
]);

type Target = {
  protocol: "http" | "https";
  hostname: string;
  port: number;
};

function parseTarget(raw: string): Target {
  const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
  const protocol = url.protocol === "https:" ? "https" : "http";
  return {
    protocol,
    hostname: url.hostname,
    port: url.port ? Number(url.port) : protocol === "https" ? 443 : 80,
  };
}

function isNetworkError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    code === "ENOTFOUND" ||
    code === "EPIPE" ||
    (error as Error)?.name === "AbortError"
  );
}

function errorDetail(error: unknown): string {
  const err = error as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
  const parts = [
    err?.code,
    err?.message,
    err?.cause?.code,
    err?.cause?.message,
  ].filter(Boolean);
  return [...new Set(parts)].join(" | ") || String(error);
}

function requestBackend(options: {
  target: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: Buffer;
  timeoutMs: number;
  hostHeader?: string;
  insecureTls?: boolean;
}): Promise<{
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}> {
  const target = parseTarget(options.target);
  const lib = target.protocol === "https" ? https : http;
  const hostHeader =
    options.hostHeader ||
    (target.port === 80 || (target.protocol === "https" && target.port === 443)
      ? target.hostname
      : `${target.hostname}:${target.port}`);

  return new Promise((resolve, reject) => {
    const requestOptions: https.RequestOptions = {
      protocol: `${target.protocol}:`,
      hostname: target.hostname,
      port: target.port,
      path: options.path,
      method: options.method,
      headers: { ...options.headers, host: hostHeader },
      family: 4,
      timeout: options.timeoutMs,
    };
    if (target.protocol === "https") {
      requestOptions.rejectUnauthorized = !options.insecureTls;
      requestOptions.servername = hostHeader.split(":")[0];
    }

    const req = lib.request(
      requestOptions,
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 502,
            statusText: res.statusMessage || "",
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(
        Object.assign(new Error(`timeout ${target.hostname}:${target.port}`), {
          code: "ETIMEDOUT",
        })
      );
    });
    req.on("error", reject);
    if (options.body?.length) req.write(options.body);
    req.end();
  });
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const search = new URL(request.url).search;
  const backendPath = `/api/${path.join("/")}${search}`;
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!SKIP_REQ_HEADERS.has(key.toLowerCase())) headers[key] = value;
  });

  let usedTarget = PRIMARY_TARGET;
  let backendRes: Awaited<ReturnType<typeof requestBackend>>;
  try {
    backendRes = await requestBackend({
      target: PRIMARY_TARGET,
      method,
      path: backendPath,
      headers,
      body,
      timeoutMs: 8000,
    });
  } catch (primaryError) {
    if (!isNetworkError(primaryError) || FALLBACK_TARGET === PRIMARY_TARGET) {
      return Response.json(
        {
          statusCode: 502,
          message: `Không kết nối được backend ${PRIMARY_TARGET}. ${errorDetail(primaryError)}`,
        },
        { status: 502 }
      );
    }

    try {
      usedTarget = FALLBACK_TARGET;
      backendRes = await requestBackend({
        target: FALLBACK_TARGET,
        method,
        path: backendPath,
        headers,
        body,
        timeoutMs: 10000,
        hostHeader: FALLBACK_HOST,
        insecureTls: true,
      });
    } catch (fallbackError) {
      return Response.json(
        {
          statusCode: 502,
          message: `Không kết nối được backend IP. 3060: ${errorDetail(primaryError)}. 443: ${errorDetail(fallbackError)}`,
        },
        { status: 502 }
      );
    }
  }

  const outHeaders = new Headers();
  for (const [key, value] of Object.entries(backendRes.headers)) {
    if (!value || SKIP_RES_HEADERS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) outHeaders.set(key, value.join(", "));
    else outHeaders.set(key, value);
  }
  outHeaders.set("x-pos-proxy-target", usedTarget);

  return new Response(new Uint8Array(backendRes.body), {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
