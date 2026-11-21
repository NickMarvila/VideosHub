"""Narração frase a frase: cada frase é gerada separada (entonação própria) e depois tudo
é juntado com pausas naturais e volume normalizado.

Uso:
  python pipeline/narrar.py roteiro.txt saida.wav --descricao "..." --seed 7
  python pipeline/narrar.py roteiro.txt saida.wav --voz <profile_id>
O roteiro tem uma frase por linha. Linha vazia = pausa longa.
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from voz import gerar_fala  # noqa: E402

PAUSA_FRASE = 0.35
PAUSA_PERGUNTA = 0.55
PAUSA_RETICENCIAS = 0.6
PAUSA_LINHA_VAZIA = 0.9


def pausa_depois(frase):
    f = frase.rstrip()
    if f.endswith("..."):
        return PAUSA_RETICENCIAS
    if f.endswith("?"):
        return PAUSA_PERGUNTA
    return PAUSA_FRASE


def ffmpeg(*args):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[-600:])


def aparar(entrada, saida):
    """Corta o silêncio do início e do fim, para as pausas ficarem sob nosso controle."""
    filtro = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
              "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse")
    ffmpeg("-i", str(entrada), "-af", filtro, "-ar", "48000", "-ac", "1", str(saida))


def narrar(linhas, saida, **voz):
    tmp = Path(tempfile.mkdtemp(prefix="narrar_"))
    partes = []  # (arquivo, pausa depois)
    for i, linha in enumerate(linhas):
        if not linha.strip():
            if partes:
                partes[-1] = (partes[-1][0], PAUSA_LINHA_VAZIA)
            continue
        bruto = tmp / f"{i:03d}_bruto.wav"
        limpo = tmp / f"{i:03d}.wav"
        gerar_fala(linha.strip(), str(bruto), **voz)
        aparar(bruto, limpo)
        partes.append((limpo, pausa_depois(linha)))
        print(f"  frase {len(partes)} ok", flush=True)

    entradas, filtro = [], []
    for j, (arq, pausa) in enumerate(partes):
        entradas += ["-i", str(arq)]
        ultima = j == len(partes) - 1
        filtro.append(f"[{j}]apad=pad_dur={0 if ultima else pausa}[p{j}]")
    juncao = "".join(f"[p{j}]" for j in range(len(partes)))
    filtro.append(f"{juncao}concat=n={len(partes)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]")
    ffmpeg(*entradas, "-filter_complex", ";".join(filtro), "-map", "[out]", "-ar", "48000", str(saida))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("saida")
    ap.add_argument("--motor", default="voxcpm2")
    ap.add_argument("--voz")
    ap.add_argument("--descricao")
    ap.add_argument("--seed", type=int)
    ap.add_argument("--passos", type=int, default=30)
    ap.add_argument("--guidance", type=float, default=1.6)
    a = ap.parse_args()
    linhas = Path(a.roteiro).read_text(encoding="utf-8").splitlines()
    narrar(linhas, a.saida, motor=a.motor, voz=a.voz, descricao=a.descricao, seed=a.seed,
           passos=a.passos, guidance=a.guidance)
    print(f"ok {a.saida}")
