# python/insightgenerator.py
# Vertex-only (service account) insights generator aligned with judges' env.
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
from typing import List, Dict, Any

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_CLOUD_REGION = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")

if LLM_PROVIDER != "gemini":
    print("Error: LLM_PROVIDER must be 'gemini' for insightgenerator.py", file=sys.stderr)
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

# ---- JSON helpers ----
def _strip_code_fences(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE | re.MULTILINE)
    s = re.sub(r"\s*```$", "", s, flags=re.MULTILINE)
    return s.strip()

def _parse_json_array(text: str) -> List[Dict[str, Any]]:
    """
    Try to parse a JSON array from model text robustly.
    Returns [] on failure.
    """
    candidate = _strip_code_fences(text)

    # Direct parse
    try:
        obj = json.loads(candidate)
        if isinstance(obj, list):
            return obj
    except Exception:
        pass

    # Find first [...] region
    i = candidate.find("[")
    j = candidate.rfind("]")
    if i != -1 and j != -1 and j > i:
        try:
            obj = json.loads(candidate[i:j+1])
            if isinstance(obj, list):
                return obj
        except Exception:
            pass

    return []

# ---- Core generation ----
def generate_insights(text: str) -> List[Dict[str, Any]]:
    _init_vertex_if_needed()

    prompt = f"""
You are a highly intelligent AI assistant tasked with analyzing the text below. Generate concise and insightful facts in three distinct categories:

1) "Did You Know": Interesting facts or trivia that are not obvious.
2) "Contradiction": Points where the text presents conflicting statements or surprising contrasts.
3) "Takeaway": A short summary of the selected text in bullet points, highlighting the most important points as a quick review.

Return strictly as a JSON array of objects with the following fields:
id (string), title (string), content (string), category (one of "Did You Know", "Contradiction", "Takeaway"), confidence (0-1 float).

Text:
{text}
""".strip()

    try:
        resp = _vertex_model.generate_content(prompt)

        # Prefer resp.text if present
        out = None
        if hasattr(resp, "text") and resp.text:
            out = resp.text
        else:
            cands = getattr(resp, "candidates", None)
            if cands:
                content = getattr(cands[0], "content", None)
                parts = getattr(content, "parts", None) if content else None
                if parts and len(parts) > 0 and hasattr(parts[0], "text"):
                    out = parts[0].text
        if out is None:
            out = str(resp)

        arr = _parse_json_array(out)
        # Ensure it's a list of dicts; else return []
        if isinstance(arr, list):
            return [x for x in arr if isinstance(x, dict)]
        return []
    except Exception as e:
        print(f"Error generating insights: {e}", file=sys.stderr)
        return []

# ---- CLI entrypoint ----
if __name__ == "__main__":
    try:
        try:
            sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
            sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

        input_text = sys.stdin.read()
        facts = generate_insights(input_text or "")
        print(json.dumps(facts, ensure_ascii=False))
    except Exception as e:
        # Always print a JSON array so the Node route can parse it
        print(json.dumps([]))
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
