import sys
import os
import json
from typing import List
import requests
from io import BytesIO
import pdfplumber

# ----- Env -----
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if LLM_PROVIDER != "gemini":
    print("Error: LLM_PROVIDER must be 'gemini' for this script", file=sys.stderr)
    sys.exit(1)

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set", file=sys.stderr)
    sys.exit(1)

# ----- Gemini init -----
import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)
_model = genai.GenerativeModel(GEMINI_MODEL)

def generate_summary_chunk(text: str) -> str:
    try:
        prompt = f"""
You are an expert AI assistant specialized in summarizing documents concisely.

Input: {text}

Instructions:
1. Summarize the content clearly and concisely in simple understanding words.
2. Organize the summary into sections with descriptive headings.
3. Use short, readable paragraphs — do NOT use bullet points.
4. Focus only on the most important information (key achievements, skills, outcomes, highlights).
5. Avoid repeating any content.
6. Limit the summary to about 200 words in total.
7. Output plain text only — do NOT return JSON or markup.
""".strip()

        resp = _model.generate_content(
            prompt,
            generation_config={"temperature": 0.7}
        )

        if hasattr(resp, "text") and resp.text:
            return resp.text
        return str(getattr(resp, "candidates", "") or resp)
    except Exception as e:
        raise RuntimeError(f"Gemini generation failed: {e}")

# ----- Helpers -----
def download_pdf(pdf_url: str) -> str:
    try:
        resp = requests.get(pdf_url, timeout=60)
        resp.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Failed to download PDF: {e}")

    text = ""
    with pdfplumber.open(BytesIO(resp.content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def chunk_text(text: str, max_chars: int = 2000) -> List[str]:
    chunks: List[str] = []
    i, n = 0, len(text)
    while i < n:
        end = min(i + max_chars, n)
        chunk = text[i:end]
        last_nl = chunk.rfind("\n")
        if last_nl > 0:
            chunk = chunk[:last_nl]
            end = i + last_nl
        ch = chunk.strip()
        if ch:
            chunks.append(ch)
        i = end
    return chunks

def remove_consecutive_duplicates(s: str) -> str:
    lines = s.splitlines()
    cleaned, prev = [], None
    for line in lines:
        ls = line.strip()
        if ls and ls != prev:
            cleaned.append(line)
        prev = ls
    return "\n".join(cleaned)

# ----- Main -----
def main():
    if len(sys.argv) < 2:
        print("Error: PDF URL not provided", file=sys.stderr)
        sys.exit(1)

    pdf_url = sys.argv[1]

    try:
        pdf_text = download_pdf(pdf_url)

        summaries: List[str] = []
        for chunk in chunk_text(pdf_text):
            summaries.append(generate_summary_chunk(chunk))

        final_summary = remove_consecutive_duplicates("\n".join(summaries)).strip()
        print(final_summary)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass
    main()
