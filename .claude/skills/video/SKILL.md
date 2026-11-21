---
name: video
description: Faz a parte da IA de um vídeo do VideosHub (roteiro, cenas ou ajustes pedidos pelo criador no painel). Use quando o usuário digitar /video <id>, /video (sem id = o próximo vídeo na vez da IA) ou pedir para continuar/ajustar um vídeo do hub.
---

# /video: a vez da IA num vídeo do VideosHub

O criador pede e aprova pelo **painel** (`node apps/painel/server.mjs`, em http://localhost:4300). Você faz só a parte criativa e devolve para aprovação. Voz, quadros finais e render são feitos pelos botões do painel.

## 1. Achar o vídeo
- Com id: leia `videos/<id>/status.json`.
- Sem id: procure em `videos/*/status.json` o primeiro com `"estado": "aguardando_ia"`. Se não houver nenhum, diga isso e pare.
- Os arquivos do vídeo ficam em `status.pasta` (ex.: `Kit_Video_3d/projects/<id>`).
- Leia os **ajustes não resolvidos** de `status.portoes.<etapa>.ajustes`. Eles são o que o criador pediu e têm prioridade.
- **Biblioteca:** personagens em `personagens/<slug>/personagem.json` (com `rig2d` e `kit3d`), objetos e cenários 2D em `assets2d/`, e peças 3D do hub no catálogo do kit (`Kit_Video_3d/assets/scenery/hub/`). Use o que existe antes de improvisar.
- Personagens fixos ficam em `personagens/<slug>/personagem.json`. Se a ideia citar um deles (ex.: Tales), use exatamente aquela ficha: roupa, carro, bordão e grafia.

## 2. O que fazer em cada etapa (`status.etapa`)

### roteiro
Leia, uma vez por sessão, `Kit_Video_3d/docs/roteiro-viral.md`. Estes vídeos são **storytime de humor** narrados em terceira pessoa por um contador de histórias, então adapte as regras: o gancho pode ser a apresentação do personagem, sem "você vai construir".

Escreva em `status.pasta`:
- `sinopse.md`: gancho, a sequência da história, a virada, o bordão final, a pergunta para comentar e a quantidade aproximada de cenas.
- `narracao.txt`: só o texto falado, com cerca de `duracaoAlvo × 2,3` palavras (o narrador fala devagar, a 0,82).
  - Frases curtas e números por extenso.
  - Escreva "Paratí" com acento.
  - Use reticências para as pausas de humor.

Termine com uma pergunta fácil para comentar.

**Marcação da leitura (vídeos com `"fluxo": 2` no status):** escreva também `marcacao.json` em `status.pasta`. É uma lista com **uma entrada por frase**, na ordem do texto:
`[{ "texto": "E no dia seguinte?", "energia": "normal", "pausa": 0.55, "efeito": "risada" }, ...]`
- `energia`: `calma` (confidência, suspense), `normal` ou `animada` (surpresa, exagero, o "pulo" da piada).
- `pausa`: segundos de silêncio depois da frase, de 0 a 2. Use cerca de 0,3 no fluxo normal, de 0,6 a 1,0 antes da virada ou do bordão, e 0 para emendar frases.
- `efeito`: `nenhum`, `risada` (no fim da frase, logo depois da piada) ou `suspiro` (antes da frase, como no "Aaai, ai...").
- O `texto` não leva marcações `[laughter]` nem `[sigh]`: o efeito vai no campo `efeito`. Use de 2 a 4 efeitos por vídeo.

**Emoção na voz:** o narrador (OmniVoice) entende as marcações `[laughter]` (risada) e `[sigh]` (suspiro) no meio do texto. Elas não aparecem na legenda. Use de 2 a 4 por vídeo, nos momentos de humor: depois da piada, antes do bordão ("[sigh] Aaai, ai... Esse Tales. [laughter]"). Não use outras marcações.

### narracao
**Vídeos com `"fluxo": 2`:** o áudio é frase por frase, em `<status.pasta>/audio/frases.json`. Para um ajuste, edite só os campos `texto`, `energia`, `pausa` e `efeito` das frases citadas; não mexa em `takes` nem em `escolhido`. Devolva com `"etapa": "narracao"` e `"estado": "aguardando_aprovacao"`. O painel mostra essas frases como alteradas, e o criador manda gravar.

**Vídeos antigos (sem `fluxo`):** esta etapa só chega à IA quando houver um ajuste de narração. Para ajustes de texto, edite `narracao.txt` e devolva para a etapa **roteiro** (`"etapa": "roteiro"`). Assim o criador aprova o texto e o painel gera a voz de novo. Para ajustes de voz (timbre, emoção), não mude nada: explique que isso se escolhe na voz do vídeo e deixe um registro no histórico.

### cenas
**Vídeos com `"fluxo": 2`: variantes de cena.** Em vez de um storyboard único, escreva `<status.pasta>/cenas/variantes.json`:
```json
{ "base": { ...campos gerais do storyboard, sem "cenas" (no 2D: titulo, duracao, audio, legenda, personagens; no 3D: versao, titulo, formato, duracao, audio, palavras, legendas, ambiente) },
  "cenas": [ { "id": "c01", "inicio": 0, "fim": 3.4, "frases": ["f01"], "resumo": "Tales chega na rua",
      "variantes": [ { "id": "c01-a", "descricao": "Plano aberto: ele entra andando e aponta para a Paratí", "recomendada": true, "cena": { ...uma cena do storyboard, sem inicio/fim } },
                     { "id": "c01-b", "descricao": "Close: ele já está parado, acena e sorri", "recomendada": false, "cena": { ... } } ],
      "escolhida": null, "ajustes": [] } ] }
```
- **Duas variantes por cena**, com diferença de verdade: outro enquadramento (aberto ou close), outra ação ou outro cenário. Não vale só mudar uma cor.
- Marque **uma** como `recomendada`.
- Os ids de `frases` vêm de `frases.json` (campo `id`, por exemplo `f03`). `inicio` e `fim` da cena seguem as frases, e as cenas cobrem o vídeo sem buracos.
- Os tempos dentro de `cena` (`de`, `ate`, `aparece`, chaves de `x`...) são absolutos, como no storyboard normal.
- Valide com `node pipeline/cenas.mjs validar <status.pasta>` até não sobrar nenhum erro. Ele testa todas as variantes.
- Não gere os clipes: o painel gera sozinho quando você devolver. Escreva `postagem.md` e o `status.capaEm` normalmente.
- **Ajuste de uma cena só:** em `variantes.json`, a cena com `ajustes` não resolvido recebe **duas variantes novas**, com ids seguintes (`c03-c`, `c03-d`), seguindo o pedido. Marque uma delas como `recomendada` (e tire a marca das antigas), marque o ajuste como resolvido também em `status.portoes.cenas.ajustes`, valide e devolva com `"etapa": "cenas"` e `"estado": "aguardando_aprovacao"`. Não mexa nas outras cenas nem em `escolhida`.

**Vídeos antigos (sem `fluxo`):** veja o motor do estilo em `estilos/<status.estilo>/estilo.json` → `motor`:
- `"remotion"` (2D flat): siga **2D** abaixo.
- `"kit3d"` (3D low-poly): siga **3D**.

**2D (`motor: remotion`)**: leia `apps/render/STORYBOARD2D.md` uma vez por sessão.
1. Use `frases.json` para alinhar as cenas e escreva `plano-animacao.md`, com uma linha por frase: cenário, quem age, o que se move e o que aparece.
2. Escreva `storyboard2d.json` em `status.pasta`. Use os cenários, poses e objetos do guia; não invente nomes.
3. Rode `node apps/render/render2d.mjs <status.pasta> --validar` até não sobrar nenhum erro.
4. Rode `node apps/render/render2d.mjs <status.pasta> --quadros`, abra os PNGs de `render/quadros/` com Read e confira: a cena mostra o que a frase diz, ninguém está cortado e nada importante fica atrás da legenda. Corrija e repita, no máximo 3 rodadas.
5. Escreva `postagem.md` (modelo em `Kit_Video_3d/docs/postagem.md`) e grave o instante da capa em `status.capaEm`.

**3D (`motor: kit3d`)**: siga `Kit_Video_3d/AGENTE.md` (seções 3 a 7) e os docs dele: `catalog/RESUMO.md`, `docs/processos.md` e `docs/storyboard.md`. Leia cada um uma vez por sessão.

1. Use `frases.json` (gerado pelo painel junto com a voz) para alinhar as cenas.
2. Escreva `plano-animacao.md`, com uma linha por frase.
3. Escreva `storyboard.json` com `audio: "narracao.wav"`, `palavras: "palavras.json"` e `duracao` igual à duração em `voz.json` mais cerca de 0,5 s. Fundo e chão vêm do estilo em `estilos/<estilo>/estilo.json` (`kit`). A legenda vai uma palavra por vez, em `corDestaque` do estilo.
4. Rode `node Kit_Video_3d/tools/validar.mjs projects/<pasta-do-projeto>` até não sobrar nenhum erro.
5. Rode `node Kit_Video_3d/tools/render.mjs projects/<pasta-do-projeto> --quadros`. Abra os PNGs em `render/quadros/` com Read e confira com a checklist da seção 6 do AGENTE.md. Corrija e repita, no máximo 3 rodadas.
6. Escreva `postagem.md` seguindo `Kit_Video_3d/docs/postagem.md`.
7. Escolha o instante da capa e grave em `status.capaEm` (segundos).

Limitações conhecidas do kit:
- **Não use `anim.pos`**: o motor tem um bug (`chavesVec is not defined`). Use `movimentos` no lugar.
- Não altere `engine/` nem os assets.
- Rode os comandos a partir da raiz do VideosHub, com os caminhos acima. O argumento do projeto é relativo ao kit: `projects/<nome>`.

### final
Esta etapa só chega à IA com um ajuste no vídeo pronto:
- Se o ajuste for **de texto**, edite `narracao.txt` e volte para `"etapa": "roteiro"`.
- Se for **visual**, edite o `storyboard.json` (ou o `storyboard2d.json`, no 2D), gere os quadros de novo e volte para `"etapa": "cenas"`.
- Se for **de voz**, faça como na etapa narracao.

## 3. Devolver para o criador
Ao terminar, edite `videos/<id>/status.json`:
- `"estado": "aguardando_aprovacao"`, com `etapa` igual ao que ele vai aprovar agora.
- Marque como `"resolvido": true` os ajustes que você atendeu.
- Acrescente em `historico` um `{ "em": "<ISO>", "evento": "IA: <resumo de uma linha>" }`.

Responda em 2 a 4 linhas, em português: o que fez e o que o criador deve aprovar no painel. Não cole JSON nem logs.
