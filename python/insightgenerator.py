import sys
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load .env for GEMINI_API_KEY
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel("gemini-2.5-flash")


def generate_insights(text: str):
    # Prompt now asks for all three categories
    prompt = f"""
    You are a highly intelligent AI assistant tasked with analyzing the text below. Generate concise and insightful facts in **three distinct categories**:

1) "Did You Know": Interesting facts or trivia that are not obvious.  
2) "Contradiction": Points where the text presents conflicting statements or surprising contrasts.  
3) "Takeaway": A short summary of the selected text in **bullet points**, highlighting the most important points as a quick review.

Return strictly as a JSON array of objects with the following fields:
id (string), title (string), content (string), category (one of "Did You Know", "Contradiction", "Takeaway"), confidence (0-1 float).

Text:
{text}
"""

    # Call Gemini
    response = model.generate_content([prompt])

    # Extract JSON array from response
    try:
        json_match = re.search(r"\[.*\]", response.text, re.DOTALL)
        if not json_match:
            return []
        return json.loads(json_match.group(0))
    except Exception as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        return []


if __name__ == "__main__":
    # Read text from stdin
    input_text = sys.stdin.read()
    facts = generate_insights(input_text)
    # Print JSON array to stdout
    print(json.dumps(facts))
