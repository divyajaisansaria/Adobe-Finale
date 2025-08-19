# python/generate_podcast.py
# Vertex (Gemini) + Azure TTS
# Writes a single MP3 to public/audio/<uuid>.mp3 and prints "/audio/<uuid>.mp3"

import sys
import os
import json
import uuid
import time
from typing import List, Tuple

# pydub requires ffmpeg in PATH
from pydub import AudioSegment
from pydub.utils import which
AudioSegment.converter = which("ffmpeg") or "ffmpeg"  # ensure pydub finds ffmpeg

# -------- Vertex env --------
LLM_PROVIDER = (os.environ.get("LLM_PROVIDER") or "gemini").lower()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_CLOUD_REGION = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")

# -------- Azure env --------
TTS_PROVIDER = (os.environ.get("TTS_PROVIDER") or "azure").lower()
AZURE_TTS_KEY = os.environ.get("AZURE_TTS_KEY", "")
AZURE_TTS_ENDPOINT = os.environ.get("AZURE_TTS_ENDPOINT", "")
AZURE_REGION = os.environ.get("AZURE_REGION", "")  # fallback if endpoint missing

def _read_project_from_sa(json_path: str) -> str:
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("project_id") or data.get("projectId") or ""
    except Exception:
        return ""

_vertex_model = None
def _init_vertex_if_needed():
    global _vertex_model
    if _vertex_model is not None:
        return
    if LLM_PROVIDER != "gemini":
        raise RuntimeError("LLM_PROVIDER must be 'gemini'")
    if not GOOGLE_APPLICATION_CREDENTIALS:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS not set")

    from vertexai import init as vertex_init
    from vertexai.generative_models import GenerativeModel

    project = GOOGLE_CLOUD_PROJECT or _read_project_from_sa(GOOGLE_APPLICATION_CREDENTIALS)
    if project:
        vertex_init(project=project, location=GOOGLE_CLOUD_REGION)
    else:
        vertex_init(location=GOOGLE_CLOUD_REGION)

    _vertex_model = GenerativeModel(GEMINI_MODEL)

def _gen_conversation(seed_text: str, title: str = "", topic: str = "", max_turns: int = 6) -> List[Tuple[str, str]]:
    _init_vertex_if_needed()
    prompt = f"""
You are writing a short podcast script as a conversation between two people (Host and Guest).

Optional title: {title or "(none)"}
Optional topic: {topic or "(none)"}

Input text:
{seed_text}

Instructions:
1) Produce about {max_turns} short lines total, alternating "Host:" and "Guest:".
2) Keep it natural and friendly; no stage directions.
3) English only. Output strictly as lines beginning with "Host:" or "Guest:".
""".strip()

    resp = _vertex_model.generate_content(prompt)
    text = getattr(resp, "text", None) or str(resp)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    out: List[Tuple[str, str]] = []
    for ln in lines:
        if ln.startswith("Host:"):
            out.append(("Host", ln[len("Host:"):].strip()))
        elif ln.startswith("Guest:"):
            out.append(("Guest", ln[len("Guest:"):].strip()))
    if not out:
        # minimal fallback
        out = [("Host", "Welcome to our show."), ("Guest", "Great to be here!")]
    # Trim to max_turns if too long
    return out[:max_turns] if max_turns > 0 else out

def _make_speech_config():
    import azure.cognitiveservices.speech as speechsdk
    # Prefer region (most reliable), then fall back to full endpoint
    if os.environ.get("AZURE_REGION"):
        cfg = speechsdk.SpeechConfig(
            subscription=os.environ["AZURE_TTS_KEY"],
            region=os.environ["AZURE_REGION"]
        )
        print(f"[TTS] Using region: {os.environ['AZURE_REGION']}", flush=True)
    elif os.environ.get("AZURE_TTS_ENDPOINT"):
        cfg = speechsdk.SpeechConfig(
            endpoint=os.environ["AZURE_TTS_ENDPOINT"],
            subscription=os.environ["AZURE_TTS_KEY"]
        )
        print(f"[TTS] Using endpoint: {os.environ['AZURE_TTS_ENDPOINT']}", flush=True)
    else:
        raise RuntimeError("Azure config missing: set AZURE_REGION or AZURE_TTS_ENDPOINT")
    return cfg

def _xml_escape(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

def _synthesize_line(speaker: str, text: str, out_wav: str):
    import azure.cognitiveservices.speech as speechsdk
    cfg = _make_speech_config()

    voice = "en-IN-NeerjaNeural" if speaker == "Host" else "en-IN-PrabhatNeural"
    cfg.speech_synthesis_voice_name = voice

    audio = speechsdk.audio.AudioConfig(filename=out_wav)
    synth = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=audio)

    def _xml_escape(s: str) -> str:
        return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

    ssml = f"""
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-IN">
  <voice name="{voice}">
    <mstts:express-as style="chat">{_xml_escape(text)}</mstts:express-as>
  </voice>
</speak>
""".strip()

    result = synth.speak_ssml_async(ssml).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        # ← This shows the REAL cause (auth, connection, quota, invalid voice, etc.)
        details = speechsdk.CancellationDetails.from_result(result)
        raise RuntimeError(
            f"TTS canceled: reason={details.reason}, code={getattr(details,'error_code',None)}, "
            f"error='{getattr(details,'error_details',None)}'"
        )

def _concat_and_export(wavs: List[str], mp3_path: str):
    final = AudioSegment.silent(duration=400)  # slight lead-in
    for i, w in enumerate(wavs):
        seg = AudioSegment.from_wav(w)
        final += seg + AudioSegment.silent(duration=280)  # breathing room
    final.export(mp3_path, format="mp3")

def main():
    try:
        try:
            sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
            sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

        seed = sys.stdin.read().strip()
        if not seed:
            print("Error: Empty text", file=sys.stderr)
            sys.exit(1)

        # Optional CLI args from the route
        import argparse
        ap = argparse.ArgumentParser()
        ap.add_argument("--host-voice", default=os.environ.get("HOST_VOICE", "en-IN-NeerjaNeural"))
        ap.add_argument("--guest-voice", default=os.environ.get("GUEST_VOICE", "en-IN-PrabhatNeural"))
        ap.add_argument("--title", default="")
        ap.add_argument("--topic", default="")
        ap.add_argument("--max-turns", type=int, default=6)
        args = ap.parse_args()

        # Generate conversation
        conv = _gen_conversation(seed, args.title, args.topic, args.max_turns)

        # Synthesize to temp WAVs
        os.makedirs("public/audio", exist_ok=True)
        wavs: List[str] = []
        try:
          for i, (speaker, text) in enumerate(conv):
              tmp = f"pod_{uuid.uuid4().hex}_{i}.wav"
              _synthesize_line(speaker, text, tmp)
              wavs.append(tmp)

          # Export single MP3 into public/audio/
          out_name = f"{uuid.uuid4().hex}.mp3"
          out_path = os.path.join("public", "audio", out_name)
          _concat_and_export(wavs, out_path)

        finally:
          # Cleanup wavs
          for w in wavs:
              try: os.remove(w)
              except Exception: pass

        # Print the public-relative URL (what the API expects)
        print(f"/audio/{out_name}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
