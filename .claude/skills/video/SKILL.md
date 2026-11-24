---
name: video
description: Faz a parte da IA de um vídeo do VideosHub (roteiro, cenas ou ajustes pedidos pelo criador no painel). Use quando o usuário digitar /video <id>, /video (sem id = o próximo vídeo na vez da IA) ou pedir para continuar/ajustar um vídeo do hub.
---

# /video: a vez da IA num vídeo do VideosHub

O criador pede e aprova pelo **painel** (`node apps/painel/server.mjs`, em http://localhost:4300). Você faz só a parte criativa e devolve para aprovação. Voz, quadros finais e render são feitos pelos botões do painel.

**Canal:** "Pensa Comigo" (identidade em `config/canal.json`). Use o nome nas postagens (`postagem.md`) e nas hashtags fixas, mas **nunca** na narração (nada de "oi pessoal" nem de nome do canal no vídeo).

## 1. Achar o vídeo
- Com id: leia `videos/<id>/status.json`.
- Sem id: procure em `videos/*/status.json` o primeiro com `"estado": "aguardando_ia"`. Se não houver nenhum, diga isso e pare.
- Os arquivos do vídeo ficam em `status.pasta` (ex.: `Kit_Video_3d/projects/<id>`).
- Leia os **ajustes não resolvidos** de `status.portoes.<etapa>.ajustes`. Eles são o que o criador pediu e têm prioridade.
- **Biblioteca:** personagens em `personagens/<slug>/personagem.json` (com `rig2d` e `kit3d`), objetos e cenários 2D em `assets2d/`, e peças 3D do hub no catálogo do kit (`Kit_Video_3d/assets/scenery/hub/`). Use o que existe antes de improvisar.
- Personagens fixos ficam em `personagens/<slug>/personagem.json`. Se a ideia citar um deles (ex.: Tales), use exatamente aquela ficha: roupa, carro, bordão e grafia.

**Legenda (todo vídeo, 2D e 3D):** ligada por padrão, de 2 a 3 palavras na tela por vez, com a palavra falada em destaque. Não desligue nem passe para uma palavra por vez sem um pedido do criador. No 2D é `legenda.porVez: 3`; no 3D é `legendas.palavrasPorBloco: 3` (ou omita o campo).

## 2. O que fazer na etapa (`status.etapa`)

**Leia só o arquivo da etapa atual** (não leia os outros): `.claude/skills/video/etapas/<etapa>.md`, ou seja `roteiro.md`, `narracao.md`, `cenas.md` ou `final.md`.

## 3. Devolver para o criador
Ao terminar, edite `videos/<id>/status.json`:
- `"estado": "aguardando_aprovacao"`, com `etapa` igual ao que ele vai aprovar agora.
- Marque como `"resolvido": true` os ajustes que você atendeu.
- Acrescente em `historico` um `{ "em": "<ISO>", "evento": "IA: <resumo de uma linha>" }`.

Responda em 2 a 4 linhas, em português: o que fez e o que o criador deve aprovar no painel. Não cole JSON nem logs.
