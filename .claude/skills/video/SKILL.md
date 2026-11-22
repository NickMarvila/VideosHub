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

**O "Aaai, ai... esse Tales" é decepção, não desespero.** É o suspiro resignado de quem já conhece o personagem:
- **Leitura:** energia `calma`, efeito `suspiro` e pausa antes do bordão.
- **Imagem:**
  - no Cartoon 3D: pose `decepcao` (mão na testa, cabeça caída) com a expressão `decepcao`;
  - no 2D: expressão `triste` ou `duvida`, sem pose de desespero;
  - no 3D do kit: `shake_head` com a expressão `sad`.
- Nunca use mãos na cabeça, susto ou tremor nesse momento.

**Fórmula do roteiro** (vale para todo vídeo; a ideia pode ter vindo de `/ideias`). Leia `docs/receitas-roteiro.md` uma vez por sessão: lá estão as 9 receitas de gancho, os ganchos internos e o "Pensa comigo".
1. **Gancho na frase 1, sem introdução,** usando **uma** receita de gancho (G1 a G9, por exemplo "E se… aconteceu de verdade?"), com até 12 palavras. A frase 2 fecha a porta ("Aconteceu. Em mil quinhentos e dezoito."). Não repita a receita dos 2 vídeos anteriores (veja a linha "Receita do gancho" nas `sinopse.md` mais recentes em `videos/`).
2. **Cenário em 1 ou 2 linhas:** quando, onde e quem, com um detalhe concreto.
3. **Escalada de 2 a 4 batidas**, cada uma maior que a anterior, com 2 ou 3 ganchos internos ("Só que tinha um problema."). Os outros duvidam ou zombam, e entra **uma** piada de exagero.
4. **"Pensa comigo" (obrigatório, exatamente 1 por vídeo, entre 40 e 70 % do texto):** a explicação do mecanismo real começa **sempre** com "Pensa comigo", o nome do canal virando bordão. Depois vêm de 1 a 3 frases com uma comparação do dia a dia. Na `marcacao.json`, "Pensa comigo." é uma frase própria, `calma`, com pausa de 0,5 a 0,7. Nas cenas, esse momento tem cara própria: aproxima, alguém aponta e a comparação aparece na tela.
5. **Virada:** curta e irônica, as **últimas palavras** antes da pergunta final.
- Em `sinopse.md`, escreva as linhas **"Receita do gancho: G1 · E se… que virou real"** e **"Pensa comigo: {a comparação usada}"**.
- **3 opções de gancho (obrigatório em todo roteiro):** o criador escolhe a primeira frase no painel. Escreva `<status.pasta>/ganchos.json`:
  ```json
  { "aplicado": { "gancho": "Uma guerra salvou a torre mais famosa da Itália.", "porta": "De cair." },
    "escolhido": 1,
    "opcoes": [
      { "n": 1, "receita": "G3 · Fato absurdo seco", "gancho": "Uma guerra salvou a torre mais famosa da Itália.", "porta": "De cair.", "porque": "o contraste guerra × salvar prende antes de dizer qual torre", "recomendado": true },
      { "n": 2, "receita": "G1 · E se… que virou real", "gancho": "E se uma guerra salvasse um prédio de cair?", "porta": "Aconteceu. Em Pisa.", "porque": "…" },
      { "n": 3, "receita": "G4 · Número que não cabe", "gancho": "Uma obra parou por quase cem anos. E isso salvou a torre.", "porta": "", "porque": "…" } ] }
  ```
  - **3 receitas diferentes** (G1 a G9), cada gancho com até 12 palavras, verdadeiro e pago no vídeo. `porta` é a frase que fecha a porta (pode ser `""` se o gancho já tem duas frases).
  - A opção `recomendado` é a que você usou: `aplicado` tem que ser **exatamente** o começo de `narracao.txt` e as primeiras entradas de `marcacao.json` (gancho e porta como frases próprias). O painel troca esse começo quando o criador escolhe outra opção ou escreve o próprio gancho.
  - `porque`: uma linha dizendo o que prende naquele gancho, para o criador decidir.
  - **Ajuste que começa com "Ganchos:"** pede só opções novas: reescreva `ganchos.json` com 3 opções diferentes das anteriores, aplique a recomendada no começo de `narracao.txt` e `marcacao.json` (atualize `aplicado`, `escolhido` e a linha "Receita do gancho" da sinopse) e não mexa no resto do roteiro.
  - Em qualquer outro ajuste do roteiro, mantenha `ganchos.json` coerente: se mudar o começo da narração, atualize `aplicado`.
- **Nunca descreva o que a imagem já mostra.** Português falado, frases de 8 a 15 palavras e números por extenso.
- **Fatos:** se a história for apresentada como real, confira os fatos principais na web (WebSearch) e anote as fontes em `sinopse.md`. Lenda é tratada como lenda ("diz a lenda que...").
- Se a ideia veio de `/ideias`, use o gancho e a virada dela como ponto de partida.

**Marcação da leitura (vídeos com `"fluxo": 2` no status):** escreva também `marcacao.json` em `status.pasta`. É uma lista com **uma entrada por frase**, na ordem do texto:
`[{ "texto": "E no dia seguinte?", "energia": "normal", "pausa": 0.55, "efeito": "risada" }, ...]`
- `energia`: `calma` (confidência, suspense), `normal` ou `animada` (surpresa, exagero, o "pulo" da piada).
- `pausa`: segundos de silêncio depois da frase, de 0 a 2. Use cerca de 0,3 no fluxo normal, de 0,6 a 1,0 antes da virada ou do bordão, e 0 para emendar frases.
- `efeito`: `nenhum`, `risada` (no fim da frase, logo depois da piada) ou `suspiro` (antes da frase, como no "Aaai, ai...").
- O `texto` não leva marcações `[laughter]` nem `[sigh]`: o efeito vai no campo `efeito`. Use de 2 a 4 efeitos por vídeo.

**Assets que o roteiro pede (sempre, em todo estilo):** o vídeo não pode ficar vazio. Liste em `<status.pasta>/assets.json` **cada coisa concreta que a narração mostra** (objeto, personagem, cenário): o "vidro" de que a história fala, o carro, a loja...
```json
{ "itens": [
  { "id": "vidro", "nome": "vidro", "tipo": "objeto", "descricao": "Placa de vidro transparente azulada, com reflexo branco na diagonal, ~1 m", "momento": "f04: o vidro quebra",
    "existe": false, "usa": null },
  { "id": "tales", "nome": "Tales", "tipo": "personagem", "descricao": "personagem fixo", "momento": "todo o vídeo", "existe": true, "usa": "tales" } ] }
```
- `tipo`: `objeto`, `personagem` ou `cenario`. `id`: minúsculas e `_`.
- **`existe`/`usa`:** confira de verdade no estilo do vídeo:
  - **2D e cartoon:** os objetos e cenários nativos de `apps/render/STORYBOARD2D.md` (e `STORYBOARD_CARTOON.md`), mais `assets2d/objetos/*.svg` e `assets2d/cenarios/*.svg`;
  - **3D:** `Kit_Video_3d/catalog/RESUMO.md` e `Kit_Video_3d/assets/scenery/hub/*.js`;
  - **personagens:** `personagens/<slug>/`.
  Se houver algo que represente bem (ex.: `garrafa` para "garrafa de vidro"), marque `existe: true` e o nome em `usa`. Se não houver, `existe: false`: o criador decide no painel se a IA cria na hora, se cria com 3 opções ou se segue sem.
- `descricao`: uma frase visual, que a /biblioteca vai usar para desenhar (cor, forma, tamanho). Não liste o que é só fala ou ideia abstrata; liste só o que aparece na tela. Coisas que se resolvem com texto ou ícone (`icone`, `placa`, `balao`) não entram.
- **Ajuste no roteiro:** reescreva a lista, mas **mantenha** os campos `pedido` e `decisao` dos itens que continuam (são o que o criador já decidiu).

**Emoção na voz:** o narrador (OmniVoice) entende as marcações `[laughter]` (risada) e `[sigh]` (suspiro) no meio do texto. Elas não aparecem na legenda. Use de 2 a 4 por vídeo, nos momentos de humor: depois da piada, antes do bordão ("[sigh] Aaai, ai... Esse Tales. [laughter]"). Não use outras marcações.

### narracao
**Vídeos com `"fluxo": 2`:** o áudio é frase por frase, em `<status.pasta>/audio/frases.json`. Para um ajuste, edite só os campos `texto`, `energia`, `pausa` e `efeito` das frases citadas; não mexa em `takes` nem em `escolhido`. Devolva com `"etapa": "narracao"` e `"estado": "aguardando_aprovacao"`. O painel mostra essas frases como alteradas, e o criador manda gravar.

**Vídeos antigos (sem `fluxo`):** esta etapa só chega à IA quando houver um ajuste de narração. Para ajustes de texto, edite `narracao.txt` e devolva para a etapa **roteiro** (`"etapa": "roteiro"`). Assim o criador aprova o texto e o painel gera a voz de novo. Para ajustes de voz (timbre, emoção), não mude nada: explique que isso se escolhe na voz do vídeo e deixe um registro no histórico.

### cenas
**Antes de tudo, leia `<status.pasta>/assets.json`** (se existir). Cada item com `existe: true` tem em `usa` o slug que você **deve** usar na cena em que ele aparece:
- no 2D/cartoon, um objeto da biblioteca vira `tipo` (`{ "tipo": "<slug>", ... }`) e um cenário vira `cenario`;
- no 3D, o objeto vira a peça `<slug>` do hub.

Se o item tem `pedido` mas ainda não tem `usa`, leia `biblioteca/pedidos/<pedido>/pedido.json`: com `estado: "concluido"`, o slug está em `slug`. Itens com `decisao: "improvisar"` são representados com o que já existe (forma livre, ícone, objeto parecido), **nunca deixados de fora**. Toda frase que mostra algo concreto precisa ter esse algo na cena.

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

**Cartoon 3D (`motor: cartoon`)**: é o modelo da skill cartoon-audio-short. Leia `apps/render/STORYBOARD_CARTOON.md` uma vez por sessão. É igual ao 2D, mas o arquivo é `storyboard_cartoon.json` (ou o `cena` de cada variante, no fluxo 2), e os comandos levam `--cartoon`: `node apps/render/render2d.mjs <status.pasta> --cartoon --validar` e `... --cartoon --quadros`. Sem legenda. A trilha de marcha para na virada: grave `trilha.json` → `musica.paraEm` no segundo da virada.

**Objeto que o estilo ainda não tem (padrão, vale para todo vídeo):** a lista de objetos do guia (`STORYBOARD_CARTOON.md` ou `STORYBOARD2D.md`) é a fonte da verdade. Não leia o código do motor para descobrir o que existe.
- Se um item do `assets.json` existe só no kit 3D (`Kit_Video_3d/assets/scenery/hub/<slug>.js`) e não está no guia do cartoon, implemente-o **uma vez**: entrada em `OBJETOS_3D` e no `criar` de `apps/render/src/cartoon/objetos.ts` (copie as medidas e cores do módulo do kit; params novos vão em `apps/render/src/cartoon/tipos.ts`). Leia só esses dois arquivos e o módulo do kit, nada mais do motor.
- **Na mesma rodada, documente no guia:** acrescente o objeto à lista de "Peças 3D" do `STORYBOARD_CARTOON.md` (ou à lista de objetos do `STORYBOARD2D.md`) com tamanho em metros, para onde fica a frente e os campos que ele aceita, no mesmo formato das outras. Assim o próximo vídeo usa sem abrir código.
- Se o objeto não existe em lugar nenhum, não invente no motor: ele deveria ter vindo da Biblioteca (`assets.json` → "na hora" ou "3 opções"). Represente com o que existe e diga isso no resumo.

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
