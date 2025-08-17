import sys
import json
import re
import os
import tempfile
import requests
import pdfplumber
import google.generativeai as genai
from dotenv import load_dotenv

# Load .env for GEMINI_API_KEY
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel("gemini-2.5-flash")

def extract_pdf_text(pdf_url: str) -> str:
    try:
        # Download PDF
        response = requests.get(pdf_url)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(response.content)
            tmp_path = tmp_file.name

        # Extract text
        text = ""
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"

        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}", file=sys.stderr)
        return ""

def chat_pdf(pdf_url: str, question: str) -> dict:
    pdf_text = extract_pdf_text(pdf_url)
    if not pdf_text:
        return {"answer": "Failed to extract text from the PDF."}

    prompt = f"""
You are an AI assistant. A user wants to ask a question about the PDF content below:

PDF Content:
{pdf_text[:2000]}  # send only the first 2000 chars to limit input

Question: {question}

Provide a concise and clear answer grounded in the PDF content. Return strictly as JSON:
{{
    "answer": "your response here"
}}
"""
    try:
        response = model.generate_content([prompt])

        json_match = re.search(r"\{.*\}", response.text, re.DOTALL)
        if not json_match:
            return {"answer": "Could not extract a valid answer from the model."}

        return json.loads(json_match.group(0))
    except Exception as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        return {"answer": "An error occurred while processing the question."}


if __name__ == "__main__":
    try:
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
