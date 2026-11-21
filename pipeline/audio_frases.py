"""Áudio frase por frase: cada frase tem marcação própria (energia, pausa, velocidade, efeito), 3 takes com o mesmo
narrador (perfil fixo, seeds diferentes) e uma montagem com os takes escolhidos.

Arquivo de controle: <pasta>/audio/frases.json
  { "voz": {...}, "frases": [ { "id": "f01", "texto": "...", "energia": "normal", "pausa": 0.35, "velocidade": 0.82,
      "efeito": "nenhum", "takes": [ {id, arquivo, seed, duracao, config} ], "escolhido": "f01-t1" } ],
    "montagem": { "atual": true, "em": "...", "escolhas": {...} } }

Uso:
  python pipeline/audio_frases.py preparar <pasta>          cria frases.json a partir de narracao.txt (se não existir)
  python pipeline/audio_frases.py gravar <pasta> [ids...]   grava 3 takes das frases sem take na configuração atual
  python pipeline/audio_frases.py montar <pasta>            junta os takes escolhidos → narracao.wav + legendas
"""
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from voz import gerar_fala  # noqa: E402
from narrar_projeto import MARCACAO, alinhar, transcrever  # noqa: E402

VOZ = {"perfil": "2f02b91b", "motor": "omnivoice", "velocidade": 0.82}
TAKES = 3
ENERGIAS = {  # aproximação: o OmniVoice não tem controle direto de emoção
    "calma": {"vel": 0.92},
    "normal": {"vel": 1.0},
    "animada": {"vel": 1.08},
}
PAUSA_PADRAO = {".": 0.35, "!": 0.35, "?": 0.55, "…": 0.6, "...": 0.6}


def agora():
    return datetime.now(timezone.utc).isoformat()


def ffmpeg(*args):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[-600:])


def duracao(arq):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(arq)],
                         capture_output=True, text=True).stdout.strip()
    return round(float(out), 3)


def ler(pasta):
    return json.loads((pasta / "audio" / "frases.json").read_text(encoding="utf-8"))


def salvar(pasta, d):
    (pasta / "audio").mkdir(exist_ok=True)
    (pasta / "audio" / "frases.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def dividir(texto):
    """Quebra o texto em frases, mantendo as marcações de efeito junto da frase certa."""
    efeito_antes = None
    frases = []
    pedacos = re.split(r"(?<=[.!?…])\s+", texto.strip())
    for p in pedacos:
        p = p.strip()
        if not p:
            continue
        efeito = efeito_antes
        efeito_antes = None
        # risada no começo do trecho = reação à frase anterior (depois da piada)
        if re.match(r"\[laughter\]", p, re.I) and frases and frases[-1]["efeito"] == "nenhum":
            frases[-1]["efeito"] = "risada"
            p = re.sub(r"^\[laughter\]\s*", "", p, flags=re.I)
        if re.search(r"\[sigh\]", p, re.I):
            efeito = "suspiro"
        elif re.search(r"\[laughter\]", p, re.I):
            efeito = "risada"
        limpo = re.sub(r"\s+", " ", MARCACAO.sub("", p)).strip()
        if not limpo:
            continue
        fim = "..." if limpo.endswith("...") else limpo[-1]
        frases.append({"texto": limpo, "energia": "animada" if limpo.endswith("!") else "normal",
                       "pausa": PAUSA_PADRAO.get(fim, 0.35), "efeito": efeito or "nenhum"})
    return frases


def texto_tts(f):
    """Texto enviado à voz: pontuação conforme a energia + marcação do efeito."""
    t = f["texto"].strip()
    if f.get("energia") == "calma":
        t = re.sub(r"!+", ".", t)
        if t.endswith(".") and not t.endswith("..."):
            t = t[:-1] + "..."
    elif f.get("energia") == "animada" and t.endswith(".") and not t.endswith("..."):
        t = t[:-1] + "!"
    if f.get("efeito") == "suspiro":
        t = "[sigh] " + t
    elif f.get("efeito") == "risada":
        t = t + " [laughter]"
    return t


def config(f, voz):
    vel = round(f.get("velocidade") or voz["velocidade"], 3)
    return {"texto": texto_tts(f), "vel": round(vel * ENERGIAS.get(f.get("energia", "normal"), ENERGIAS["normal"])["vel"], 3)}


def preparar(pasta):
    arq = pasta / "audio" / "frases.json"
    if arq.exists():
        print("audio/frases.json já existe")
        return ler(pasta)
    texto = (pasta / "narracao.txt").read_text(encoding="utf-8")
    arq_status = Path(__file__).resolve().parents[1] / "videos" / pasta.name / "status.json"
    status = json.loads(arq_status.read_text(encoding="utf-8")) if arq_status.exists() else {}
    voz = {**VOZ, **(status.get("voz") or {})}
    marcacao = pasta / "marcacao.json"  # proposta da IA: [{texto, energia, pausa, efeito}]
    if marcacao.exists():
        base = [{"texto": m["texto"].strip(), "energia": m.get("energia", "normal"), "pausa": float(m.get("pausa", 0.35)),
                 "efeito": m.get("efeito", "nenhum")} for m in json.loads(marcacao.read_text(encoding="utf-8")) if m.get("texto", "").strip()]
    else:
        base = dividir(texto)
    frases = [{"id": f"f{i + 1:02d}", **f, "velocidade": voz["velocidade"], "takes": [], "escolhido": None}
              for i, f in enumerate(base)]
    d = {"voz": voz, "frases": frases, "montagem": {"atual": False}}
    salvar(pasta, d)
    print(f"{len(frases)} frases preparadas")
    return d


def aparar(entrada, saida):
    filtro = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
              "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse")
    ffmpeg("-i", str(entrada), "-af", filtro, "-ar", "48000", "-ac", "1", str(saida))


def gravar(pasta, ids=None):
    d = ler(pasta)
    voz = d["voz"]
    (pasta / "audio" / "takes").mkdir(parents=True, exist_ok=True)
    alvo = []
    for f in d["frases"]:
        cfg = config(f, voz)
        tem = any(t["config"] == cfg for t in f["takes"])
        if (ids and f["id"] in ids) or (not ids and not tem):
            alvo.append((f, cfg))
    total = len(alvo) * TAKES
    print(f"{len(alvo)} frase(s) para gravar, {total} takes", flush=True)
    feitos = 0
    for f, cfg in alvo:
        base = len(f["takes"])
        novos = []
        for k in range(TAKES):
            n = base + k + 1
            seed = 1000 + int(f["id"][1:]) * 100 + n
            bruto = pasta / "audio" / "takes" / f"{f['id']}-t{n}.bruto.wav"
            final = pasta / "audio" / "takes" / f"{f['id']}-t{n}.wav"
            gerar_fala(cfg["texto"], str(bruto), motor=voz["motor"], voz=voz["perfil"], velocidade=cfg["vel"], seed=seed)
            aparar(bruto, final)
            bruto.unlink(missing_ok=True)
            novos.append({"id": f"{f['id']}-t{n}", "arquivo": f"audio/takes/{final.name}", "seed": seed,
                          "duracao": duracao(final), "config": cfg, "em": agora()})
            feitos += 1
            print(f"Quadro {feitos}/{total}  ({round(feitos / total * 100)}%)  frase {f['id']} take {n}", flush=True)
        f["takes"].extend(novos)
        f["escolhido"] = novos[0]["id"]  # o primeiro take novo já entra; o criador troca se quiser
        d["montagem"]["atual"] = False
        salvar(pasta, d)  # salva a cada frase: se cair no meio, não perde o que já gravou
    return d


def montar(pasta):
    d = ler(pasta)
    partes, offsets, t = [], [], 0.0
    for i, f in enumerate(d["frases"]):
        take = next((x for x in f["takes"] if x["id"] == f.get("escolhido")), None) or (f["takes"][-1] if f["takes"] else None)
        if not take:
            raise RuntimeError(f"a frase {f['id']} ainda não tem take gravado")
        ultima = i == len(d["frases"]) - 1
        pausa = 0 if ultima else float(f.get("pausa", 0.35))
        partes.append((pasta / take["arquivo"], pausa))
        offsets.append((f, t, t + take["duracao"]))
        t += take["duracao"] + pausa
    entradas, filtro = [], []
    for j, (arq, pausa) in enumerate(partes):
        entradas += ["-i", str(arq)]
        filtro.append(f"[{j}]apad=pad_dur={pausa}[p{j}]")
    filtro.append("".join(f"[p{j}]" for j in range(len(partes))) + f"concat=n={len(partes)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]")
    ffmpeg(*entradas, "-filter_complex", ";".join(filtro), "-map", "[out]", "-ar", "48000", "-ac", "1", str(pasta / "narracao.wav"))
    print("marcando o tempo de cada palavra...", flush=True)
    falado = " ".join(f["texto"] for f in d["frases"])
    whisper = transcrever(pasta / "narracao.wav")
    palavras, cobertura = alinhar(falado.split(), whisper)
    # frases com o tempo exato da montagem (não depende do Whisper)
    frases = [{"n": i + 1, "id": f["id"], "texto": f["texto"], "inicio": round(a, 2), "fim": round(b, 2)} for i, (f, a, b) in enumerate(offsets)]
    dur = duracao(pasta / "narracao.wav")
    (pasta / "palavras.json").write_text(json.dumps(palavras, ensure_ascii=False, indent=1), encoding="utf-8")
    (pasta / "frases.json").write_text(json.dumps(frases, ensure_ascii=False, indent=1), encoding="utf-8")
    (pasta / "narracao.falado.txt").write_text(falado, encoding="utf-8")
    (pasta / "narracao.txt").write_text(" ".join(texto_tts(f) for f in d["frases"]), encoding="utf-8")
    info = {"provedor": f"voicestudio-{d['voz']['motor']}", "audio": "narracao.wav", "duracao": dur, "palavras": len(palavras),
            "frases": len(frases), "voz": d["voz"]["perfil"], "velocidade": d["voz"]["velocidade"], "modo": "frase-a-frase",
            "coberturaTempos": round(cobertura, 3), "ouvidoPeloWhisper": whisper.get("text", ""), "geradoEm": agora()}
    (pasta / "voz.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    d["montagem"] = {"atual": True, "em": agora(), "duracao": dur, "escolhas": {f["id"]: f.get("escolhido") for f in d["frases"]}}
    salvar(pasta, d)
    print(f"ok montagem {dur:.1f}s, {len(frases)} frases, legenda {cobertura:.0%}", flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    cmd, pasta, *resto = sys.argv[1:]
    pasta = Path(pasta).resolve()
    t0 = time.time()
    try:
        if cmd == "preparar":
            preparar(pasta)
        elif cmd == "gravar":
            gravar(pasta, resto or None)
        elif cmd == "montar":
            montar(pasta)
        elif cmd == "tudo":  # preparar + gravar o que falta + montar
            preparar(pasta)
            gravar(pasta)
            montar(pasta)
        else:
            raise RuntimeError(f"comando desconhecido: {cmd}")
    except Exception as e:  # noqa: BLE001
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)
