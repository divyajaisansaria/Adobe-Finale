// app/main/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";           // ensure Node runtime
export const dynamic = "force-dynamic";    // read env at runtime (no cache)

export async function GET() {
  const adobeClientId = process.env.ADOBE_EMBED_API_KEY || "";
  return NextResponse.json({ adobeClientId });
}
