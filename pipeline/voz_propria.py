"""Narração com a voz do próprio criador: a gravação entra sem edição (só muda o formato) e o tempo de cada palavra
vem do roteiro alinhado ao Whisper. Se a gravação fugir muito do roteiro, a legenda usa as palavras que o Whisper ouviu.

Uso: python pipeline/voz_propria.py <pasta> <arquivo de áudio>
Escreve narracao.wav, palavras.json, frases.json, narracao.falado.txt, voz.json
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from narrar_projeto import MARCACAO, alinhar, frases_de, transcrever  # noqa: E402


def main(pasta, arquivo):
    pasta = Path(pasta)
    # só converte para wav 48 kHz mono: sem normalizar, sem cortar, sem filtro
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(arquivo), "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", str(pasta / "narracao.wav")],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"não consegui ler o áudio: {r.stderr[-300:]}")
    print("marcando o tempo de cada palavra...", flush=True)
    whisper = transcrever(pasta / "narracao.wav")
    roteiro = (pasta / "narracao.txt").read_text(encoding="utf-8") if (pasta / "narracao.txt").exists() else ""
    falado = re.sub(r"\s+", " ", MARCACAO.sub("", roteiro)).strip()
    fonte = "roteiro"
    if falado:
        palavras, cobertura = alinhar(falado.split(), whisper)
    else:
        palavras, cobertura = [], 0.0
    if cobertura < 0.85:  # gravou diferente do roteiro: usa o que foi dito de verdade
        ws = whisper.get("words") or [w for s in whisper.get("segments", []) for w in s.get("words", [])]
        palavras = [{"palavra": w["word"].strip(), "inicio": round(w["start"], 2), "fim": round(w["end"], 2)} for w in ws if w["word"].strip()]
        falado = " ".join(p["palavra"] for p in palavras)
        fonte = "whisper"
    frases = frases_de(palavras)
    for i, f in enumerate(frases):
        f["id"] = f"f{i + 1:02d}"
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
                                str(pasta / "narracao.wav")], capture_output=True, text=True).stdout.strip())
    (pasta / "palavras.json").write_text(json.dumps(palavras, ensure_ascii=False, indent=1), encoding="utf-8")
    (pasta / "frases.json").write_text(json.dumps(frases, ensure_ascii=False, indent=1), encoding="utf-8")
    (pasta / "narracao.falado.txt").write_text(falado, encoding="utf-8")
    (pasta / "voz.json").write_text(json.dumps({
        "provedor": "gravacao-do-criador", "audio": "narracao.wav", "duracao": round(dur, 2), "palavras": len(palavras),
        "frases": len(frases), "modo": "gravacao", "legendaDe": fonte, "coberturaTempos": round(cobertura, 3),
        "ouvidoPeloWhisper": whisper.get("text", ""), "arquivoOriginal": Path(arquivo).name,
        "geradoEm": datetime.now(timezone.utc).isoformat()}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"ok {dur:.1f}s, {len(frases)} frases, legenda pelo {fonte} ({cobertura:.0%} do roteiro reconhecido)", flush=True)


if __name__ == "__main__":
    try:
        main(sys.argv[1], sys.argv[2])
    except Exception as e:  # noqa: BLE001
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
