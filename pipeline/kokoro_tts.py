"""Teste do Kokoro (Apache-2.0) em PT-BR via kokoro-onnx.
Uso: ~/.venvs/kokoro/Scripts/python pipeline/kokoro_tts.py "texto" saida.wav --voz pm_alex --vel 0.9
"""
import argparse
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

MODELO = str(Path.home() / "tools" / "kokoro" / "kokoro-v1.0.onnx")
VOZES = str(Path.home() / "tools" / "kokoro" / "voices-v1.0.bin")

ap = argparse.ArgumentParser()
ap.add_argument("texto"); ap.add_argument("saida")
ap.add_argument("--voz", default="pm_alex"); ap.add_argument("--vel", type=float, default=1.0)
a = ap.parse_args()
k = Kokoro(MODELO, VOZES)
audio, sr = k.create(a.texto, voice=a.voz, speed=a.vel, lang="pt-br")
sf.write(a.saida, audio, sr)
print(f"ok {a.saida} {len(audio)/sr:.2f}s")
