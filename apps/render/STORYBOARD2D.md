# Storyboard 2D (`storyboard2d.json`)

Estilo 2D flat do VideosHub, renderizado pelo Remotion. A tela é vertical, 1080×1920 px, e os tempos são **segundos desde o início do vídeo**.
O exemplo completo está em `videos/2026-11-21-tales-e-o-dinheiro-2d/storyboard2d.json`; copie o jeito dele.

```json
{
  "titulo": "Tales e o dinheiro",
  "duracao": 39.96,
  "audio": "narracao.wav",
  "legenda": { "cor": "#FFFFFF", "destaque": "#FF9F1C", "porVez": 3, "y": 1580 },
  "personagens": {},
  "cenas": [ ... ]
}
```

- `duracao` é a duração em `voz.json` mais 0,6 s.
- As cenas cobrem o vídeo **sem buracos**. A primeira começa em 0, cada uma começa no `fim` da anterior e a última termina em `duracao`.
- Cada cena tem de 2 a 5 s, nunca mais que 6.
- `personagens` pode ficar vazio. O render completa sozinho com `personagens/<id>/personagem.json` → `rig2d`. Hoje existem `tales` e `zeca`.

## Cena

```json
{ "inicio": 8.4, "fim": 11.64, "cenario": "rua_dia", "transicao": "flash",
  "zoom": [1, 1.05], "foco": [540, 1100], "tremor": [20.1, 20.7], "pretoEBranco": false,
  "atores": [...], "objetos": [...], "textos": [...] }
```

| Campo | Valores |
|---|---|
| `cenario` | `rua_dia`, `rua_noite`, `mercado` (com prateleiras e placa SUPERMERCADO), `sala` (casa: sofá, TV, janela), `estrada` (as árvores passam: use com a Paratí andando) |
| `transicao` | `corte` (padrão), `flash` (para mudar de capítulo), `deslize` (a cena entra pela direita) |
| `zoom` | `[início, fim]`. Para um close, use `[1.12, 1.28]` com `foco` no rosto, por exemplo `[540, 900]` |
| `tremor` | `[de, até]`: a tela treme, para batida, susto ou freio |
| `pretoEBranco` | `true` em momentos ruins ou dramáticos |

## Atores (personagens)

```json
{ "id": "tales", "x": [[8.4, 540], [10.7, 540], [11.6, 980]], "y": 1500, "altura": 900, "espelhar": false,
  "entra": "baixo", "poses": [[8.4, "pensando"], [9.8, "comemorando"]], "expressoes": [[8.4, "duvida"], [9.8, "feliz"]],
  "olhar": 0, "fala": [[14.3, 18.1]] }
```

- **Posição:**
  - `x` é a posição horizontal (0 a 1080) do centro dos pés. Com uma lista de `[tempo, x]`, o personagem **anda** de um ponto ao outro: as pernas se mexem e ele vira para o lado em que anda.
  - `y` é a linha do chão; o padrão é 1500.
  - `altura` padrão é 900. Use cerca de 700 para alguém ao fundo.
- **Entrada:** `entra` pode ser `baixo` (padrão: sobe com um pulinho), `esquerda`, `direita` ou `nenhum`. Use `nenhum` quando ele já entra andando ou num close.
- **Poses:** `neutro`, `apontando`, `bracos_abertos`, `pensando`, `maos_na_cintura`, `comemorando` (braços para cima) e `segurando` (mão à frente; ponha o objeto perto da mão, mais ou menos x+200, y−560).
- **Expressões:** `neutro`, `feliz`, `surpreso`, `bravo`, `triste`, `duvida`.
- **Fala:** `fala` marca os trechos em que **esse personagem** mexe a boca no ritmo da narração. Use só quando ele "diz" a frase, por exemplo junto com um `balao`. O narrador conta a história, então na maior parte do tempo ninguém mexe a boca.
- Mantenha cada personagem com o mesmo `id` em todo o vídeo. O visual vem da ficha, então ele sai sempre igual.

## Objetos

```json
{ "tipo": "relogio", "x": 790, "y": 760, "escala": 1.1, "aparece": 23.4, "some": 26, "giro": [[23.4, -12], [26.4, 8]] }
```

| `tipo` | O que é | Campos extras |
|---|---|---|
| `parati` | perua prata (o carro do Tales); `y` = chão (1480 na estrada, cerca de 1560 na rua) | `movendo` (rodas girando, chacoalha), `quebrado` (solta fumaça), `cor` |
| `dinheiro`, `moeda` | nota de R$ e moeda | |
| `relogio` | smartwatch | |
| `celular`, `caixa_som`, `skate`, `pneu` | objetos do dia a dia | `pneu`: `quebrado` = murcho; `skate`: `cor` |
| `balao` / `pensamento` | balão de fala ou de pensamento | `texto` (curto, até cerca de 20 letras) |
| `seta` | seta azul que balança | `direcao`: `cima`, `baixo`, `esquerda`, `direita` |
| `icone` | círculo com símbolo | `icone`: `x`, `v`, `!`, `?`, `$`, `coracao` |
| `placa` | placa num poste | `texto`, `cor` |

- `x`, `y` e `giro` aceitam um número ou uma lista `[tempo, valor]`, para o objeto voar, cair ou girar.
- `aparece` faz o objeto surgir com um "pop"; `some` o esconde.
- Deixe a faixa de y 1450 a 1700 livre de objetos importantes, porque é onde fica a legenda.

## Assets da biblioteca
Além dos cenários e objetos acima, use os criados no hub:
- **Objetos:** cada `assets2d/objetos/<slug>.svg` vira um `tipo`, como `{ "tipo": "carrinho_de_supermercado", "x": 700, "y": 1300, "escala": 1.4 }`. O desenho fica centrado no ponto.
- **Cenários:** cada `assets2d/cenarios/<slug>.svg` vira um `cenario`.
- **Personagens:** cada `personagens/<slug>/personagem.json` com `rig2d` pode entrar como ator pelo `id`.

Liste as pastas antes de montar as cenas. O validador aceita esses slugs.

## Textos na tela

| `estilo` | Onde | Para quê |
|---|---|---|
| `titulo` | topo | o gancho nos primeiros segundos |
| `carimbo` | etiqueta pequena no alto à esquerda | lugar ou tempo ("NO DIA SEGUINTE...", "SEG · TER · QUA") |
| `destaque` | amarelo e inclinado | uma ideia-chave curta ("SEM FREIO!") |
| `pergunta` | painel amarelo | a pergunta final para comentar (última cena) |

Os campos `de` e `ate` são opcionais; o padrão é a cena toda. Use poucos textos: a legenda já mostra o que é falado.

## Regras de qualidade
- Em toda cena alguma coisa se mexe: alguém anda, troca de pose, ou um objeto aparece ou voa. O validador avisa quando a cena está parada.
- A cena mostra o que a frase diz naquele momento (use `frases.json`).
- Troque de cenário ou de enquadramento a cada 1 ou 2 frases. Use `flash` nas viradas da história.
- Nada de marcas, logos ou personagens de terceiros.

## Comandos (da raiz do VideosHub)
```bash
node apps/render/render2d.mjs videos/<id> --validar    # erros e avisos
node apps/render/render2d.mjs videos/<id> --quadros    # 2 imagens por cena em render/quadros/ (olhe com Read)
```
