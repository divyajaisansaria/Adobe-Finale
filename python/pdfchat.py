import sys
import os
import json
import re
from io import BytesIO
from typing import Dict

import requests
import pdfplumber
import google.generativeai as genai

# ------------------ ENV ------------------

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if LLM_PROVIDER != "gemini":
    print("Error: LLM_PROVIDER must be 'gemini' for pdfchat.py", file=sys.stderr)
    sys.exit(1)

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set", file=sys.stderr)
    sys.exit(1)

# Init Gemini
genai.configure(api_key=GEMINI_API_KEY)
_model = genai.GenerativeModel(GEMINI_MODEL)


# ------------------ PDF Extract ------------------

def extract_pdf_text(pdf_url: str) -> str:
    try:
        resp = requests.get(pdf_url, timeout=60)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error extracting PDF text: {e}", file=sys.stderr)
        return ""

    text = ""
    with pdfplumber.open(BytesIO(resp.content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text:
                text += page_text + "\n"
    return text.strip()


# ------------------ JSON Helpers ------------------

def _strip_code_fences(s: str) -> str:
    s = re.sub(r"^```(?:json)?\s*", "", s.strip(), flags=re.IGNORECASE | re.MULTILINE)
    s = re.sub(r"\s*```$", "", s, flags=re.MULTILINE)
    return s.strip()

def _extract_json_object(s: str) -> Dict:
    """
    Try multiple strategies to parse a JSON object from model output.
    Fallback returns {"answer": <text> }.
    """
    raw = s.strip()
    candidate = _strip_code_fences(raw)

    # Direct parse
    try:
        obj = json.loads(candidate)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    # Find JSON object manually
    i = candidate.find("{")
    j = candidate.rfind("}")
    if i != -1 and j != -1 and j > i:
        try:
            obj = json.loads(candidate[i:j+1])
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass

    # Fallback
    return {"answer": raw[:1000]}


# ------------------ Core Chat Logic ------------------

def chat_pdf(pdf_url: str, question: str) -> Dict:
    pdf_text = extract_pdf_text(pdf_url)
    if not pdf_text:
        return {"answer": "Failed to extract text from the PDF."}

    # Keep input size modest
    context = pdf_text[:2000]

    prompt = f"""
You are an AI assistant. A user wants to ask a question about the PDF content below.

PDF Content:
{context}

Question: {question}

Provide a concise and clear answer grounded in the PDF content. 
Return strictly as JSON:
{{
  "answer": "your response here"
}}
""".strip()

    try:
        resp = _model.generate_content(
            prompt,
            generation_config={"temperature": 0.3}
        )

        text = getattr(resp, "text", None) or str(resp)
        obj = _extract_json_object(text)

        # Guarantee "answer" exists
        if "answer" not in obj or not isinstance(obj["answer"], str):
            obj["answer"] = text.strip()[:1000]

        return obj

    except Exception as e:
        print(f"Error parsing model response: {e}", file=sys.stderr)
        return {"answer": "An error occurred while processing the question."}


# ------------------ CLI ------------------

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

    try:
        data = json.load(sys.stdin)
        pdf_url = data.get("pdfUrl", "")
        question = data.get("question", "")

        if not pdf_url or not question:
            print(json.dumps({"answer": "pdfUrl and question are required"}))
            sys.exit(0)

        result = chat_pdf(pdf_url, question)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"answer": f"Invalid input: {str(e)}"}))
