---
name: biblioteca
description: Cria assets novos para a biblioteca do VideosHub (personagens 2D+3D, objetos 2D+3D, cenários 2D) a partir de um pedido do painel, sempre com 3 opções para o criador escolher. Use quando o usuário digitar /biblioteca <pedido> ou pedir um personagem, objeto ou cenário novo para os vídeos.
---

# /biblioteca: criar assets para os vídeos

O pedido está em `biblioteca/pedidos/<id>/pedido.json`: `tipo` (personagem, objeto ou cenario), `nome`, `slug`, `descricao`, `referencia` (imagem opcional na mesma pasta), `permissao` e `ajustes`.
Você entrega **3 opções** em `biblioteca/pedidos/<id>/opcoes/1`, `/2` e `/3`. O painel desenha as miniaturas e o criador escolhe uma.

## Regras que valem sempre
- **Personagem e traço originais.** Nada de personagens, marcas ou logos de terceiros.
- **Referência:** se houver `referencia`, abra a imagem com Read e crie uma versão **original** no traço do estilo, sem copiar. Se a imagem for de uma pessoa real, só use a aparência dela se `permissao` for `true`; senão, faça um personagem genérico e diga isso no histórico.
- **As 3 opções são diferentes de verdade** (paleta, silhueta, acessórios), e todas atendem a descrição.
- **Ajustes:** se `ajustes` tiver itens não resolvidos, é um pedido de refazer. Crie 3 opções **novas** com os números seguintes (4, 5, 6...), sem apagar as antigas, e marque os ajustes como resolvidos.

## Personagem (2D + 3D juntos)
`opcoes/<n>/personagem.json`:
```json
{ "slug": "dona_cida", "nome": "Dona Cida", "papel": "vizinha fofoqueira", "personalidade": "...", "bordao": "",
  "rig2d": { "pele": "#E2B48C", "camisa": "#7FB3D5", "calca": "#3B3F55", "sapato": "#5A3B26", "olhos": "#231B18",
             "chapeu": { "tipo": "nenhum", "cor": "#000" }, "cabelo": "#B9B4AE", "barba": false, "bigode": false, "detalhe": "lenco", "corDetalhe": "#C0392B" },
  "kit3d": { "preset": "velhinha", "overrides": { "skin": "#e2b48c", "top": { "color": "#7fb3d5" }, "hair": { "style": "bun", "color": "#b9b4ae" }, "face": { "glasses": true } } } }
```
- **`slug`:** minúsculas, números e `_`. Ele não pode existir em `personagens/`.
- **`rig2d`:** os campos do tipo `Visual` em `apps/render/src/personagem/Personagem.tsx`. Leia esse arquivo.
- **`kit3d`:** um preset e os `overrides` de `Kit_Video_3d/catalog/RESUMO.md` (seção Personagens). Use **as mesmas cores** do 2D, para ser reconhecível nos dois estilos.
- **Peça que o boneco 2D ainda não tem** (óculos, cabelo comprido, avental, saia, corpo mais largo...):
  - Amplie o `Personagem.tsx` com um campo **opcional** novo no `Visual`. Sem o campo, o desenho continua idêntico, então o Tales e o Zeca não mudam.
  - Rode `npx tsc --noEmit -p apps/render` até não sobrar nenhum erro.
  - Registre em `pedido.json` → `"extensaoRig": "o que foi acrescentado"`.
  - Só amplie quando a descrição pedir de verdade.

## Objeto (2D + 3D)
1. **2D:** `opcoes/<n>/objeto2d.svg`:
   - `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400">`, com o desenho **centrado em (0,0)** e cerca de 200 a 260 px de largura.
   - Traço flat do estilo: cores chapadas, contorno `#1E2227` com 6 a 10 de espessura, sem gradiente e sem texto (a não ser que o objeto precise).
   - Veja os objetos existentes em `apps/render/src/video2d/Objetos.tsx`.
2. **3D (recomendado):** `opcoes/<n>/objeto3d.js`, um módulo do kit:
   ```js
   import { register, bx, cyl, ball, wheel, mesh, rbox, sphere, cylinder } from '../kit.js';
   register('__ID__', {
     category: 'objetos', label: 'Nome', description: 'O que é, tamanho aproximado em metros.',
     params: { color: ['#f2c94c', 'cor principal'] }, variants: {},
     make(g, p) { bx(g, p.color, 0.6, 0.4, 0.4, 0, 0, 0); /* peças low-poly empilhadas, centradas no chão, frente para +Z */ },
   });
   ```
   - Use exatamente `register('__ID__', ...)`: o hub troca pelo slug ao publicar.
   - `bx(g, cor, largura, altura, profundidade, x, y, z)` e `cyl(g, cor, raioTopo, raioBase, altura, x, y, z)` têm a base em `y`. `ball(g, cor, raio, x, y, z)` tem o centro.
   - Veja exemplos em `Kit_Video_3d/assets/scenery/props.js`. Escala real: um adulto mede 1,72 m.
3. O `slug` do objeto é o do `pedido.json`.

## Cenário (2D)
`opcoes/<n>/cenario2d.svg`, com `viewBox="0 0 1080 1920"` (tela vertical inteira). Veja `apps/render/src/video2d/Cenarios.tsx`.
- O chão (piso, rua ou grama) começa por volta de y 1370 e vai até o fim. Os personagens pisam em y 1500.
- Deixe o miolo (x de 200 a 880, y de 500 a 1500) mais limpo: é onde ficam os personagens.
- O topo (y abaixo de 300) é onde ficam os títulos.
- Use traço flat, com cores do estilo, e no máximo cerca de 60 formas.
- No 3D, cenário é montado com peças do catálogo do kit e não precisa de arquivo.

## Terminar
1. Rode `node pipeline/biblioteca.mjs validar <id>` até aparecer "Opções OK."
2. Edite `pedido.json`:
   - `"estado": "aguardando_escolha"`;
   - `"opcoes": [{ "n": 1, "descricao": "uma linha dizendo o que diferencia esta opção" }, ...]`, com todas as opções, incluindo as antigas;
   - marque os ajustes atendidos com `"resolvido": true`.
3. Responda em 2 ou 3 linhas, em português. As miniaturas são geradas pelo painel.
