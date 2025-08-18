# python/generate_podcast.py
import sys
import os
import uuid
from dotenv import load_dotenv
import openai
from azure.cognitiveservices.speech import SpeechConfig, SpeechSynthesizer, AudioConfig
import google.generativeai as genai

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
AZURE_TTS_KEY = os.getenv("AZURE_TTS_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

def generate_conversational_text(text: str) -> str:
    prompt = f"""
    Convert the following text into a friendly two-person conversation suitable for a podcast:
    {text}
    """
    response = model.generate_content([prompt])
    return response.text

def synthesize_speech(text: str, filename: str) -> str:
    speech_config = SpeechConfig(subscription=AZURE_TTS_KEY, region=AZURE_REGION)
    speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
    os.makedirs("public/audio", exist_ok=True)
    audio_path = f"public/audio/{filename}"
    audio_config = AudioConfig(filename=audio_path)
    synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    synthesizer.speak_text_async(text).get()
    return audio_path

if __name__ == "__main__":
    input_text = sys.stdin.read().strip()
    if not input_text:
        print("Error: Empty text", file=sys.stderr)
        sys.exit(1)

    try:
        conv_text = generate_conversational_text(input_text)
        filename = f"{uuid.uuid4().hex}.mp3"
        audio_path = synthesize_speech(conv_text, filename)
        # Return relative URL for Next.js to serve
        print(f"/audio/{filename}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
