"""Gera a narração de um projeto: voz (VoiceStudio) + volume + tempo de cada palavra (Whisper).

Lê <pasta>/narracao.txt e escreve na mesma pasta, no formato do Kit 3D:
  narracao.wav, palavras.json, frases.json, voz.json, narracao.falado.txt

Uso:
  python pipeline/narrar_projeto.py <pasta> [--voz 2f02b91b] [--motor omnivoice] [--velocidade 0.82]
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from voz import API, gerar_fala  # noqa: E402

VOZ_PADRAO = "2f02b91b"  # Narrador Contador
MOTOR_PADRAO = "omnivoice"
VELOCIDADE_PADRAO = 0.82
# marcações de emoção do OmniVoice: vão para a voz, mas não para a legenda
MARCACAO = re.compile(r"\[(?:laughter|sigh|breath|cough|gasp)\]\s*", re.I)
# grafias que o Whisper costuma trocar → como estão no roteiro
APELIDOS = {"thales": "tales", "tails": "tales", "paraty": "parati"}


def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]", "", s)
    return APELIDOS.get(s, s)


def ffmpeg(*args):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[-600:])


def transcrever(wav):
    """POST multipart para o Whisper do VoiceStudio, com tempo por palavra."""
    limite = uuid.uuid4().hex
    partes = []
    for nome, valor in (("model", "whisper"), ("language", "pt"), ("response_format", "verbose_json"),
                        ("timestamp_granularities[]", "word")):
        partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{nome}"\r\n\r\n{valor}\r\n'.encode())
    partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="file"; filename="a.wav"\r\n'
                  f'Content-Type: audio/wav\r\n\r\n'.encode() + Path(wav).read_bytes() + b"\r\n")
    partes.append(f"--{limite}--\r\n".encode())
    req = urllib.request.Request(f"{API}/v1/audio/transcriptions", data=b"".join(partes), method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={limite}"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read().decode("utf-8"))


def alinhar(roteiro_palavras, whisper):
    """Dá a cada palavra do roteiro o tempo da palavra correspondente do Whisper (mantém a grafia do roteiro)."""
    ws = whisper.get("words") or [w for s in whisper.get("segments", []) for w in s.get("words", [])]
    a = [norm(w["word"]) for w in ws]
    b = [norm(t) for t in roteiro_palavras]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    tempos = [None] * len(roteiro_palavras)
    casadas = 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            casadas += j2 - j1
        if tag in ("equal", "replace") and i2 > i1:
            for k in range(j2 - j1):
                w = ws[min(i1 + round(k * (i2 - i1) / max(1, j2 - j1)), i2 - 1)]
                tempos[j1 + k] = (w["start"], w["end"])
    for j, t in enumerate(tempos):  # buracos: encaixa entre a anterior e a próxima
        if t is None:
            ant = next((tempos[k] for k in range(j - 1, -1, -1) if tempos[k]), (0, 0))
            prox = next((tempos[k] for k in range(j + 1, len(tempos)) if tempos[k]), (ant[1] + 0.3,) * 2)
            tempos[j] = (ant[1], max(ant[1] + 0.05, min(prox[0], ant[1] + 0.35)))
    pal = []
    for t, (s, e) in zip(roteiro_palavras, tempos):
        ini = max(s, pal[-1]["fim"]) if pal and s < pal[-1]["inicio"] else s
        pal.append({"palavra": t, "inicio": round(ini, 2), "fim": round(max(e, ini + 0.05), 2)})
    return pal, casadas / max(1, len(roteiro_palavras))


def frases_de(palavras):
    """Mesma regra do Kit 3D (tools/voz/gerar.mjs: frasesDePalavras)."""
    frases, atual = [], []
    for w in palavras:
        atual.append(w)
        if re.search(r"[.!?…]+[\"”')\]]*$", w["palavra"]):
            frases.append(atual)
            atual = []
    if atual:
        frases.append(atual)
    return [{"n": i + 1, "texto": " ".join(w["palavra"] for w in ws), "inicio": ws[0]["inicio"], "fim": ws[-1]["fim"]}
            for i, ws in enumerate(frases)]


def narrar_projeto(pasta, voz=VOZ_PADRAO, motor=MOTOR_PADRAO, velocidade=VELOCIDADE_PADRAO):
    pasta = Path(pasta)
    texto = (pasta / "narracao.txt").read_text(encoding="utf-8").strip()
    if not texto:
        raise RuntimeError("narracao.txt está vazio")
    t0 = time.time()
    bruto = pasta / "narracao_bruta.wav"
    print("gerando a voz (uma gravação só)...", flush=True)
    gerar_fala(texto, str(bruto), motor=motor, voz=voz, velocidade=velocidade)
    ffmpeg("-i", str(bruto), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1", str(pasta / "narracao.wav"))
    bruto.unlink(missing_ok=True)
    print("marcando o tempo de cada palavra...", flush=True)
    whisper = transcrever(pasta / "narracao.wav")
    falado = re.sub(r"\s+", " ", MARCACAO.sub("", texto)).strip()
    palavras, cobertura = alinhar(falado.split(), whisper)
    frases = frases_de(palavras)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                "default=nw=1:nk=1", str(pasta / "narracao.wav")],
                               capture_output=True, text=True).stdout.strip())
    (pasta / "palavras.json").write_text(json.dumps(palavras, ensure_ascii=False, indent=1), encoding="utf-8")
    (pasta / "frases.json").write_text(json.dumps(frases, ensure_ascii=False, indent=1), encoding="utf-8")
    (pasta / "narracao.falado.txt").write_text(falado, encoding="utf-8")
    info = {"provedor": f"voicestudio-{motor}", "audio": "narracao.wav", "duracao": round(dur, 2),
            "palavras": len(palavras), "frases": len(frases), "voz": voz, "velocidade": velocidade,
            "coberturaTempos": round(cobertura, 3), "ouvidoPeloWhisper": whisper.get("text", ""),
            "tempoSintese": round(time.time() - t0, 1), "geradoEm": datetime.now(timezone.utc).isoformat()}
    (pasta / "voz.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"ok {dur:.1f}s, {len(frases)} frases, cobertura {cobertura:.2f}", flush=True)
    return info


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pasta")
    ap.add_argument("--voz", default=VOZ_PADRAO)
    ap.add_argument("--motor", default=MOTOR_PADRAO)
    ap.add_argument("--velocidade", type=float, default=VELOCIDADE_PADRAO)
    a = ap.parse_args()
    try:
        narrar_projeto(a.pasta, a.voz, a.motor, a.velocidade)
    except Exception as e:  # noqa: BLE001
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
