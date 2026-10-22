#!/usr/bin/env python3
"""Local Whisper ASR via faster-whisper — replaces the `bl speech recognize`
cloud call (spec 006 fallback). Runs fully offline; reads no secrets and needs
no API key, so it works inside the credential-free systemd service env.

Usage: whisper_transcribe.py <audio.wav> <transcript.json> [language]

Environment (all optional):
  REXI_WHISPER_MODEL    faster-whisper model size (default: small)
  REXI_WHISPER_DEVICE   cpu | cuda (default: cpu)
  REXI_WHISPER_COMPUTE  int8 | float16 (default: int8)

The audio is decoded with the stdlib `wave` module + numpy and passed to
faster-whisper as a float32 array, deliberately bypassing PyAV's av.open (PyAV
>= 19 dropped the `metadata_errors` kwarg that faster-whisper 1.2.x still
passes — decoding here sidesteps that incompatibility).
"""
import json
import os
import sys
import wave

import numpy as np
from faster_whisper import WhisperModel


def read_pcm_mono_wav(path):
    with wave.open(path, "rb") as w:
        if w.getnchannels() != 1:
            raise ValueError(f"expected mono WAV, got {w.getnchannels()}ch")
        if w.getsampwidth() != 2:
            raise ValueError(f"expected 16-bit WAV, got {w.getsampwidth() * 8}-bit")
        frames = w.readframes(w.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0


def main(argv):
    if len(argv) < 3:
        print("usage: whisper_transcribe.py <audio.wav> <transcript.json> [language]", file=sys.stderr)
        return 2
    audio_path, out_path = argv[1], argv[2]
    language = argv[3] if len(argv) > 3 else None

    model_name = os.environ.get("REXI_WHISPER_MODEL", "small")
    device = os.environ.get("REXI_WHISPER_DEVICE", "cpu")
    compute = os.environ.get("REXI_WHISPER_COMPUTE", "int8")

    audio = read_pcm_mono_wav(audio_path)
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, info = model.transcribe(audio, language=language)

    result = {
        "language": info.language,
        "segments": [
            {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
            for s in segments
        ],
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
