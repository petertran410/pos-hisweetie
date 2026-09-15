import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROXY_TARGET = (
  process.env.API_PROXY_TARGET || "http://14.224.212.102:3060"
).replace(/\/$/, "");

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

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const search = new URL(request.url).search;
  const targetUrl = `${PROXY_TARGET}/api/${path.join("/")}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_REQ_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json(
      {
        statusCode: 502,
        message: timedOut
          ? "Không kết nối được backend (timeout). Máy chủ Vercel không tới được API."
          : "Không kết nối được backend. Kiểm tra API_PROXY_TARGET và firewall cổng 3060.",
      },
      { status: 502 }
    );
  }

  const outHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (!SKIP_RES_HEADERS.has(key.toLowerCase())) {
      outHeaders.set(key, value);
    }
  });

  return new Response(backendRes.body, {
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
