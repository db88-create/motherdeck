import { NextRequest, NextResponse } from "next/server";

const MC_BASE = process.env.MC_URL || "http://localhost:8600";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${MC_BASE}/api/${path.join("/")}${req.nextUrl.search}`;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      ...(req.method !== "GET" && req.method !== "HEAD" && {
        body: await req.text(),
      }),
      // Don't cache — always fresh data
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Mission Control unavailable", mc_down: true },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
