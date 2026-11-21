"""Cliente mínimo da API do ComfyUI (http://127.0.0.1:8188).

Envia um workflow em formato API, espera terminar e baixa as imagens geradas.
"""
import json
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

API = "http://127.0.0.1:8188"


def _post(caminho, corpo, api=API):
    req = urllib.request.Request(f"{api}{caminho}", data=json.dumps(corpo).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def _get(caminho, api=API):
    with urllib.request.urlopen(f"{api}{caminho}", timeout=60) as r:
        return r.read()


def online(api=API):
    try:
        _get("/system_stats", api)
        return True
    except OSError:
        return False


def enviar_imagem(caminho, api=API):
    """Faz upload de uma imagem para o input/ do ComfyUI e devolve o nome salvo."""
    caminho = Path(caminho)
    limite = uuid.uuid4().hex
    corpo = (f"--{limite}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{caminho.name}\"\r\n"
             f"Content-Type: image/png\r\n\r\n").encode() + caminho.read_bytes() + \
            f"\r\n--{limite}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{limite}--\r\n".encode()
    req = urllib.request.Request(f"{api}/upload/image", data=corpo,
                                 headers={"Content-Type": f"multipart/form-data; boundary={limite}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["name"]


def executar(workflow, pasta_saida, prefixo="img", api=API, timeout=1800):
    """Roda o workflow e salva as imagens em pasta_saida. Devolve a lista de caminhos."""
    resp = _post("/prompt", {"prompt": workflow, "client_id": uuid.uuid4().hex}, api)
    if resp.get("node_errors"):
        raise RuntimeError(f"Erro no workflow: {json.dumps(resp['node_errors'])[:800]}")
    pid = resp["prompt_id"]

    inicio = time.time()
    while True:
        hist = json.loads(_get(f"/history/{pid}", api)).get(pid)
        if hist:
            status = hist.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI falhou: {json.dumps(status.get('messages'))[:800]}")
            if status.get("completed"):
                break
        if time.time() - inicio > timeout:
            raise TimeoutError(f"Workflow {pid} passou de {timeout}s")
        time.sleep(2)

    pasta = Path(pasta_saida)
    pasta.mkdir(parents=True, exist_ok=True)
    salvos = []
    for saida in hist["outputs"].values():
        for i, img in enumerate(saida.get("images", [])):
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            destino = pasta / f"{prefixo}_{len(salvos) + 1:02d}.png"
            destino.write_bytes(_get(f"/view?{q}", api))
            salvos.append(destino)
    return salvos
