"""Módulo de Trilha Sonora, Efeitos Sonoros (SFX) e Auto-Ducking para o VideosHub.

Funcionalidades:
1. Síntese procedural de efeitos sonoros com NumPy e SciPy (whoosh, thunk, ting, pop, alerta, risada).
2. Auto-ducking profissional com FFmpeg sidechain: diminui o volume da trilha musical automaticamente
   enquanto a voz do narrador fala e sobe suavemente nas pausas.
3. Masterização final no padrão broadcast para Shorts/Reels/TikTok (-15 LUFS, -1.0 dBTP).

Uso:
  python pipeline/som.py sfx <pasta_do_video>                     Gera efeitos sonoros sincronizados
  python pipeline/som.py mixar <pasta_do_video> [--musica arq]    Aplica trilha + ducking + voz -> narracao_mix.wav
"""
import argparse
import json
import os
import subprocess
import sys
import wave
from pathlib import Path
import numpy as np
from scipy import signal

SR = 48000


def salvar_wav(caminho, audio_arr, sr=SR):
    audio_arr = np.clip(audio_arr, -1.0, 1.0)
    data = (audio_arr * 32767).astype(np.int16)
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(caminho), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(data.tobytes())


# ----------------- Síntese Procedural de SFX -----------------
def sfx_whoosh(dur=0.35):
    """Transição rápida de câmera ou virada de cena."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    ruido = np.random.normal(0, 1, n)
    sos = signal.butter(4, [400, 2800], btype="bandpass", fs=SR, output="sos")
    filtrado = signal.sosfilt(sos, ruido)
    env = np.sin(np.pi * (t / dur)) ** 2
    return filtrado * env * 0.7


def sfx_thunk(dur=0.22):
    """Impacto seco, objeto caindo, carimbo ou destaque."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    freq = 160 * np.exp(-t * 18) + 45
    fase = 2 * np.pi * np.cumsum(freq) / SR
    onda = np.sin(fase)
    ruido = signal.sosfilt(signal.butter(2, 600, btype="lowpass", fs=SR, output="sos"), np.random.normal(0, 1, n))
    mix = onda * 0.75 + ruido * 0.35
    env = np.exp(-t * 22)
    return mix * env * 0.85


def sfx_ting(dur=0.45):
    """Sino, moeda, acerto ou momento eureka."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    f0 = 2400.0
    onda = (np.sin(2 * np.pi * f0 * t) * 0.6 +
            np.sin(2 * np.pi * f0 * 2.3 * t) * 0.25 +
            np.sin(2 * np.pi * f0 * 4.1 * t) * 0.15)
    env = np.exp(-t * 8.5)
    return onda * env * 0.6


def sfx_pop(dur=0.12):
    """Aparecimento de balão, etiqueta ou elemento."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    freq = 300 + 1200 * np.sin(np.pi * (t / dur))
    fase = 2 * np.pi * np.cumsum(freq) / SR
    onda = np.sin(fase)
    env = np.sin(np.pi * (t / dur)) ** 1.5
    return onda * env * 0.7


def sfx_alerta(dur=0.3):
    """Tom cômico de aviso / perigo."""
    n = int(dur * SR)
    t = np.linspace(0, dur, n, endpoint=False)
    onda = np.sin(2 * np.pi * 880 * t) * 0.5 + np.sin(2 * np.pi * 1760 * t) * 0.3
    env = np.exp(-t * 7)
    return onda * env * 0.65


GERADORES_SFX = {
    "whoosh": sfx_whoosh,
    "thunk": sfx_thunk,
    "ting": sfx_ting,
    "pop": sfx_pop,
    "alerta": sfx_alerta,
    "moeda": sfx_ting,
}


def gerar_banco_sfx(pasta_saida):
    pasta_saida = Path(pasta_saida)
    pasta_saida.mkdir(parents=True, exist_ok=True)
    arquivos = {}
    for nome, fn in GERADORES_SFX.items():
        destino = pasta_saida / f"{nome}.wav"
        if not destino.exists():
            salvar_wav(destino, fn())
        arquivos[nome] = destino
    return arquivos


# ----------------- Auto-Ducking e Mixagem -----------------
def mixar_com_musica(voz_wav, musica_wav, saida_wav, duck_db=6.0, vol_musica=0.22):
    """Aplica ducking na música quando a voz fala e masteriza em -15 LUFS."""
    voz_wav = Path(voz_wav).resolve()
    musica_wav = Path(musica_wav).resolve()
    saida_wav = Path(saida_wav).resolve()

    # O filtro sidechaincompress comprime o canal da música baseado na amplitude da voz
    # volume inicial ajustado por vol_musica
    filtro = (
        f"[1:a]volume={vol_musica},aloop=loop=-1:size=2e+09[bg];"
        f"[bg][0:a]sidechaincompress=threshold=0.08:ratio=4:attack=35:release=380[mduck];"
        f"[0:a][mduck]amix=inputs=2:duration=first:dropout_transition=2,"
        f"loudnorm=I=-15:TP=-1.0:LRA=10[out]"
    )

    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-i", str(voz_wav),
        "-i", str(musica_wav),
        "-filter_complex", filtro,
        "-map", "[out]",
        "-ar", str(SR),
        "-ac", "2",
        str(saida_wav)
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Falha no FFmpeg ao mixar áudio: {r.stderr}")
    return saida_wav


def aplicar_sfx_em_video(pasta):
    """Lê as frases e/ou storyboard do projeto e injeta os SFX apropriados."""
    pasta = Path(pasta).resolve()
    voz_wav = pasta / "narracao.wav"
    if not voz_wav.exists():
        print(f"Não achei {voz_wav}, pulei SFX.")
        return None

    banco = gerar_banco_sfx(pasta.parent.parent / "biblioteca" / "sfx")

    # Coleta marcações com timestamp
    cues = []
    arq_frases = pasta / "frases.json"
    if arq_frases.exists():
        try:
            frases = json.loads(arq_frases.read_text(encoding="utf-8"))
            for f in frases:
                txt = f.get("texto", "").lower()
                inicio = f.get("inicio", 0)
                if "?" in txt and ("por que" in txt or "por quê" in txt):
                    cues.append((inicio, "alerta"))
                elif "arrasta pra cima" in txt or "morre" in txt:
                    cues.append((inicio + 0.2, "thunk"))
                elif "ciência" in txt or "reais" in txt or "dinheiro" in txt:
                    cues.append((inicio, "ting"))
        except Exception as e:
            print(f"Aviso ao ler frases: {e}")

    # Efeitos de transição de cena
    arq_var = pasta / "cenas" / "variantes.json"
    if arq_var.exists():
        try:
            v_data = json.loads(arq_var.read_text(encoding="utf-8"))
            for c in v_data.get("cenas", []):
                t = c.get("inicio", 0)
                if t > 0:
                    cues.append((t, "whoosh"))
        except Exception as e:
            print(f"Aviso ao ler cenas: {e}")

    if not cues:
        print("Nenhum cue de SFX identificado.")
        return voz_wav

    # Mixa todos os SFX sobre a voz
    entradas = ["-i", str(voz_wav)]
    filtros = []
    idx = 1
    for t_sec, tipo in cues:
        arq_sfx = banco.get(tipo, banco["whoosh"])
        entradas += ["-i", str(arq_sfx)]
        delay_ms = int(t_sec * 1000)
        filtros.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms},volume=0.35[sfx{idx}]")
        idx += 1

    sfx_inputs = "".join(f"[sfx{k}]" for k in range(1, idx))
    filtros.append(f"[0:a]{sfx_inputs}amix=inputs={idx}:duration=first:dropout_transition=2,loudnorm=I=-15:TP=-1.0:LRA=10[out]")

    saida = pasta / "narracao_sfx.wav"
    cmd = ["ffmpeg", "-v", "error", "-y", *entradas, "-filter_complex", ";".join(filtros), "-map", "[out]", "-ar", str(SR), str(saida)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0:
        print(f"SFX aplicados com sucesso ({len(cues)} eventos) em {saida.name}")
        return saida
    else:
        print(f"Aviso: falha ao mixar SFX ({r.stderr.strip()[:200]}), mantendo narracao.wav original.")
        return voz_wav


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Processador de Áudio e SFX")
    parser.add_argument("comando", choices=["sfx", "mixar", "banco"])
    parser.add_argument("pasta", nargs="?", default=".")
    parser.add_argument("--musica", default=None)
    parser.add_argument("--saida", default=None)

    args = parser.parse_args()
    if args.comando == "banco":
        banco = gerar_banco_sfx(Path(args.pasta))
        print(f"Banco de SFX gerado em {args.pasta}: {list(banco.keys())}")
    elif args.comando == "sfx":
        aplicar_sfx_em_video(args.pasta)
    elif args.comando == "mixar":
        p = Path(args.pasta)
        voz = p / "narracao_sfx.wav" if (p / "narracao_sfx.wav").exists() else p / "narracao.wav"
        if not args.musica:
            print("Informe --musica <caminho_da_musica.mp3/wav>")
            sys.exit(1)
        saida = args.saida or str(p / "narracao_mix.wav")
        mixar_com_musica(voz, args.musica, saida)
        print(f"Mixagem final gerada em {saida}")
