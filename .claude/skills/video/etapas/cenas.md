# /video · etapa cenas

**Regra de custo (vale para tudo abaixo):** você **não abre imagens** (PNG de quadro, miniatura, clipe). A conferência é pelo texto do validador, que aponta quem saiu do quadro, câmera dentro de objeto, objeto citado que falta na cena etc. Corrija pelo texto e rode de novo. Não rode `--quadros`. Quem olha o resultado é o criador, no painel.

**Como trabalhar (o painel só libera estes comandos):**
- Escreva `cenas/variantes.json` **direto com Write** (um arquivo só, de uma vez). **Não** crie script gerador (`_gerar_cenas.mjs` etc.): você não tem permissão para rodá-lo.
- Para validar, rode **sozinho**, sem `cd`, `;`, `&&` nem `|`, a partir da raiz: `node pipeline/cenas.mjs validar <status.pasta>`. Qualquer outro comando é bloqueado.
- Corrija com Edit só as cenas apontadas. O alvo é terminar em 1 ou 2 validações.

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
- **Uma variante por cena** (`c01-a`), marcada como `recomendada`. O criador pede outra só quando não gostar.
- Os ids de `frases` vêm de `frases.json` (campo `id`, por exemplo `f03`). `inicio` e `fim` da cena seguem as frases, e as cenas cobrem o vídeo sem buracos.
- Os tempos dentro de `cena` (`de`, `ate`, `aparece`, chaves de `x`...) são absolutos, como no storyboard normal.
- Valide com `node pipeline/cenas.mjs validar <status.pasta>` até não sobrar nenhum erro. Ele testa todas as variantes.
- Não gere os clipes: o painel gera sozinho quando você devolver. Escreva `postagem.md` e o `status.capaEm` normalmente.
- **Ajuste de uma cena só ("pedir outra"):** leia só `variantes.json` (não releia roteiro, guias nem outras cenas). A cena com `ajustes` não resolvido recebe **uma variante nova**, com o id seguinte (`c03-b`), seguindo o pedido. Em geral basta trocar o `momento`, o `alvo`, o `lado`, o cenário ou as ações. Marque-a como `recomendada` (e tire a marca das antigas), marque o ajuste como resolvido também em `status.portoes.cenas.ajustes`, valide e devolva com `"etapa": "cenas"` e `"estado": "aguardando_aprovacao"`. Não mexa nas outras cenas nem em `escolhida`.

**Vídeos antigos (sem `fluxo`):** veja o motor do estilo em `estilos/<status.estilo>/estilo.json` → `motor`:
- `"remotion"` (2D flat): siga **2D** abaixo.
- `"kit3d"` (3D low-poly): siga **3D**.

**Cartoon 3D (`motor: cartoon`): use modelos de cena, não escreva câmera.** Leia `apps/render/STORYBOARD_CARTOON.md` uma vez por sessão. Cada `cena` leva um `momento`, e o render calcula sozinho câmera, foco e posições:
```json
{ "momento": "mostrar", "cenario": "praca", "luz": "dia", "alvo": "console_de_videogame",
  "atores": [ { "id": "hacker_encapuzado", "expressoes": [[5.6, "serio"]], "acoes": [[6.2, "aponta"]] } ],
  "objetos": [ { "tipo": "console_de_videogame", "escala": 2.6 }, { "tipo": "pc_gamer", "aparece": 8.0 }, { "tipo": "icone", "icone": "x", "aparece": 8.5 } ] }
```
- **`momento`** (lista completa em `config/regras-camera.json`):
  - `gancho`: 1ª cena;
  - `situa`: plano geral do lugar;
  - `medio`: fala comum;
  - `close`: reação;
  - `escalada`, com `"batida": 1, 2, 3`: fica mais perto a cada batida;
  - `pensa_comigo`: **obrigatório** na frase "Pensa comigo", faz zoom in;
  - `mostrar`: zoom out revelando o objeto que tem `aparece`;
  - `virada`: close seco com tremidinha, para a virada e o bordão;
  - `dialogo`, com `"falas": [[t, "id"], ...]`: alterna entre quem fala.
- **`alvo`**: id do ator ou `tipo` do objeto que a câmera mostra. O padrão é o 1º ator, ou a 1ª peça 3D. **`lado`** (de −1 a 1) muda o ângulo.
- **Posições:** omita `x` e `z`. O alvo fica no centro, o resto vai atrás e para os lados, e as figurinhas ficam acima do alvo. Ponha `x` e `z` só quando algo **anda** (chaves) ou precisa de um lugar exato.
- Você escreve o que dá vida: `expressoes`, `acoes`, `aparece`, `efeitos`, `texto` de balão e `luz`.
- **Modo livre** (raro): uma cena com `camera` própria ignora o `momento`. Use só se nenhum modelo servir e diga isso no resumo.
- Se o validador disser que algo ficou fora do quadro, troque o `alvo` ou o `momento`, ou dê `x`/`z` mais perto do alvo.
- **Regra de câmera que se repete nos ajustes do criador** (ex.: "mais perto" 3 vezes no mesmo tipo de momento): **não** mude `config/regras-camera.json`. Escreva no resumo uma sugestão de regra para ele aprovar com `/camera`.

Também valem as regras de antes: É igual ao 2D, mas o arquivo é `storyboard_cartoon.json` (ou o `cena` de cada variante, no fluxo 2), e os comandos levam `--cartoon`: `node apps/render/render2d.mjs <status.pasta> --cartoon --validar` (no fluxo 2, `node pipeline/cenas.mjs validar <status.pasta>`). Com legenda (ligada por padrão). A trilha de marcha para na virada: grave `trilha.json` → `musica.paraEm` no segundo da virada.

**Objeto que o estilo ainda não tem (padrão, vale para todo vídeo):** a lista de objetos do guia (`STORYBOARD_CARTOON.md` ou `STORYBOARD2D.md`) é a fonte da verdade. Não leia o código do motor para descobrir o que existe.
- Se um item do `assets.json` existe só no kit 3D (`Kit_Video_3d/assets/scenery/hub/<slug>.js`) e não está no guia do cartoon, implemente-o **uma vez**: entrada em `OBJETOS_3D` e no `criar` de `apps/render/src/cartoon/objetos.ts` (copie as medidas e cores do módulo do kit; params novos vão em `apps/render/src/cartoon/tipos.ts`). Leia só esses dois arquivos e o módulo do kit, nada mais do motor.
- **Na mesma rodada, documente no guia:** acrescente o objeto à lista de "Peças 3D" do `STORYBOARD_CARTOON.md` (ou à lista de objetos do `STORYBOARD2D.md`) com tamanho em metros, para onde fica a frente e os campos que ele aceita, no mesmo formato das outras. No cartoon, acrescente também `"<slug>": [altura, largura, profundidade]` em `config/tamanhos-cartoon.json` (os modelos de câmera enquadram por esse tamanho). Assim o próximo vídeo usa sem abrir código.
- Se o objeto não existe em lugar nenhum, não invente no motor: ele deveria ter vindo da Biblioteca (`assets.json` → "na hora" ou "3 opções"). Represente com o que existe e diga isso no resumo.

**2D (`motor: remotion`)**: leia `apps/render/STORYBOARD2D.md` uma vez por sessão.
1. Use `frases.json` para alinhar as cenas e escreva `plano-animacao.md`, com uma linha por frase: cenário, quem age, o que se move e o que aparece.
2. Escreva `storyboard2d.json` em `status.pasta`. Use os cenários, poses e objetos do guia; não invente nomes.
3. Rode `node apps/render/render2d.mjs <status.pasta> --validar` até não sobrar nenhum erro.
4. Escreva `postagem.md` (modelo em `Kit_Video_3d/docs/postagem.md`) e grave o instante da capa em `status.capaEm`.

**3D (`motor: kit3d`)**: siga `Kit_Video_3d/AGENTE.md` (seções 3 a 7) e os docs dele: `catalog/RESUMO.md`, `docs/processos.md` e `docs/storyboard.md`. Leia cada um uma vez por sessão.

1. Use `frases.json` (gerado pelo painel junto com a voz) para alinhar as cenas.
2. Escreva `plano-animacao.md`, com uma linha por frase.
3. Escreva `storyboard.json` com `audio: "narracao.wav"`, `palavras: "palavras.json"` e `duracao` igual à duração em `voz.json` mais cerca de 0,5 s. Fundo e chão vêm do estilo em `estilos/<estilo>/estilo.json` (`kit`). A legenda vai de 2 a 3 palavras por vez (padrão do motor: não ponha `palavrasPorBloco`, ou use 3), com a palavra falada em `corDestaque` do estilo.
4. Rode `node Kit_Video_3d/tools/validar.mjs projects/<pasta-do-projeto>` até não sobrar nenhum erro.
5. Escreva `postagem.md` seguindo `Kit_Video_3d/docs/postagem.md`.
6. Escolha o instante da capa e grave em `status.capaEm` (segundos).

Limitações conhecidas do kit:
- **Não use `anim.pos`**: o motor tem um bug (`chavesVec is not defined`). Use `movimentos` no lugar.
- Não altere `engine/` nem os assets.
- Rode os comandos a partir da raiz do VideosHub, com os caminhos acima. O argumento do projeto é relativo ao kit: `projects/<nome>`.
