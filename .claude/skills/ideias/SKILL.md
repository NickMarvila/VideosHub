---
name: ideias
description: Gera 10 ideias de vídeo curto para o VideosHub (título, gancho, virada, por que anima bem, fato ou lenda), com os fatos conferidos na web. Use quando o usuário digitar /ideias <id> ou pedir ideias de vídeo.
---

# /ideias: 10 ideias de vídeo

O pedido fica em `ideias/<id>.json`: `tema` (pode ser vazio), `duracao` e `estilo`. Você preenche `ideias` com **exatamente 10** itens e grava o arquivo.

```json
{ "n": 1, "titulo": "O Homem Que Vendeu a Torre Eiffel", "gancho": "Um homem vendeu a Torre Eiffel. Duas vezes.",
  "virada": "Na segunda vez, quem denunciou foi o próprio comprador.", "porQueAnima": "a torre sendo 'desmontada' no papel, o comprador entregando a mala de dinheiro, a polícia chegando",
  "fatoOuLenda": "fato documentado (Victor Lustig, 1925)", "fontes": ["https://..."], "personagens": [], "modo": "historia",
  "receita": "G3 · Fato absurdo seco", "pensaComigo": "é como vender o ar que a pessoa já respira: ninguém confere se é seu" }
```

## Cada ideia
- **Título:** de 5 a 8 palavras, que dê curiosidade.
- **Gancho:** a primeira frase falada, sem introdução, feita com uma das receitas de `docs/receitas-roteiro.md` (leia uma vez). Grave a receita em `receita` (ex.: `"G1 · E se… que virou real"`). **Use pelo menos 5 receitas diferentes nas 10 ideias**, com 2 ou 3 no "E se…" (G1 ou G2).
- **Pensa comigo:** em `pensaComigo`, a comparação do dia a dia que vai explicar o mecanismo no meio do vídeo (ex.: "é como tentar pegar pipoca estourando com uma pinça").
- **Virada:** uma linha, irônica, que fecha o vídeo.
- **Por que anima bem:** os 2 ou 3 grandes momentos visuais (um desabamento, uma revelação, uma perseguição).
- **Fato ou lenda:** diga claramente se é história documentada, relato disputado ou folclore.
- **Modo:**
  - `historia`: um caso real ou lendário.
  - `personagem`: um caso do dia a dia com um personagem fixo da biblioteca, como o Tales ou o Zeca (veja `personagens/*/personagem.json`). Nesse caso, ponha o slug em `personagens` e escreva "ficção" em `fatoOuLenda`.

## O que faz uma ideia perfeita para este formato
- Uma história surpreendente com causa e efeito físico que dá para **mostrar**.
- Um protagonista comum, tensão que cresce e uma virada na última linha.
- Um cenário que dá para montar com o que existe:
  - **3D:** cidade, casas, obra, ruas, veículos e máquinas (catálogo em `Kit_Video_3d/catalog/RESUMO.md`).
  - **2D:** rua, mercado, sala, estrada e os assets de `assets2d/`.
- Misture as 10 em épocas e temas: antiguidade, idade média, anos 1800, hoje, ciência, animais, invenções, desastres, leis absurdas, acidentes de sorte. **Se o pedido tiver `tema`, as 10 giram em torno dele.**
- Inclua de 2 a 3 ideias no modo `personagem`, com o elenco fixo, porque o canal já tem esse formato.

## Regras
- **Confira na web os fatos principais** (WebSearch) de tudo o que for apresentado como verdade, e ponha as fontes. Nada de lenda viral apresentada como fato; nesse caso, escreva "diz a lenda".
- Nenhuma pessoa real viva como alvo de piada. Nada gráfico, nada político.
- Histórias e personagens sempre originais. Nada de copiar o vídeo de outro criador.
- Português do Brasil, frases faladas e números por extenso no gancho.

## Terminar
Grave em `ideias/<id>.json` com `"estado": "pronto"` e as 10 ideias. Responda em uma linha.
