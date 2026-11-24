# /video · etapa roteiro

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
