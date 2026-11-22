"""Trilha sonora do VideosHub: música + efeitos sonoros sintetizados, mixados abaixo da voz (nível regulável no painel).

Regras (da skill cartoon-audio-short):
- A voz nunca é editada: só um ganho linear igual para tudo no fim.
- Música = −14 dB da voz por padrão (≈ 20 %, RMS com gate). Efeitos = −6 dB por padrão, com pico limitado a 0,7× o pico da voz.
- Sem ducking nem compressão que mude essa relação. No fim: um ganho linear até −14 LUFS + limitador de pico em −1 dBFS.

Entradas na pasta do vídeo:
  narracao.wav                      a voz (gerada ou gravada pelo criador)
  storyboard2d.json | storyboard.json   de onde saem os efeitos automáticos (flash = whoosh, tremor = batida...)
  trilha.json (opcional)            { "musica": { "clima": "marcha|leve|misterio|nenhuma", "bpm": 104, "paraEm": 26.4 },
                                      "nivelMusica": -6, "nivelEfeitos": -6, "auto": true,
                                      "efeitos": [ { "t": 20.1, "tipo": "impacto", "ganho": 0 } ] }
Saída: trilha/musica.wav, trilha/efeitos.wav, trilha/mix.wav, trilha/relatorio.json

Uso: python pipeline/trilha.py <pasta>
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent / "som"))
import instruments as I  # noqa: E402
import sfx_gen as G  # noqa: E402
from dsp import SR, integrated, rng, lp, colored, write_wav, true_peak  # noqa: E402

FPS = 30


# ---------------------------------------------------------------- utilidades
def mono(x):
    x = np.asarray(x, float)
    return x.mean(0) if x.ndim == 2 else x


def colocar(buf, x, t, ganho_db=0.0):
    x = mono(x) * 10 ** (ganho_db / 20)
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n]


def ler_voz(arq):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(arq), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(float)


def rms_gate(x, bloco=0.4, passo=0.1):
    """RMS com gate (como o BS.1770): ignora silêncio para comparar o nível da voz, da música e dos efeitos."""
    n, h = int(bloco * SR), int(passo * SR)
    if len(x) < n:
        return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
    idx = np.arange(0, len(x) - n, h)
    z = np.array([np.mean(x[i:i + n] ** 2) for i in idx]) + 1e-20
    L = 10 * np.log10(z)
    keep = L > -60
    if not keep.any():
        return 1e-12
    rel = 10 * np.log10(z[keep].mean()) - 10
    k2 = keep & (L > rel)
    return float(np.sqrt(z[k2].mean()))


def db(x):
    return 20 * np.log10(max(x, 1e-12))


# ---------------------------------------------------------------- efeitos
def motor(dur, r):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ronco = lp(colored(n, r, slope=-1.0), 260) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    env = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.4)
    return ronco / (np.abs(ronco).max() + 1e-9) * env * 0.8


def freio(r, dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 2300 - 500 * t / dur
    tom = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    chiado = colored(n, r) * 0.25
    env = np.minimum(1, t / 0.05) * np.exp(-1.2 * t)
    return (tom + chiado) * env * 0.6


def buzina(dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 410 * t)) + np.sign(np.sin(2 * np.pi * 515 * t))
    return lp(x * 0.25, 2500) * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05)


def efeito(tipo, r, dur=1.5):
    """Gera um efeito pelo nome em português. Os ambientes ('grilos', 'vento'...) usam dur."""
    if tipo == "whoosh":
        return G.whoosh(0.55, r)
    if tipo in ("impacto", "pancada"):
        golpe, baque = mono(G.hammer_hit(r)), mono(G.push_thump(r))
        out = np.zeros(max(len(golpe), len(baque)))
        out[:len(golpe)] += golpe * 0.8
        out[:len(baque)] += baque
        return out
    if tipo == "batida":
        return G.push_thump(r)
    if tipo == "estalo":
        return G.wood_crack(r)
    if tipo == "quebra":
        return G.bolt_snap(r)
    if tipo == "pop":
        return I.pluck(880, vel=0.7, r=r, dur=0.25, bright=0.8)
    if tipo == "ting":
        return I.glock(2093, vel=0.6, r=r, dur=1.2)
    if tipo in ("moeda", "dinheiro"):
        out = np.zeros(int(0.5 * SR))
        for k, f0 in enumerate((3100, 3700, 4300)):
            colocar(out, G.clink(r, f0=f0, dur=0.15), k * 0.09)
        return out
    if tipo == "passos":
        out = np.zeros(int(max(dur, 1.0) * SR))
        for k in range(int(max(dur, 1.0) / 0.45)):
            colocar(out, G.stroll_step(r), k * 0.45)
        return out
    if tipo == "uou":
        return G.whoa(r)
    if tipo == "aplausos":
        return G.applause(max(dur, 1.5), r)
    if tipo == "passaros":
        return G.bird_chirps(dur, r)
    if tipo == "grilos":
        return G.crickets(dur, r)
    if tipo == "vento":
        return G.breeze(dur, r)
    if tipo == "agua":
        return G.water_bed(dur, r)
    if tipo == "splash":
        return G.splash_big(r)
    if tipo == "sting":
        out = np.zeros(int(2.5 * SR))
        colocar(out, I.timpani(55, vel=0.9, r=r, dur=2.2), 0)
        colocar(out, I.cymbal(vel=0.6, r=r, dur=2.2), 0, -4)
        return out
    if tipo == "motor":
        return motor(dur, r)
    if tipo == "freio":
        return freio(r)
    if tipo == "buzina":
        return buzina()
    raise ValueError(f"efeito desconhecido: {tipo}")


AMBIENTES = {"grilos", "vento", "agua", "passaros", "motor", "passos", "aplausos"}
TIPOS = ["whoosh", "impacto", "batida", "estalo", "quebra", "pop", "ting", "moeda", "dinheiro", "passos", "uou", "aplausos",
         "passaros", "grilos", "vento", "agua", "splash", "sting", "motor", "freio", "buzina"]


def efeitos_auto(sb):
    """Efeitos que saem sozinhos do storyboard (2D ou 3D)."""
    out = []
    for i, c in enumerate(sb.get("cenas", [])):
        ini, fim = float(c["inicio"]), float(c["fim"])
        if i > 0 and c.get("transicao") in ("flash", "deslize"):
            out.append({"t": max(0, ini - 0.12), "tipo": "whoosh", "ganho": -2, "auto": True})
        tremor = c.get("tremor") or next(([e["de"], e["ate"]] for e in c.get("efeitos", []) if e.get("tipo") == "tremor"), None)
        if tremor:
            out.append({"t": float(tremor[0]), "tipo": "impacto", "auto": True})
        if c.get("cenario") == "rua_noite":
            out.append({"t": ini, "tipo": "grilos", "dur": fim - ini, "ganho": -8, "auto": True})
        if c.get("cenario") == "estrada":
            out.append({"t": ini, "tipo": "vento", "dur": fim - ini, "ganho": -10, "auto": True})
        for o in c.get("objetos", []):
            tipo = o.get("tipo") or o.get("asset", "")
            if o.get("aparece") is not None:
                som = "moeda" if tipo in ("dinheiro", "moeda") else "ting" if tipo in ("relogio", "celular") else "pop"
                out.append({"t": max(0, float(o["aparece"]) - 0.03), "tipo": som, "ganho": -3, "auto": True})
            if o.get("movendo") or (tipo.startswith("carro") or tipo in ("parati", "onibus")) and o.get("movimentos"):
                out.append({"t": ini, "tipo": "motor", "dur": fim - ini, "ganho": -6, "auto": True})
            if o.get("quebrado") and o.get("movendo"):
                out.append({"t": ini + (fim - ini) * 0.55, "tipo": "freio", "ganho": -3, "auto": True})
    return out


# ---------------------------------------------------------------- música
PROG = {  # (graus em semitons a partir de C) por compasso
    "maior": [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)],    # C G Am F
    "menor": [(9, 12, 16), (5, 9, 12), (2, 5, 9), (4, 8, 11)],     # Am F Dm E
}


def musica(dur_total, clima, bpm, para_em, r):
    n = int(dur_total * SR)
    buf = np.zeros(n)
    if clima == "nenhuma":
        return buf
    fim = para_em if para_em else dur_total
    batida = 60.0 / bpm
    compasso = 4 * batida
    prog = PROG["menor" if clima == "misterio" else "maior"]
    base = 48  # C3
    k = 0
    t = 0.0
    while t < fim - 0.05:
        acorde = prog[k % len(prog)]
        freqs = [I.m2f(base + s) for s in acorde]
        raiz = I.m2f(base - 12 + acorde[0])
        quinta = I.m2f(base - 12 + acorde[2] if clima != "misterio" else base - 12 + acorde[1])
        dur_c = min(compasso, fim - t)
        if clima == "marcha":
            colocar(buf, I.pad(freqs, dur_c, vel=0.35, r=r, att=0.05, rel=0.25, warm=1400), t, -10)
            for b in range(4):
                tb = t + b * batida
                if tb >= fim:
                    break
                if b % 2 == 0:
                    colocar(buf, I.brass(raiz if b == 0 else quinta, batida * 0.9, vel=0.8, r=r, kind="tuba"), tb, -2)
                    colocar(buf, I.timpani(raiz, vel=0.5, r=r, dur=0.6), tb, -12)
                else:
                    colocar(buf, I.snare(vel=0.6, r=r), tb, -8)
                colocar(buf, I.snare(vel=0.25, r=r), tb + batida / 2, -16)
            if k % 2 == 1:
                for j, nota in enumerate([acorde[2], acorde[1], acorde[0] + 12]):
                    colocar(buf, I.glock(I.m2f(base + 12 + nota), vel=0.4, r=r, dur=0.9), t + j * batida, -12)
        elif clima == "leve":
            colocar(buf, I.pad(freqs, dur_c, vel=0.3, r=r, att=0.3, rel=0.5, warm=1000), t, -14)
            for b in range(4):
                tb = t + b * batida
                if tb >= fim:
                    break
                if b % 2 == 0:
                    colocar(buf, I.pluck(raiz, vel=0.8, r=r, dur=batida * 1.6), tb, -2)
                else:
                    colocar(buf, I.brush(vel=0.5, r=r), tb, -10)
                for meia in range(2):
                    nota = acorde[(b * 2 + meia) % 3] + 12
                    colocar(buf, I.musicbox(I.m2f(base + nota), vel=0.35, r=r, dur=0.8), tb + meia * batida / 2, -14)
        else:  # misterio
            colocar(buf, I.pad(freqs, dur_c, vel=0.35, r=r, att=0.8, rel=1.0, warm=700, trem=lambda t: 0.8 + 0.2 * np.sin(2 * np.pi * 4.0 * t)), t, -8)
            colocar(buf, I.timpani(raiz, vel=0.6, r=r, dur=1.5), t, -8)
            colocar(buf, I.vibes(I.m2f(base + 12 + acorde[2]), vel=0.3, r=r, dur=1.4), t + 2 * batida, -14)
        t += compasso
        k += 1
    # some suavemente no fim (ou no ponto da virada)
    i_fim = int(fim * SR)
    fade = int(0.25 * SR)
    a = max(0, i_fim - fade)
    buf[a:i_fim] *= np.linspace(1, 0, i_fim - a)
    buf[i_fim:] = 0
    if para_em and para_em < dur_total - 0.3:
        # a música para na virada: drone grave segura até o fim
        colocar(buf, I.pad([I.m2f(36), I.m2f(43)], dur_total - para_em, vel=0.25, r=r, att=0.4, rel=0.8, warm=400), para_em, -14)
    return buf


# ---------------------------------------------------------------- principal
def trilha(pasta):
    pasta = Path(pasta)
    cfg = json.loads((pasta / "trilha.json").read_text(encoding="utf-8")) if (pasta / "trilha.json").exists() else {}
    sb_arq = next((pasta / n for n in ("storyboard_cartoon.json", "storyboard2d.json", "storyboard.json") if (pasta / n).exists()), pasta / "storyboard.json")
    sb = json.loads(sb_arq.read_text(encoding="utf-8")) if sb_arq.exists() else {"cenas": []}
    voz = ler_voz(pasta / "narracao.wav")
    dur = max(len(voz) / SR, float(sb.get("duracao", 0) or 0))
    n = int(round(dur * SR))
    voz = np.pad(voz, (0, max(0, n - len(voz))))[:n]

    m = cfg.get("musica", {})
    clima = m.get("clima", "leve")
    r = rng(7)
    mus = musica(dur, clima, float(m.get("bpm", 104)), m.get("paraEm"), r)

    lista = (efeitos_auto(sb) if cfg.get("auto", True) else []) + [dict(e, auto=False) for e in cfg.get("efeitos", [])]
    if m.get("paraEm"):
        lista.append({"t": float(m["paraEm"]), "tipo": "sting", "auto": True})
    lista.sort(key=lambda e: e["t"])
    usados, sfx = [], np.zeros(n)
    for e in lista:
        if any(u["tipo"] == e["tipo"] and abs(u["t"] - e["t"]) < 0.15 for u in usados):
            continue  # o mesmo som duas vezes no mesmo instante
        try:
            x = efeito(e["tipo"], rng(int(e["t"] * 1000) + len(usados)), float(e.get("dur", 1.5)))
        except ValueError as er:
            print(f"aviso: {er}", flush=True)
            continue
        colocar(sfx, x, float(e["t"]), float(e.get("ganho", 0)))
        usados.append(e)

    # níveis em relação ao RMS da voz (trilha.json: nivelMusica / nivelEfeitos, em dB; −60 = mudo); efeitos com pico ≤ 0,7× o pico da voz
    rv = rms_gate(voz)
    nm, ne = float(cfg.get("nivelMusica", -14)), float(cfg.get("nivelEfeitos", -6))  # -14 dB ≈ 20 % da voz (o criador achou -6 alto demais)
    gm = (rv * 10 ** (nm / 20)) / rms_gate(mus) if np.abs(mus).max() > 0 else 0
    ge = (rv * 10 ** (ne / 20)) / rms_gate(sfx) if np.abs(sfx).max() > 0 else 0
    pico_voz = np.abs(voz).max()
    if ge and np.abs(sfx * ge).max() > 0.7 * pico_voz:
        ge = 0.7 * pico_voz / np.abs(sfx).max()
    mix = voz + mus * gm + sfx * ge
    # um ganho linear até −14 LUFS; o limitador de −1 dBFS é aplicado pelo ffmpeg logo abaixo
    lufs = integrated(np.stack([mix, mix]))
    g = 10 ** ((-14.0 - lufs) / 20)
    saida = pasta / "trilha"
    saida.mkdir(exist_ok=True)
    write_wav(str(saida / "musica.wav"), np.stack([mus * gm * g] * 2))
    write_wav(str(saida / "efeitos.wav"), np.stack([sfx * ge * g] * 2))
    bruto = saida / "mix_bruto.wav"
    write_wav(str(bruto), np.stack([mix * g] * 2))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(bruto), "-af", "alimiter=limit=0.891:attack=3:release=60:level=disabled",
                    "-ar", str(SR), "-c:a", "pcm_s24le", str(saida / "mix.wav")], check=True)
    bruto.unlink()
    rel = {
        "duracao": round(dur, 2), "clima": clima,
        "musicaVsVoz_dB": round(db(rms_gate(mus * gm)) - db(rv), 2) if gm else None,
        "efeitosVsVoz_dB": round(db(rms_gate(sfx * ge)) - db(rv), 2) if ge else None,
        "picoEfeitosVsVoz": round(float(np.abs(sfx * ge).max() / pico_voz), 2) if ge else None,
        "lufsAntes": round(float(lufs), 2), "ganhoFinal_dB": round(db(g), 2), "picoFinal_dBTP": round(float(true_peak(np.stack([mix * g] * 2))), 2),
        "efeitos": [{k: e[k] for k in ("t", "tipo", "auto") if k in e} for e in usados],
    }
    (saida / "relatorio.json").write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok trilha: música {rel['musicaVsVoz_dB']} dB e efeitos {rel['efeitosVsVoz_dB']} dB em relação à voz, "
          f"{len(usados)} efeitos, master {rel['ganhoFinal_dB']:+.1f} dB -> -14 LUFS", flush=True)
    return rel


if __name__ == "__main__":
    trilha(sys.argv[1])
