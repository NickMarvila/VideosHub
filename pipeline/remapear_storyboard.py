"""Reajusta os tempos de um storyboard quando a narração é gerada de novo.

Cada frase antiga é ligada à frase nova de mesmo número, e os tempos entre elas são esticados ou encolhidos em linha reta.
Uso: python pipeline/remapear_storyboard.py <pasta> <frases_antigas.json>
     (lê <pasta>/storyboard.json, <pasta>/frases.json e <pasta>/voz.json; grava storyboard.json)
"""
import bisect
import json
import sys
from pathlib import Path

CHAVES_TEMPO = {"inicio", "fim", "de", "ate", "em", "aparece", "some"}
CHAVES_QUADROS = {"etapa", "pos", "giro", "escala"}  # listas [[t, valor], ...]


def mapa(antigas, novas, dur_antiga, dur_nova):
    if len(antigas) != len(novas):
        raise SystemExit(f"número de frases mudou ({len(antigas)} → {len(novas)}): refaça as cenas pela IA")
    xs, ys = [0.0], [0.0]
    for a, n in zip(antigas, novas):
        for x, y in ((a["inicio"], n["inicio"]), (a["fim"], n["fim"])):
            if x > xs[-1] and y > ys[-1]:
                xs.append(x); ys.append(y)
    xs.append(max(dur_antiga, xs[-1] + 0.01)); ys.append(max(dur_nova, ys[-1] + 0.01))

    def f(t):
        if t >= xs[-1]:
            return round(ys[-1] + (t - xs[-1]), 2)
        i = max(1, bisect.bisect_right(xs, t))
        x0, x1, y0, y1 = xs[i - 1], xs[i], ys[i - 1], ys[i]
        return round(y0 + (t - x0) * (y1 - y0) / (x1 - x0), 2)
    return f


def aplicar(no, f):
    if isinstance(no, dict):
        for k, v in no.items():
            if k in CHAVES_TEMPO and isinstance(v, (int, float)):
                no[k] = f(v)
            elif k in CHAVES_QUADROS and isinstance(v, list) and v and isinstance(v[0], list):
                for q in v:
                    if q and isinstance(q[0], (int, float)):
                        q[0] = f(q[0])
            else:
                aplicar(v, f)
    elif isinstance(no, list):
        for x in no:
            aplicar(x, f)


def main(pasta, frases_antigas):
    pasta = Path(pasta)
    sb = json.loads((pasta / "storyboard.json").read_text(encoding="utf-8"))
    antigas = json.loads(Path(frases_antigas).read_text(encoding="utf-8"))
    novas = json.loads((pasta / "frases.json").read_text(encoding="utf-8"))
    dur_nova = json.loads((pasta / "voz.json").read_text(encoding="utf-8"))["duracao"] + 0.6
    f = mapa(antigas, novas, sb["duracao"], dur_nova)
    aplicar(sb["cenas"], f)
    sb["duracao"] = round(dur_nova, 2)
    sb["cenas"][0]["inicio"] = 0
    for a, b in zip(sb["cenas"], sb["cenas"][1:]):  # sem buracos entre cenas
        b["inicio"] = a["fim"]
    sb["cenas"][-1]["fim"] = sb["duracao"]
    (pasta / "storyboard.json").write_text(json.dumps(sb, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok: {len(sb['cenas'])} cenas, duração {sb['duracao']}s")


if __name__ == "__main__":
    main(*sys.argv[1:3])
