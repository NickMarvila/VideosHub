"""Etapa de sync: a partir de um .wav gera
  - bocas (visemas do Rhubarb: A B C D E F G H X) com tempos
  - palavras (Whisper via VoiceStudio) com tempos, para a legenda palavra a palavra

Uso:
  python pipeline/sync.py audio.wav saida.json
"""
import argparse
import json
import os
import subprocess
import urllib.request
import uuid
from pathlib import Path

RHUBARB = os.environ.get("RHUBARB") or str(Path.home() / "tools" / "Rhubarb-Lip-Sync-1.14.0-Windows" / "rhubarb.exe")
API = "http://localhost:3900"


def bocas(wav):
    # Modo "phonetic": independe de idioma. O parâmetro de diálogo (-d) só ajuda no reconhecedor em inglês, por isso não é usado.
    destino = Path(wav).with_suffix(".rhubarb.json")
    cmd = [RHUBARB, "-f", "json", "--extendedShapes", "GHX", "-r", "phonetic", "-o", str(destino), str(wav)]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0 or not destino.exists():
        raise RuntimeError(f"Rhubarb falhou: {out.stderr.strip()[-500:]}")
    dados = json.loads(destino.read_text(encoding="utf-8"))
    destino.unlink()
    return [{"inicio": c["start"], "fim": c["end"], "boca": c["value"]} for c in dados["mouthCues"]]


def palavras(wav, idioma="pt"):
    limite = uuid.uuid4().hex
    partes = []
    for nome, valor in [("model", "whisper-1"), ("language", idioma), ("response_format", "verbose_json"),
                        ("timestamp_granularities[]", "word")]:
        partes.append(f"--{limite}\r\nContent-Disposition: form-data; name=\"{nome}\"\r\n\r\n{valor}\r\n".encode())
    partes.append(f"--{limite}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.wav\"\r\n"
                  f"Content-Type: audio/wav\r\n\r\n".encode() + Path(wav).read_bytes() + b"\r\n")
    partes.append(f"--{limite}--\r\n".encode())
    req = urllib.request.Request(f"{API}/v1/audio/transcriptions", data=b"".join(partes),
                                 headers={"Content-Type": f"multipart/form-data; boundary={limite}"})
    with urllib.request.urlopen(req, timeout=600) as r:
        d = json.loads(r.read())
    return d.get("text", "").strip(), [{"palavra": w["word"].strip(), "inicio": w["start"], "fim": w["end"]}
                                       for w in d.get("words", [])]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("wav")
    ap.add_argument("saida")
    a = ap.parse_args()
    texto, pal = palavras(a.wav)
    resultado = {"texto": texto, "palavras": pal, "bocas": bocas(a.wav)}
    Path(a.saida).write_text(json.dumps(resultado, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok {a.saida}: {len(pal)} palavras, {len(resultado['bocas'])} bocas")
