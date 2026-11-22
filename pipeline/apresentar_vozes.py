"""Grava a "apresentação" de cada voz do catálogo (config/vozes.json): a própria voz diz quem é.

Uso:
  python pipeline/apresentar_vozes.py            # só as vozes que ainda não têm apresentação
  python pipeline/apresentar_vozes.py --id cinema --refazer
Saída: testes/voz/apresentacao/<id>.wav e o campo "apresentacao" de cada voz em config/vozes.json.
O texto vem do campo "apresentacaoTexto" da voz (ou um texto padrão com o nome dela).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from voz import aplicar_pronuncia, gerar_fala  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "config" / "vozes.json"
PASTA = RAIZ / "testes" / "voz" / "apresentacao"


def texto_de(v):
    if v.get("apresentacaoTexto"):
        return v["apresentacaoTexto"]
    nome = re.sub(r"\s*\(.*?\)", "", v["nome"]).strip()
    return f"Olá! Eu sou o {nome}. Se você me escolher, é assim que eu vou contar a sua história."


TESTE = {"voicebox": ("Voicebox", "http://127.0.0.1:17493/profiles"), "voicestudio": ("VoiceStudio", "http://127.0.0.1:3900/health")}


def esperar_motor(motor, limite=180):
    """O painel abre o app sozinho; aqui só espera a API responder (o app leva um tempo para carregar)."""
    import time
    import urllib.error
    import urllib.request
    nome, url = TESTE["voicebox" if motor == "voicebox" else "voicestudio"]
    t0, avisou = time.time(), False
    while time.time() - t0 < limite:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except urllib.error.HTTPError as e:
            if e.code < 500:
                return True
        except Exception:  # noqa: BLE001 - ainda abrindo
            pass
        if not avisou:
            print(f"esperando o {nome} abrir", flush=True)
            avisou = True
        time.sleep(3)
    return False


def aparar(bruto, final):
    """Tira o silêncio do começo e do fim (igual aos takes do áudio frase por frase)."""
    filtro = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
              "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse")
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(bruto), "-af", filtro, str(final)], capture_output=True, text=True)
    if r.returncode != 0:
        Path(bruto).replace(final)
    else:
        Path(bruto).unlink(missing_ok=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="só esta voz")
    ap.add_argument("--refazer", action="store_true", help="grava de novo mesmo se já existir")
    a = ap.parse_args()
    vozes = json.loads(CATALOGO.read_text(encoding="utf-8"))
    alvo = [v for v in vozes if (not a.id or v["id"] == a.id)
            and (a.refazer or a.id or not v.get("apresentacao") or not (RAIZ / v["apresentacao"]).exists())]
    if a.id and not alvo:
        print(f"ERRO: voz {a.id} não está no catálogo", file=sys.stderr)
        sys.exit(1)
    PASTA.mkdir(parents=True, exist_ok=True)
    falhas = 0
    for i, v in enumerate(alvo, 1):
        print(f"[{i}/{len(alvo)}] gravando a apresentação de {v['nome']}", flush=True)
        esperar_motor(v["motor"])
        bruto, final = PASTA / f"{v['id']}.bruto.wav", PASTA / f"{v['id']}.wav"
        try:
            gerar_fala(aplicar_pronuncia(texto_de(v), v.get("pronuncia")), str(bruto), motor=v["motor"], voz=v["perfil"],
                       velocidade=v.get("velocidade", 1.0), seed=v.get("seed", 1100), instrucao=v.get("instrucao"))
        except Exception as e:  # noqa: BLE001 - um motor fora do ar não impede as outras vozes
            falhas += 1
            fora = "urlopen error" in str(e) or "10061" in str(e)
            motivo = ("o Voicebox não está aberto" if v["motor"] == "voicebox" else "o VoiceStudio não está aberto") if fora else str(e)
            print(f"ERRO em {v['nome']}: {motivo}", file=sys.stderr, flush=True)
            continue
        aparar(bruto, final)
        # relê o catálogo antes de gravar, para não apagar edições feitas no meio do caminho
        atual = json.loads(CATALOGO.read_text(encoding="utf-8"))
        for x in atual:
            if x["id"] == v["id"]:
                x["apresentacao"] = final.relative_to(RAIZ).as_posix()
        CATALOGO.write_text(json.dumps(atual, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"ok {final.relative_to(RAIZ).as_posix()}", flush=True)
    if not alvo:
        print("Todas as vozes já têm apresentação.")
    sys.exit(1 if falhas and falhas == len(alvo) else 0)


if __name__ == "__main__":
    main()
