# Storyboard "Cartoon 3D" (`storyboard_cartoon.json`)

É o visual da skill cartoon-audio-short: personagens 2D com cabeça de feijão e contorno roxo-escuro, como figurinhas, dentro de um mundo 3D pintado com contorno de tinta preta, céu saturado, desfoque de lente e câmera que desliza. O motor vem de github.com/mromidev/claude-animated-shorts (MIT).

**Sem legenda por padrão.** Os tempos estão em segundos desde o início do vídeo, e as distâncias em metros. Um adulto mede cerca de 2,2 m na tela.

```json
{ "duracao": 39.96, "audio": "narracao.wav", "elenco": {},
  "cenas": [ { "inicio": 0, "fim": 3.4, "cenario": "vila", "luz": "dia", "transicao": "corte",
      "camera": [ { "t": 0, "pos": [0, 1.6, 6], "olha": [0, 1.4, 0], "fov": 40 }, { "t": 3.0, "pos": [0.5, 1.5, 4.2], "olha": [0, 1.5, 0] } ],
      "foco": { "desfoque": 12, "alvo": "tales" },
      "atores": [ { "id": "tales", "x": [[0, -1.6], [2.4, 0]], "z": 0.5, "expressoes": [[0, "sorriso"], [2.5, "sorrisao"]], "acoes": [[2.6, "acena"]] } ],
      "efeitos": [ { "tipo": "estrelas", "de": 2.0, "ate": 3.2, "pos": [0, 2.6, 0.5], "tamanho": 1 } ] } ] }
```

- `elenco` pode ficar vazio: o render completa com `personagens/<id>/personagem.json` → `cartoon`. Hoje existem `tales` e `zeca`.
- As cenas cobrem o vídeo **sem buracos**, com 2 a 6 s cada. Uma frase por cena, em geral; junte frases muito curtas.

## Cenários
| `cenario` | O que é | Onde fica cada coisa |
|---|---|---|
| `vila` | Rua de paralelepípedo ao longo do eixo x, com casas pintadas dos dois lados | Rua em z de −4 a 4; casas com a fachada em z ≈ ±6,5. Atores em z de −3 a 3. **Câmera com \|z\| < 7.** |
| `praca` | Praça aberta de paralelepípedo, com casas mais afastadas | Espaço livre em x e z de −14 a 14 |
| `campo` | Grama, árvores, morros, uma trilha de terra e uma casinha de fazenda | Trilha em z ≈ 0; casinha em (12, −14) |

Casas e árvores que ficariam entre a câmera e o ponto para onde ela olha **não são construídas**, então a câmera nunca atravessa parede. Mesmo assim, mantenha as câmeras dentro da rua.

## Luz
`luz`: `dia` (padrão, céu azul) ou `fim_de_tarde` (luz dourada baixa, sombras violeta, disco do sol). Use a luz para marcar as batidas da história: dia no normal, fim de tarde no drama ou no declínio. Para mudar a direção do sol, use `solAz` (graus a partir da frente da câmera: 0 = contraluz, 90 = vindo da direita) e `solEl` (altura em graus).

## Câmera
`camera` é uma lista de chaves `{ t, pos, olha, fov, roll }`. Entre uma chave e outra a câmera desliza suave. Depois da última, ela continua se aproximando devagar sozinha, porque **nada fica parado**.

**Quadro vertical é estreito:** a 4 m de distância, com `fov` 40, cabem só cerca de ±0,8 m de largura. Ponha um personagem em primeiro plano e outro mais ao fundo, nunca lado a lado longe.

| Plano | Exemplo para alguém em (0, 0) |
|---|---|
| Close (rosto) | pos `[0, 1.75, 2.4]`, olha `[0, 1.8, 0]`, fov 38 |
| Médio | pos `[0.4, 1.6, 4.2]`, olha `[0, 1.4, 0]` |
| Geral (situa) | pos `[-6, 4, 12]`, olha `[0, 1.5, 0]` (na `praca` ou no `campo`) |
| Aéreo | pos `[0, 18, 14]`, olha `[0, 0, 0]` |

- Deslizes de 0,6 a 1,5 s (18 a 45 quadros).
- `roll` de 3 a 5 graus para dar drama.
- Corte seco só em mudança de lugar ou de tempo, com `"transicao": "flash"` (clarão branco de 6 quadros).

## Foco (desfoque de lente)
`foco.desfoque` é o raio do desfoque em px a 1080. Use 12 a 16 em close, 10 a 12 em plano médio e 0 em geral ou aéreo, que ficam nítidos. `foco.alvo` é o id do ator, para focar nos olhos dele, ou um ponto `[x, y, z]`.

## Atores
- **Posição:** `x` e `z` são o lugar dos pés. Com chaves `[[t, valor], ...]`, o ator **anda** entre os pontos, com passo e balanço automáticos.
- **`expressoes`:** `neutro`, `serio`, `sorriso`, `sorriso_fechado`, `sorrisao`, `riso`, `assobio`, `nervoso`, `choque`, `alivio`, `alivio_aberto`, `tonto`, `dor`, `decepcao` (olhos meio fechados, boca para baixo).
- **`acoes`** (corpo atuando: use bastante, porque é o que dá vida):
  - `acena`, `comemora` (braços para cima), `pulo` (comemora pulando), `maos_cabeca` (desespero, susto grande), `decepcao` (mão na testa e cabeça caída: é a pose do **"Aaai, ai... esse Tales"**, que é **decepção resignada, não desespero**; use com a expressão `decepcao`), `abre` (braços abertos: "fazer o quê?"), `maos_cintura` (bronca, impaciência), `aponta` (para o lado ou para algo), `pensa` (mão no queixo), `segura` (mão à frente, segurando um objeto: ponha o objeto perto da mão);
  - `tremer` (susto), `senta`, `cai` e `parado`.
- **Troque a expressão e a ação a cada batida da frase.** Um personagem que fala por 3 s com a mesma cara fica sem vida: em geral, 2 ou 3 mudanças por cena.
- **Outros campos:** `olhar` vai de −1 a 1 e diz para onde os olhos apontam. `escala` aceita 0,8 para criança. `espelhar` vira o personagem.
- Os personagens **sempre** ficam de frente para a câmera e piscam sozinhos.

## Objetos (`objetos`): ilustre o que a frase cita
```json
{ "tipo": "parati", "x": [[18.2, -12], [20.4, 6]], "z": -1.5, "movendo": true }
{ "tipo": "relogio", "x": 0.5, "y": 1.6, "z": 0.3, "escala": 0.5, "aparece": 23.4, "texto": "12:00" }
{ "tipo": "balao", "x": -0.6, "y": 2.9, "z": 0, "texto": "TÔ SEM DINHEIRO!", "aparece": 14.6, "some": 18 }
```
- **Peças 3D**, que recebem a tinta, a luz e a sombra: `parati` (a perua prata do Tales; com `movendo` as rodas giram e ela aponta para onde anda), `caixa_som`, `banco`, `poste`, `cone`, `mesa`, `caixote`, `pneu`, `caminhao` (anos 1930, carroceria aberta com metralhadora presa, frente para +x, ~4,4 m; aceita `movendo`; assoalho da carroceria em y ≈ 0,8), `metralhadora` (de tripé, cano para +x), `tanque_de_guerra` (~3 m, canhão para +x), `plantacao_de_trigo` (touceira de ~0,8 m: espalhe várias para fazer a lavoura), `torre_de_pisa` (~12 m de altura, 4 m de largura, tomba para +x; `etapa` de 0 a 1 sobe andar por andar, 3/8 = obra com 3 andares; `inclinacao` em graus, padrão 4; os dois aceitam chaves), `esponja_molhada` (0,5 m, com gotas e poça) e `terra_retirada` (monte de terra de ~1,4 m com a pá fincada). Campos `x`, `z`, `y`, `giro` (graus), `escala` e `cor`.
- **Ator montado:** `y` (altura dos pés, aceita chaves) põe o ator em cima de algo, como a carroceria; `"andar": false` faz ele deslizar junto com o veículo sem dar passos.
- **Figurinhas 2D**, que ficam sempre de frente para a câmera: `dinheiro`, `moeda`, `relogio` (smartwatch; `texto` = hora), `celular` (`texto`), `balao` e `pensamento` (`texto` curto, até ~20 letras), `icone` (`icone`: `!`, `?`, `x`, `v`, `$`, `coracao`) e `seta`. O padrão é `y` 2,2 e `escala` 1 (~0,8 m). Perto da mão do ator: `y` ≈ 1,3, `escala` 0,4 a 0,6.
- `aparece` faz o objeto surgir com um "pop"; `some` o esconde. `x`, `y`, `z` e `giro` aceitam chaves `[t, valor]` (dinheiro voando, carro passando).
- **Texto na cena só em balão, placa ou tela** (legenda não). Escreva em maiúsculas e curto.

## Efeitos (figurinhas 2D na cena)
`efeitos`: `estrelas` (tontura ou ideia), `explosao` (impacto ou revelação), `notas` (música ou assobio) e `poeira` (passos ou queda), com `de`, `ate`, `pos` (perto da cabeça: y ≈ 2,6) e `tamanho`.

## Regras
- Ilustre cada frase literalmente. Varie o plano: gancho em close → geral revelando → plano a dois → close no objeto → reação → movimento no desfecho.
- Cada reação visual cai de 0 a 3 quadros **antes** da palavra (use `palavras.json`).
- Na frase da virada, use um movimento forte (aproximação com `roll`) e, se fizer sentido, a luz `fim_de_tarde`.

## Comandos (da raiz do VideosHub)
```bash
node apps/render/render2d.mjs videos/<id> --cartoon --validar
node apps/render/render2d.mjs videos/<id> --cartoon --quadros    # olhe os PNGs com Read
```
