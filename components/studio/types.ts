// Shared types used across Studio subcomponents

export type OutlineItem = {
  level: string
  text: string
  page: number
}

export type ReportSection = {
  document: string
  section_title: string
  refined_text: string
}

export type ReportFile = {
  source_file: string
  sections: ReportSection[]
}

export type NavigationTarget = {
  page: number
  text: string
}
