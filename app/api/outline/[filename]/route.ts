import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { filename: string } }
) {
  const { filename: raw } = context.params || ({} as any);
  const filename = raw ? decodeURIComponent(raw) : "";

  if (!filename) {
    return NextResponse.json({ error: "Filename not provided" }, { status: 400 });
  }
  if (filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }
  // optional: only allow .json
  if (!filename.endsWith(".json")) {
    return NextResponse.json({ error: "Only .json allowed" }, { status: 400 });
  }

  try {
    const jsonDirectory = path.join(process.cwd(), "public", "model1");
    const filePath = path.join(jsonDirectory, filename);
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return NextResponse.json({ error: "Outline not found" }, { status: 404 });
  }
}
