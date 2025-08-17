import sys
import os
import requests
import pdfplumber
from io import BytesIO
import google.genai as genai

# Load API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set", file=sys.stderr)
    sys.exit(1)

# Create client with API key
client = genai.Client(api_key=GEMINI_API_KEY)

def download_pdf(pdf_url: str) -> str:
    """Download PDF from URL and extract text."""
    response = requests.get(pdf_url)
    response.raise_for_status()
    pdf_bytes = BytesIO(response.content)

    text = ""
    with pdfplumber.open(pdf_bytes) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def chunk_text(text, max_chars=2000):
    """Split text into smaller chunks to limit prompt size."""
    chunks = []
    while text:
        chunk = text[:max_chars]
        last_newline = chunk.rfind("\n")
        if last_newline > 0:
            chunk = chunk[:last_newline]
        chunks.append(chunk.strip())
        text = text[len(chunk):]
    return chunks

def generate_summary(text: str) -> str:
    """Call Gemini/GenAI to generate a concise summary with headings."""
    prompt = f"""
You are an expert AI assistant specialized in summarizing documents concisely.

Input: {text}

Instructions:
1. Summarize the content clearly and concisely in simple understanding words.
2. Organize the summary into sections with descriptive headings.
3. Use short, readable paragraphs — do NOT use bullet points.
4. Focus only on the most important information (key achievements, skills, outcomes, highlights).
5. Avoid repeating any content.
6. Limit the summary to about 200 words per chunk.
7. Output plain text only — do NOT return JSON or markup.
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    # Extract raw text
    raw_text = None
    if hasattr(response, "text"):
        raw_text = response.text
    elif hasattr(response, "candidates") and len(response.candidates) > 0:
        raw_text = response.candidates[0].content.parts[0].text
    else:
        raw_text = str(response)

    return raw_text

def remove_consecutive_duplicates(text: str) -> str:
    """Remove consecutive duplicate lines to clean up repeated content."""
    lines = text.splitlines()
    cleaned_lines = []
    prev_line = None
    for line in lines:
        if line.strip() and line != prev_line:
            cleaned_lines.append(line)
        prev_line = line
    return "\n".join(cleaned_lines)

def main():
    if len(sys.argv) < 2:
        print("Error: PDF URL not provided", file=sys.stderr)
        sys.exit(1)

    pdf_url = sys.argv[1]

    try:
        # Download PDF
        pdf_text = download_pdf(pdf_url)

        # Chunk PDF and generate summary per chunk
        all_summaries = []
        for chunk in chunk_text(pdf_text):
            summary_chunk = generate_summary(chunk)
            all_summaries.append(summary_chunk)

        # Combine all chunks and clean duplicates
        final_summary = remove_consecutive_duplicates("\n".join(all_summaries))

        # Output plain text summary
        print(final_summary)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
