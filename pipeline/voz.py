"""Etapa de narração: gera uma fala via API local do VoiceStudio.

Uso:
  python pipeline/voz.py --texto "Olha isso!" --saida out.wav --motor voxcpm2 \
      --descricao "homem adulto, sotaque baiano, animado" --seed 42
  python pipeline/voz.py --texto "..." --saida out.wav --motor omnivoice --voz <profile_id>
"""
import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request

API = "http://localhost:3900"
# VoxCPM2: 10 passos (escolhido de ouvido em 2026-11-22; 30 passos era 2x mais lento sem ganho claro)
PASSOS_VOXCPM2 = 10


def aplicar_pronuncia(texto, mapa=None):
    """Troca palavras pela grafia que faz a voz pronunciar certo (só no texto falado; a legenda usa o original)."""
    import re
    for palavra, falada in (mapa or {}).items():
        texto = re.sub(r"\b" + re.escape(palavra) + r"\b", falada, texto)
    return texto


def gerar_fala(texto, saida, motor="voxcpm2", voz=None, descricao=None,
               instrucao=None, idioma="pt", seed=None, velocidade=1.0, passos=None, guidance=None, api=API):
    if motor == "voicebox":  # Voicebox (Qwen CustomVoice/Qwen3-TTS), API própria
        from voicebox import gerar
        d, _ = gerar(texto, saida, voz, instruct=instrucao, seed=seed)
        return d
    corpo = {
        "model": motor,
        "input": texto,
        "response_format": "wav",
        "language": idioma,
        "speed": velocidade,
    }
    if voz:
        corpo["voice"] = voz
    if descricao:
        corpo["description"] = descricao
    if instrucao:
        corpo["instruct"] = instrucao
    if seed is not None:
        corpo["seed"] = seed
    if passos is None and motor == "voxcpm2":
        passos = PASSOS_VOXCPM2
    if passos is not None:
        corpo["num_step"] = passos
    if guidance is not None:
        corpo["guidance_scale"] = guidance

    req = urllib.request.Request(
        f"{api}/v1/audio/speech",
        data=json.dumps(corpo).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    for tentativa in range(3):  # o sidecar do VoxCPM2 às vezes cai na 1a geração depois de carregar; tenta de novo
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                dados = r.read()
                tipo = r.headers.get("Content-Type", "")
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:500]
            if tentativa < 2 and ("sidecar" in msg or e.code >= 500):
                import time
                time.sleep(4)
                req = urllib.request.Request(req.full_url, data=req.data, headers=dict(req.header_items()), method="POST")
                continue
            raise RuntimeError(f"VoiceStudio {e.code}: {msg}")

    if "json" in tipo or dados[:1] == b"{":
        raise RuntimeError(f"Resposta não é áudio: {dados[:500]!r}")
    with open(saida, "wb") as f:
        f.write(dados)
    return duracao(saida)


def duracao(caminho):
    """Confere com ffprobe que o arquivo é áudio válido e devolve a duração em segundos."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", caminho],
        capture_output=True, text=True,
    )
    if out.returncode != 0 or not out.stdout.strip():
        raise RuntimeError(f"Arquivo inválido: {caminho}: {out.stderr.strip()}")
    return float(out.stdout.strip())


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--texto", required=True)
    p.add_argument("--saida", required=True)
    p.add_argument("--motor", default="voxcpm2")
    p.add_argument("--voz")
    p.add_argument("--descricao")
    p.add_argument("--instrucao")
    p.add_argument("--idioma", default="pt")
    p.add_argument("--seed", type=int)
    p.add_argument("--velocidade", type=float, default=1.0)
    p.add_argument("--passos", type=int, help="mais passos = mais natural, mais lento")
    p.add_argument("--guidance", type=float, help="menor = menos rígido")
    a = p.parse_args()
    try:
        d = gerar_fala(a.texto, a.saida, a.motor, a.voz, a.descricao,
                       a.instrucao, a.idioma, a.seed, a.velocidade, a.passos, a.guidance)
    except RuntimeError as e:
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"ok {a.saida} {d:.2f}s")
