"""Acabamento: junta o vídeo renderizado com a trilha (trilha/mix.wav) e roda a checagem de qualidade.

- Vídeo: copia o H.264 do render (sem recomprimir). Áudio: AAC 192k da mixagem.
- QA: trechos congelados >= 0,4 s, quadros pretos, loudness integrado e pico, e uma folha com um quadro a cada 2 s.
Saída: render/final.mp4, render/qa.json, render/qa_folha.jpg

Uso: python pipeline/finalizar.py <pasta>
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def rodar(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def finalizar(pasta):
    pasta = Path(pasta)
    video = pasta / "render" / "video.mp4"
    mix = pasta / "trilha" / "mix.wav"
    final = pasta / "render" / "final.mp4"
    if not video.exists():
        raise RuntimeError("falta render/video.mp4")
    audio = mix if mix.exists() else pasta / "narracao.wav"
    r = rodar(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0",
               "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)])
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-500:])
    print("vídeo final montado; checando qualidade...", flush=True)

    det = rodar(["ffmpeg", "-hide_banner", "-i", str(final), "-vf", "freezedetect=n=-60dB:d=0.4,blackdetect=d=0.1:pix_th=0.06",
                 "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    congelados = [{"de": float(a), "ate": float(b)} for a, b in re.findall(r"freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)", det)]
    pretos = [{"de": float(a), "ate": float(b)} for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", det)]
    resumo = det[det.rfind("Summary:"):] if "Summary:" in det else ""
    lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", resumo)
    pico = re.search(r"Peak:\s+(-?[\d.]+) dBFS", resumo)
    dur = float(rodar(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(final)]).stdout.strip())

    folha = pasta / "render" / "qa_folha.jpg"
    n = max(1, int(dur // 2))
    cols = 8
    rodar(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-vf", f"fps=1/2,scale=180:320,tile={cols}x{(n + cols - 1) // cols}",
           "-frames:v", "1", "-q:v", "4", str(folha)])

    problemas = []
    if congelados:
        problemas.append(f"{len(congelados)} trecho(s) com a imagem parada por 0,4 s ou mais")
    if pretos:
        problemas.append(f"{len(pretos)} trecho(s) de tela preta")
    if lufs and abs(float(lufs.group(1)) + 14) > 1.5:
        problemas.append(f"volume final {lufs.group(1)} LUFS (o alvo é -14)")
    qa = {"duracao": round(dur, 2), "lufs": float(lufs.group(1)) if lufs else None, "pico_dBFS": float(pico.group(1)) if pico else None,
          "congelados": congelados, "pretos": pretos, "problemas": problemas, "comTrilha": mix.exists()}
    (pasta / "render" / "qa.json").write_text(json.dumps(qa, ensure_ascii=False, indent=1), encoding="utf-8")
    print(("QA: " + "; ".join(problemas)) if problemas else f"QA ok: {qa['lufs']} LUFS, pico {qa['pico_dBFS']} dBFS, sem imagem congelada nem tela preta", flush=True)
    return qa


if __name__ == "__main__":
    try:
        finalizar(sys.argv[1])
    except Exception as e:  # noqa: BLE001
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
