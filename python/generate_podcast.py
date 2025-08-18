# python/generate_podcast.py
# Vertex-only (service account) + Azure TTS
# Env expected:
#   LLM_PROVIDER=gemini
#   GEMINI_MODEL=gemini-2.5-flash
#   GOOGLE_APPLICATION_CREDENTIALS=/credentials/adbe-gcp.json
# Optional:
#   GOOGLE_CLOUD_PROJECT=<project-id> (else inferred from SA JSON)
#   GOOGLE_CLOUD_REGION=us-central1
#
# Azure TTS:
#   TTS_PROVIDER=azure
#   AZURE_TTS_KEY=<key>
#   AZURE_TTS_ENDPOINT=<full endpoint like https://eastus.tts.speech.microsoft.com/cognitiveservices/v1>
#   (Optional fallback) AZURE_REGION=<region>  # used only if endpoint missing

import sys
import os
import json
import uuid
from io import BytesIO
from typing import Tuple

from pydub import AudioSegment

# -------- Vertex env --------
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_CLOUD_REGION = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")

# -------- Azure env --------
TTS_PROVIDER = os.environ.get("TTS_PROVIDER", "azure").lower()
AZURE_TTS_KEY = os.environ.get("AZURE_TTS_KEY", "")
AZURE_TTS_ENDPOINT = os.environ.get("AZURE_TTS_ENDPOINT", "")
AZURE_REGION = os.environ.get("AZURE_REGION", "")  # fallback only

if LLM_PROVIDER != "gemini":
    print("Error: LLM_PROVIDER must be 'gemini' for generate_podcast.py", file=sys.stderr)
    sys.exit(1)

if not GOOGLE_APPLICATION_CREDENTIALS:
    print("Error: GOOGLE_APPLICATION_CREDENTIALS not set", file=sys.stderr)
    sys.exit(1)

if TTS_PROVIDER != "azure":
    print("Error: TTS_PROVIDER must be 'azure' for generate_podcast.py", file=sys.stderr)
    sys.exit(1)

if not AZURE_TTS_KEY:
    print("Error: AZURE_TTS_KEY not set", file=sys.stderr)
    sys.exit(1)

def _read_project_from_sa(json_path: str) -> str:
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("project_id") or data.get("projectId") or ""
    except Exception:
        return ""

# ---- Vertex init (lazy) ----
_vertex_model = None

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

def generate_conversational_text(text: str) -> str:
    _init_vertex_if_needed()
    prompt = f"""
You are writing a short podcast script as a conversation between two people.

Input text:
{text}

Instructions:
1. Turn the input into a friendly, engaging two-person conversation (Host and Guest).
2. Keep it conversational and natural — like a podcast, not a formal lecture.
3. Limit the script length to around 150–180 words (enough for ~60–90 seconds of speech).
4. Clearly label each line with 'Host:' or 'Guest:'.
5. Do not add extra commentary or stage directions — just the spoken lines.
""".strip()

    try:
        resp = _vertex_model.generate_content(prompt)
        if hasattr(resp, "text") and resp.text:
            return resp.text.strip()
        # defensive fallback
        cands = getattr(resp, "candidates", None)
        if cands:
            content = getattr(cands[0], "content", None)
            parts = getattr(content, "parts", None) if content else None
            if parts and len(parts) > 0 and hasattr(parts[0], "text"):
                return parts[0].text.strip()
        return str(resp).strip()
    except Exception as e:
        raise RuntimeError(f"Vertex generation failed: {e}")

# ---- Azure TTS (SDK) ----
def _make_speech_config():
    import azure.cognitiveservices.speech as speechsdk
    # Prefer full endpoint if provided; fall back to region
    if AZURE_TTS_ENDPOINT:
        cfg = speechsdk.SpeechConfig(endpoint=AZURE_TTS_ENDPOINT, subscription=AZURE_TTS_KEY)
    else:
        if not AZURE_REGION:
            raise RuntimeError("AZURE_TTS_ENDPOINT not set; AZURE_REGION required as fallback")
        cfg = speechsdk.SpeechConfig(subscription=AZURE_TTS_KEY, region=AZURE_REGION)
    # Adjust defaults here if you want (rate/pitch/etc via SSML)
    return cfg

def synthesize_line(line: str, speaker: str, temp_file: str) -> str:
    import azure.cognitiveservices.speech as speechsdk

    speech_config = _make_speech_config()

    # Indian English voices
    voice = "en-IN-NeerjaNeural" if speaker == "Host" else "en-IN-PrabhatNeural"
    speech_config.speech_synthesis_voice_name = voice

    audio_config = speechsdk.audio.AudioConfig(filename=temp_file)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    # SSML; keep it simple and safe
    def _xml_escape(s: str) -> str:
        return (s.replace("&", "&amp;")
                 .replace("<", "&lt;")
                 .replace(">", "&gt;"))

    ssml = f"""
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-IN">
  <voice name="{voice}">
    <mstts:express-as style="chat">
      {_xml_escape(line)}
    </mstts:express-as>
  </voice>
</speak>
""".strip()

    result = synthesizer.speak_ssml_async(ssml).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError(f"TTS failed: {result.reason}")
    return temp_file

def synthesize_conversation(conv_text: str, filename: str) -> str:
    os.makedirs("public/audio", exist_ok=True)
    output_path = f"public/audio/{filename}"

    final_audio = AudioSegment.silent(duration=500)  # padding at start
    for i, line in enumerate(conv_text.splitlines()):
        if not line.strip():
            continue
        if line.startswith("Host:"):
            speaker, content = "Host", line[len("Host:"):].strip()
        elif line.startswith("Guest:"):
            speaker, content = "Guest", line[len("Guest:"):].strip()
        else:
            continue

        temp_file = f"temp_{i}.wav"
        synthesize_line(content, speaker, temp_file)
        final_audio += AudioSegment.from_wav(temp_file) + AudioSegment.silent(duration=300)
        try:
            os.remove(temp_file)
        except Exception:
            pass

    # Export to MP3 (uses ffmpeg in your image)
    final_audio.export(output_path, format="mp3")
    return output_path

if __name__ == "__main__":
    try:
        try:
            sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
            sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

        input_text = sys.stdin.read().strip()
        if not input_text:
            print("Error: Empty text", file=sys.stderr)
            sys.exit(1)

        conv_text = generate_conversational_text(input_text)
        filename = f"{uuid.uuid4().hex}.mp3"
        audio_path = synthesize_conversation(conv_text, filename)

        # Your Next route expects a relative public URL
        print(f"/audio/{filename}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
