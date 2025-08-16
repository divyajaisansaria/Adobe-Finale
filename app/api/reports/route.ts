// src/app/api/reports/route.ts

import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

type ExtractedSection = {
  document: string
  section_title: string
  refined_text: string
  importance_rank: number
  page_number: number
}

type ReportJson = {
  metadata: {
    source_file: string
    query: string
  }
  extracted_sections: ExtractedSection[]
}

type ReportFile = {
  source_file: string
  sections: {
    document: string
    section_title: string
    refined_text: string
  }[]
}

export async function GET(req: Request) {
  const outputsDir = path.join(process.cwd(), "public", "model2", "outputs")

  try {
    // client may send ?known=abc.json,def.json
    const { searchParams } = new URL(req.url)
    const known = (searchParams.get("known") || "").split(",").filter(Boolean)

    const filenames = await fs.readdir(outputsDir)
    const jsonFiles = filenames.filter((f) => f.endsWith(".json"))

    const newFiles = jsonFiles.filter((f) => !known.includes(f))

    const reports: ReportFile[] = []
    for (const filename of newFiles) {
      const filePath = path.join(outputsDir, filename)
      const fileContent = await fs.readFile(filePath, "utf-8")
      const data = JSON.parse(fileContent) as ReportJson

      if (data?.metadata?.source_file && data.extracted_sections) {
        reports.push({
          source_file: data.metadata.source_file,
          sections: data.extracted_sections.map((s) => ({
            document: s.document,
            section_title: s.section_title,
            refined_text: s.refined_text,
          })),
        })
      }
    }

    return NextResponse.json({ newReports: reports, newFiles })
  } catch (error) {
    console.error("Error reading report files:", error)
    return NextResponse.json({ error: "Could not retrieve reports." }, { status: 500 })
  }
}
