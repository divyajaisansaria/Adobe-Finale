import sys
import os
import json
import re
from typing import List, Dict, Any

# ------------- LLM CONFIG -------------

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if LLM_PROVIDER != "gemini":
    print("Error: LLM_PROVIDER must be 'gemini' for insightgenerator.py", file=sys.stderr)
    sys.exit(1)

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set", file=sys.stderr)
    sys.exit(1)

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)
_model = genai.GenerativeModel(GEMINI_MODEL)

# ------------- JSON HELPERS -------------

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

# ------------- CORE GENERATION -------------

def generate_insights(text: str) -> List[Dict[str, Any]]:
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
        resp = _model.generate_content(
            prompt,
            generation_config={"temperature": 0.7}
        )

        # Prefer resp.text if present
        out = getattr(resp, "text", None)
        if not out:
            out = str(resp)

        arr = _parse_json_array(out)
        # Ensure it's a list of dicts; else return []
        if isinstance(arr, list):
            return [x for x in arr if isinstance(x, dict)]
        return []
    except Exception as e:
        print(f"Error generating insights: {e}", file=sys.stderr)
        return []

# ------------- CLI ENTRYPOINT -------------

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
