# python/pdfchat.py
# Vertex-only (service account) PDF Q&A aligned with judges' env.
# Expected env:
#   LLM_PROVIDER=gemini
#   GEMINI_MODEL=gemini-2.5-flash
#   GOOGLE_APPLICATION_CREDENTIALS=/credentials/adbe-gcp.json
# Optional:
#   GOOGLE_CLOUD_PROJECT=<project-id>  (else inferred from SA JSON)
#   GOOGLE_CLOUD_REGION=us-central1

import sys
import os
import json
import re
from io import BytesIO
from typing import Dict

import requests
import pdfplumber

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_CLOUD_REGION = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")

if LLM_PROVIDER != "gemini":
    print("Error: LLM_PROVIDER must be 'gemini' for pdfchat.py", file=sys.stderr)
    sys.exit(1)

if not GOOGLE_APPLICATION_CREDENTIALS:
    print("Error: GOOGLE_APPLICATION_CREDENTIALS not set", file=sys.stderr)
    sys.exit(1)

# ---- Vertex init (lazy) ----
_vertex_model = None

def _read_project_from_sa(json_path: str) -> str:
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("project_id") or data.get("projectId") or ""
    except Exception:
        return ""

def _init_vertex_if_needed():
    global _vertex_model
    if _vertex_model is not None:
        return
    try:
        from vertexai import init as vertex_init
        from vertexai.generative_models import GenerativeModel
    except Exception as e:
        print(f"Error: Vertex AI SDK not installed: {e}", file=sys.stderr)
        sys.exit(1)

    project = GOOGLE_CLOUD_PROJECT or _read_project_from_sa(GOOGLE_APPLICATION_CREDENTIALS)
    if project:
        vertex_init(project=project, location=GOOGLE_CLOUD_REGION)
    else:
        vertex_init(location=GOOGLE_CLOUD_REGION)

    _vertex_model = GenerativeModel(GEMINI_MODEL)

# ---- PDF utils ----
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

# ---- JSON extraction helpers ----
def _strip_code_fences(s: str) -> str:
    s = re.sub(r"^```(?:json)?\s*", "", s.strip(), flags=re.IGNORECASE | re.MULTILINE)
    s = re.sub(r"\s*```$", "", s, flags=re.MULTILINE)
    return s.strip()

def _extract_json_object(s: str) -> Dict:
    """
    Try multiple strategies to parse a JSON object from model text.
    Falls back to {"answer": <text>} if strict JSON isn't found.
    """
    raw = s.strip()
    # 1) remove ```json fences if present
    candidate = _strip_code_fences(raw)

    # 2) direct parse
    try:
        obj = json.loads(candidate)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    # 3) find first {...} region
    i = candidate.find("{")
    j = candidate.rfind("}")
    if i != -1 and j != -1 and j > i:
        try:
            obj = json.loads(candidate[i:j+1])
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass

    # 4) fallback: return the text as answer
    return {"answer": raw[:1000]}

# ---- Core Q&A ----
def chat_pdf(pdf_url: str, question: str) -> Dict:
    pdf_text = extract_pdf_text(pdf_url)
    if not pdf_text:
        return {"answer": "Failed to extract text from the PDF."}

    # Keep input size modest (as in your original)
    context = pdf_text[:2000]

    prompt = f"""
You are an AI assistant. A user wants to ask a question about the PDF content below.

PDF Content:
{context}

Question: {question}

Provide a concise and clear answer grounded in the PDF content. Return strictly as JSON:
{{
  "answer": "your response here"
}}
""".strip()

    try:
        _init_vertex_if_needed()
        resp = _vertex_model.generate_content(prompt)

        # Prefer resp.text when available; otherwise inspect candidates
        answer_text = None
        if hasattr(resp, "text") and resp.text:
            answer_text = resp.text
        else:
            cands = getattr(resp, "candidates", None)
            if cands:
                content = getattr(cands[0], "content", None)
                parts = getattr(content, "parts", None) if content else None
                if parts and len(parts) > 0 and hasattr(parts[0], "text"):
                    answer_text = parts[0].text
        if not answer_text:
            answer_text = str(resp)

        obj = _extract_json_object(answer_text)
        # Ensure we always return an "answer" field
        if "answer" not in obj or not isinstance(obj["answer"], str):
            obj["answer"] = (answer_text or "").strip()[:1000]
        return obj
    except Exception as e:
        print(f"Error parsing model response: {e}", file=sys.stderr)
        return {"answer": "An error occurred while processing the question."}

# ---- CLI ----
if __name__ == "__main__":
    try:
        try:
            sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
            sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

        input_data = json.load(sys.stdin)
        pdf_url = input_data.get("pdfUrl", "")
        question = input_data.get("question", "")
        if not pdf_url or not question:
            print(json.dumps({"answer": "pdfUrl and question are required"}))
            sys.exit(0)

        result = chat_pdf(pdf_url, question)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"answer": f"Invalid input: {str(e)}"}))
