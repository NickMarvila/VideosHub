# /video · etapa narracao

**Vídeos com `"fluxo": 2`:** o áudio é frase por frase, em `<status.pasta>/audio/frases.json`. Para um ajuste, edite só os campos `texto`, `energia`, `pausa` e `efeito` das frases citadas; não mexa em `takes` nem em `escolhido`. Devolva com `"etapa": "narracao"` e `"estado": "aguardando_aprovacao"`. O painel mostra essas frases como alteradas, e o criador manda gravar.

**Vídeos antigos (sem `fluxo`):** esta etapa só chega à IA quando houver um ajuste de narração. Para ajustes de texto, edite `narracao.txt` e devolva para a etapa **roteiro** (`"etapa": "roteiro"`). Assim o criador aprova o texto e o painel gera a voz de novo. Para ajustes de voz (timbre, emoção), não mude nada: explique que isso se escolhe na voz do vídeo e deixe um registro no histórico.
