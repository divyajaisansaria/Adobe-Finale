# python/generate_podcast.py
import sys
import os
import uuid
from dotenv import load_dotenv
from pydub import AudioSegment
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
    You are writing a short podcast script as a conversation between two people.

    Input text:
    {text}

    Instructions:
    1. Turn the input into a friendly, engaging two-person conversation (Host and Guest).
    2. Keep it conversational and natural — like a podcast, not a formal lecture.
    3. Limit the script length to around 150–180 words (enough for 60–90 seconds of speech).
    4. Clearly label each line with 'Host:' or 'Guest:'.
    5. Do not add extra commentary or stage directions — just the spoken lines.
    """
    response = model.generate_content([prompt])
    return response.text.strip()

def synthesize_line(line: str, speaker: str, temp_file: str) -> str:
    speech_config = SpeechConfig(subscription=AZURE_TTS_KEY, region=AZURE_REGION)

    # Use Indian English voices
    if speaker == "Host":
        voice = "en-IN-NeerjaNeural"   # Female host
    else:
        voice = "en-IN-PrabhatNeural"  # Male guest

    speech_config.speech_synthesis_voice_name = voice
    audio_config = AudioConfig(filename=temp_file)
    synthesizer = SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    # Add expressive style for podcast-like delivery
    ssml = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
           xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-IN">
        <voice name="{voice}">
            <mstts:express-as style="chat">
                {line}
            </mstts:express-as>
        </voice>
    </speak>
    """

    synthesizer.speak_ssml_async(ssml).get()
    return temp_file

def synthesize_conversation(conv_text: str, filename: str) -> str:
    os.makedirs("public/audio", exist_ok=True)
    output_path = f"public/audio/{filename}"
    final_audio = AudioSegment.silent(duration=500)  # slight padding at start

    for i, line in enumerate(conv_text.splitlines()):
        if not line.strip():
            continue
        if line.startswith("Host:"):
            speaker, content = "Host", line.replace("Host:", "").strip()
        elif line.startswith("Guest:"):
            speaker, content = "Guest", line.replace("Guest:", "").strip()
        else:
            continue

        temp_file = f"temp_{i}.wav"
        synthesize_line(content, speaker, temp_file)
        final_audio += AudioSegment.from_wav(temp_file) + AudioSegment.silent(duration=300)
        os.remove(temp_file)

    final_audio.export(output_path, format="mp3")
    return output_path

if __name__ == "__main__":
    input_text = sys.stdin.read().strip()
    if not input_text:
        print("Error: Empty text", file=sys.stderr)
        sys.exit(1)

    try:
        conv_text = generate_conversational_text(input_text)
        filename = f"{uuid.uuid4().hex}.mp3"
        audio_path = synthesize_conversation(conv_text, filename)
        print(f"/audio/{filename}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
