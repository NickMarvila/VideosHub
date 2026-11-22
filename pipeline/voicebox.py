"""Cliente do Voicebox (github.com/jamiepine/voicebox, MIT), API local em http://127.0.0.1:17493.

gerar(texto, saida, perfil, engine="qwen_custom_voice", instruct=None, seed=None) -> duração em segundos
Os modelos Qwen3-TTS (Apache-2.0) e Chatterbox (MIT) permitem uso comercial.
"""
import json
import subprocess
import time
import urllib.request

API = "http://127.0.0.1:17493"


def _req(metodo, url, corpo=None, timeout=600):
    r = urllib.request.Request(API + url, data=json.dumps(corpo).encode("utf-8") if corpo is not None else None,
                               headers={"Content-Type": "application/json"}, method=metodo)
    return urllib.request.urlopen(r, timeout=timeout)


def gerar(texto, saida, perfil, engine="qwen_custom_voice", instruct=None, seed=None, idioma="pt", limite=600):
    corpo = {"profile_id": perfil, "text": texto, "language": idioma, "engine": engine, "normalize": True}
    if instruct:
        corpo["instruct"] = instruct
    if seed is not None:
        corpo["seed"] = int(seed)
    g = json.loads(_req("POST", "/generate", corpo).read())
    gid, t0 = g["id"], time.time()
    while True:
        h = json.loads(_req("GET", f"/history/{gid}").read())
        if h.get("status") in ("completed", "done", "ready") or (h.get("audio_path") and h.get("duration")):
            break
        if h.get("status") in ("failed", "error", "cancelled"):
            raise RuntimeError(f"Voicebox: {h.get('error') or h.get('status')}")
        if time.time() - t0 > limite:
            raise RuntimeError("Voicebox: passou do tempo limite")
        time.sleep(1.5)
    dados = _req("GET", f"/audio/{gid}").read()
    bruto = saida + ".tmp"
    with open(bruto, "wb") as f:
        f.write(dados)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", bruto, "-ar", "48000", "-ac", "1", saida], check=True)
    import os
    os.remove(bruto)
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", saida],
                         capture_output=True, text=True).stdout.strip()
    return float(out), round(time.time() - t0, 1)
