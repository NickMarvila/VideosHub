"""Criação de personagem, etapa 1: gera N opções de arte de referência com o Qwen-Image.

Uso:
  python pipeline/personagem.py zeca --opcoes 4
Lê personagens/<slug>/personagem.json (descricao + estilo_arte) e salva em personagens/<slug>/opcoes/.
"""
import argparse
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import comfy  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent

MODELO = "qwen-image-Q4_K_M.gguf"
LORA = "Qwen-Image-Lightning-8steps-V2.0.safetensors"
TEXT_ENCODER = "qwen_2.5_vl_7b_fp8_scaled.safetensors"
VAE = "qwen_image_vae.safetensors"

NEGATIVO = ("photorealistic, 3d render, realistic skin, background scenery, text, watermark, logo, "
            "multiple characters, cropped, extra limbs, deformed hands, blurry")


def montar_prompt(p):
    return (f"Full body character design of {p['nome']}: {p['descricao']}. "
            f"Style: {p['estilo_arte']}, 2D flat cartoon illustration, bold clean outlines, flat cel shading, "
            "vibrant colors, friendly expressive face, standing front view, neutral pose, arms relaxed, "
            "whole body visible from head to feet, centered, isolated on a plain pure white background, "
            "character sheet reference, mascot quality")


def workflow_txt2img(prompt, negativo, seed, largura=1104, altura=1472, passos=8, cfg=1.0, prefixo="personagem"):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": MODELO}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": LORA, "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.1}},
        "4": {"class_type": "CLIPLoader", "inputs": {"clip_name": TEXT_ENCODER, "type": "qwen_image", "device": "default"}},
        "5": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": prompt}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": negativo}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": largura, "height": altura, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {
            "model": ["3", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0],
            "seed": seed, "steps": passos, "cfg": cfg, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["5", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefixo}},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--opcoes", type=int, default=4)
    ap.add_argument("--extra", default="", help="texto extra para o prompt")
    a = ap.parse_args()

    pasta = RAIZ / "personagens" / a.slug
    p = json.loads((pasta / "personagem.json").read_text(encoding="utf-8"))
    if not comfy.online():
        sys.exit("ComfyUI não está rodando em http://127.0.0.1:8188")

    prompt = montar_prompt(p) + (f" {a.extra}" if a.extra else "")
    registro = []
    for i in range(a.opcoes):
        seed = random.randint(1, 2**31 - 1)
        wf = workflow_txt2img(prompt, NEGATIVO, seed, prefixo=f"{a.slug}_opcao")
        arq = comfy.executar(wf, pasta / "opcoes", prefixo=f"opcao_{i + 1}_seed{seed}")[0]
        registro.append({"arquivo": arq.name, "seed": seed})
        print(f"ok {arq}")
    (pasta / "opcoes" / "opcoes.json").write_text(
        json.dumps({"prompt": prompt, "negativo": NEGATIVO, "opcoes": registro}, ensure_ascii=False, indent=2),
        encoding="utf-8")


if __name__ == "__main__":
    main()
