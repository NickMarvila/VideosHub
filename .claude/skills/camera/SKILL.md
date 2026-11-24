---
name: camera
description: Acrescenta ou ajusta uma regra de câmera dos vídeos Cartoon 3D do VideosHub (config/regras-camera.json), como "quando alguém cai, a câmera treme e desce". Use quando o usuário digitar /camera <regra> ou pedir uma regra nova de câmera, zoom ou enquadramento para os vídeos.
---

# /camera: regras de câmera do Cartoon 3D

As cenas do Cartoon 3D não têm câmera escrita à mão. Cada cena tem um `momento`, e `apps/render/modelos_cartoon.mjs` transforma esse momento em chaves de câmera seguindo `config/regras-camera.json`. Esta skill muda **só esse arquivo de regras** (e os guias), nunca os vídeos.

**Só aplique uma regra que o criador pediu ou aprovou.** Se a ideia partiu de você (por exemplo, um padrão nos ajustes), mostre a regra proposta e espere o "ok".

## 1. Entender o pedido
Leia `config/regras-camera.json` (o bloco `_chaves` explica cada campo). Decida:
- **Ajustar um momento que já existe** (ex.: "o pensa comigo aproxima pouco"): mude os números dele.
- **Criar um momento novo** (ex.: "queda: treme e desce"): acrescente em `momentos` com um nome curto em snake_case.

Uma regra é uma lista de `chaves`. Cada chave diz:
- **quando:** `s` (segundos desde o início da cena), `u` (fração de 0 a 1) ou `em: "revela"` + `mais`;
- **para onde mira:** `alvo`, `rosto`, `todos` ou `falante`;
- **a que distância:** `dist` (1 = enquadra inteiro com folga; menor = mais perto);
- **ângulo e lente:** `lado`, `alto`, `fov` e `roll`.

A regra tem ainda `desfoque` e `descricao`. A câmera desliza suave entre as chaves; para tremer, use chaves próximas (0,1 s) com `roll` alternado, como em `virada`.

Se o pedido precisa de algo que os campos não expressam (ex.: seguir um objeto que anda), diga isso ao criador e proponha o código em `modelos_cartoon.mjs`. Não edite o código sem o "ok" dele.

## 2. Aplicar
1. Edite `config/regras-camera.json`. A `descricao` diz em uma linha quando usar o momento.
2. Novo momento: acrescente-o à lista de `momento` em `.claude/skills/video/etapas/cenas.md` e em `apps/render/STORYBOARD_CARTOON.md` (seção Câmera), com uma linha de quando usar.
3. Teste sem abrir imagens: monte um storyboard pequeno no scratchpad com uma cena usando o momento e rode
   `node apps/render/render2d.mjs <pasta de um vídeo cartoon> --cartoon --validar --storyboard <arquivo>`.
   Não pode sobrar erro nem aviso de "fora do quadro" ou "câmera dentro de objeto".
4. Só se o criador pedir para ver: rode `--quadros` com o mesmo `--storyboard` e junte os PNGs numa única imagem em grade (ffmpeg `tile`) antes de olhar. Depois apague a pasta `render/` criada.

## 3. Responder
Em 2 ou 3 linhas: qual regra entrou ou mudou, quando a IA vai usá-la e o resultado do teste.
