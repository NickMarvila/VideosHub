# VideosHub — Plano (v1)

Fábrica pessoal de vídeos curtos com IA para os seus próprios canais (IG / YT / TikTok).
Personagens 2D **persistentes** sobre cenários 3D, narração local, legenda automática,
4 portões de aprovação e agendamento.

## Decisões fechadas (grill de 2026-11-20)

| Tema | Decisão |
|---|---|
| Público | Uso pessoal, 1 usuário, sem login nem billing |
| Visual | Personagem **2D flat minimalista** (referência: Ideias/personagem, estilo storytime de sobrevivência), com personagens ORIGINAIS. Cenário **2D flat escuro** e **3D** são estilos diferentes no cardápio |
| Persistência | **Rig vetorial SVG/React** (`apps/render/src/personagem/Personagem.tsx`): personagem = objeto `Visual` (cores, chapéu, barba, detalhe) + pose/expressão/boca como parâmetros, e voz salva como perfil. A IA nunca desenha o personagem |
| Criação de personagem | A IA (Qwen-Image) gera conceitos → escolha → eu traduzo para `Visual` do rig → aprova |
| Formato narrativo | Indefinido: vídeos soltos, com a estrutura pronta para virar série (Dia N, continuidade) |
| Voz | [debpalash/VoiceStudio](https://github.com/debpalash/voicestudio), local na RTX 5060 Ti 16GB |
| Formato | 9:16 (padrão) + 16:9 opcional |
| Legenda | PT-BR palavra a palavra (estilo CapCut/Hormozi), timing via Whisper |
| Estilos | "Cardápio de Estilos" com nota 1–5; notas 4–5 aparecem como 3 opções por vídeo. Começa com ~10 |
| Interface | **Claude Code** (pedido + roteiro, via assinatura) + **painel web local** (aprovar, cardápio, agenda) |
| Aprovações | Roteiro+estilo → Cenários 3D → Narração → Vídeo final |
| Publicação | Fila de **agendamento** com auto-post |
| Tokens | RTK (já instalado, v1.1.0) em todo comando shell do Claude Code |

## Fluxo de um vídeo

```
/novo-video "Zeca descobre uma piscina numa caçamba"
   │
   ▼
1. ROTEIRO (Claude Code)  → roteiro.json: cenas, falas por personagem, emoção, duração
   + escolhe 3 estilos do cardápio (nota 4–5)
   ◆ PORTÃO 1: aprova roteiro + escolhe estilo        [painel]
   ▼
2. CENÁRIOS 3D (ComfyUI local) → 1 imagem por cena, prompt = estilo + descrição
   (opcional: parallax com depth map para dar movimento de câmera)
   ◆ PORTÃO 2: aprova / regera cena a cena            [painel]
   ▼
3. NARRAÇÃO (VoiceStudio) → 1 wav por fala, com a voz salva no kit do personagem
   ◆ PORTÃO 3: ouve / regera fala                      [painel]
   ▼
4. SYNC automático
   - Whisper → timestamps palavra a palavra (legenda)
   - Rhubarb Lip Sync → visemas (qual boca em cada frame)
   ▼
5. RENDER (Remotion) → cenário + personagem do kit (pose/expressão/boca)
   + legenda animada + transições/música do estilo → MP4 9:16 (e 16:9)
   ◆ PORTÃO 4: assiste e aprova                        [painel]
   ▼
6. AGENDA → legenda do post + hashtags → fila → auto-post IG / YT / TikTok
```

## Estrutura de pastas proposta

```
VideosHub/
├─ personagens/<slug>/          # o "kit" que garante persistência
│   ├─ personagem.json          # nome, personalidade, voz_id, paleta, regras
│   ├─ referencia.png           # arte mestre aprovada
│   ├─ poses/  expressoes/  bocas/   # PNGs transparentes (bocas: A,B,C,D,E,F,G,X do Rhubarb)
│   └─ voz/                     # amostra + embedding do VoiceStudio
├─ estilos/<slug>/estilo.json   # prompt de cenário, paleta, fonte, transição, música, nota 1–5
├─ videos/<data>-<slug>/        # um projeto por vídeo
│   ├─ roteiro.json  status.json
│   ├─ cenas/  audio/  sync/  render/
├─ apps/painel/                 # web local (aprovação, cardápio, agenda)
├─ apps/render/                 # projeto Remotion
├─ pipeline/                    # scripts Python: comfy, voz, whisper, rhubarb, publicar
└─ .claude/skills/              # /novo-video, /novo-personagem, /novo-estilo
```

`status.json` registra em qual portão o vídeo está. É o contrato entre o Claude Code, o painel e os scripts.

## Skills externas recomendadas (pesquisa)

- **remotion-dev/skills** (`npx skills add remotion-dev/skills`): a skill de vídeo mais instalada, para o render.
- **mckruz/comfyui-expert** (comfyui-video-pipeline / video-assembly): orquestração do ComfyUI.
- **kajisho5/ffmpeg-skill**: legendas karaokê e pós-processamento local.
- Skills próprias: `/novo-video`, `/novo-personagem`, `/novo-estilo`, `/agendar`.

## Pendências e riscos

- **ffmpeg** não está instalado → `winget install Gyan.FFmpeg`.
- **Auto-post**: IG exige conta Business/Creator + app Meta (Graph API). YT exige OAuth (Data API, cota diária). TikTok exige app aprovado. Sugestão: na v1, agendar só YT + IG.
- **Modelo de imagem local** para derivar poses do personagem mantendo a referência (Qwen-Image-Edit / Flux Kontext): validar na 5060 Ti antes de fechar.
- **VoiceStudio**: validar a qualidade em PT-BR e se ele expõe API/CLI para automação.
- **Painel web**: definir a stack (sugestão: Next.js ou Vite + API Python FastAPI).

## Estado do ambiente (2026-11-20)

- ffmpeg 9.1 (winget, com libass) ✅
- VoiceStudio 0.5.8 em `http://localhost:3900`, rodando em CUDA ✅
  - **VoxCPM2** (Apache-2.0) funcionando em PT-BR via `pipeline/voz.py` ✅
    - Workaround: `kaldifst 1.9.1` não tem wheel win_amd64. Foi pré-instalado `kaldifst==1.9.0` na venv
      `%APPDATA%\OmniVoice\engines\voxcpm2\voxcpm2\.venv` antes de instalar o motor. Repetir isso se o motor for reinstalado.
  - OmniVoice (CC-BY-NC): baixado, mas a licença precisa ser aceita pelo usuário no Model Catalogue.
  - Whisper large-v3 instalado. Transcrição via `POST /v1/audio/transcriptions`.
  - VoxCPM2 **ignora `speed`**: a saída é idêntica byte a byte. Para mudar a velocidade, usar ffmpeg `atempo` depois.
  - `num_step=50` leva cerca de 5 min por 25 s de áudio na 5060 Ti. 30 passos é bem mais rápido.
  - `instruct` junto com perfil clonado gera fala sem sentido. Não combinar os dois.
  - Pronúncia: escrever "Paratí" (com acento) para forçar a tônica no TI.
- Persistência da voz: gerar a voz por `description` e depois salvar como **perfil** (`POST /profiles`) e usar o
  `profile_id` no kit do personagem. Só a descrição + seed NÃO garante a mesma voz em textos diferentes.

- ComfyUI em `E:\ComfyUI` (código e modelos no disco USB). A venv fica em `C:\Users\nickm\.venvs\comfyui`, porque no USB é lenta demais. Para subir: `iniciar-comfy.ps1`.
  - Qwen-Image Q4_K_M + Lightning 8 passos: a 1ª geração leva cerca de 5 min (carregando do USB) e as seguintes bem menos.
- ffmpeg no Windows: `drawtext` sem `fontfile=` dá segfault (falta o fontconfig). Sempre passar `fontfile='C\:/Windows/Fonts/...'`
  e, nas legendas ASS, `fontsdir`.

- Lip-sync: Rhubarb 1.14 em `C:\Users\nickm\tools\` (modo phonetic, sem `-d`). `pipeline/sync.py` gera palavras (Whisper) + bocas.
- Remotion em `apps/render`. Teste: `npx remotion render TesteZeca out/teste_zeca.mp4`.

## Narrador oficial (2026-11-21)

- Perfil VoiceStudio **"Narrador Contador" `2f02b91b`**: motor **OmniVoice**, design "male, middle-aged, low pitch", seed 2024, idioma pt.
  Usar sempre `--motor omnivoice --voz 2f02b91b --velocidade 0.82`. A velocidade funciona no OmniVoice.
- Gerar o texto inteiro, ou blocos grandes, **com o perfil**. Gerar frase a frase só com descrição/seed muda a voz a cada frase.
  O perfil (clone da referência) mantém a voz e a pronúncia de "Tales" em textos novos. A receita solta (instruct + seed) não mantém.
- Licença: OmniVoice é **CC-BY-NC**. Antes de monetizar, rever ou trocar o motor por VoxCPM2/Kokoro, que são Apache.
- Alternativas testadas: Kokoro (`pipeline/kokoro_tts.py`, venv `C:\Users\nickm\.venvs\kokoro`, vozes pm_alex/pm_santa) e edge-tts (Antonio).

## Hub v1 (2026-11-21)

- **Painel:** `iniciar-hub.ps1` (ou `node apps/painel/server.mjs`) abre http://localhost:4300. É só Node, sem dependências.
  Telas: Vídeos, Novo vídeo, Cardápio (notas 1–5) e Agenda.
- **Ordem dos portões:** Roteiro → Narração → Cenas → Vídeo final → Agenda. As cenas vêm depois da narração porque o
  storyboard se alinha ao tempo de cada frase do áudio.
- **Quem faz o quê:**
  - O painel roda as etapas automáticas: voz (`pipeline/narrar_projeto.py`), quadros, prévia, render e capa (Kit 3D).
  - A IA faz a parte criativa pela skill `/video` (`.claude/skills/video/SKILL.md`). O painel chama
    `claude -p "/video <id>"` sozinho ao criar o vídeo, ao aprovar a narração e ao pedir um ajuste.
- **Estado de cada vídeo:** `videos/<id>/status.json` (`etapa` + `estado`). Os arquivos do vídeo ficam em
  `Kit_Video_3d/projects/<id>`.
- **Estilos:** `estilos/3d-cidade` (pronto, Kit 3D) e `estilos/2d-flat-noturno` (Remotion, em construção).
- **Personagens fixos:** `personagens/<slug>/personagem.json` (Tales: preset `homem` de camisa vermelha e bigode, Paratí = hatch prata).
- **Visual "mesa de luz" (2026-11-21):** claquete com os campos do vídeo, tira de filme com as etapas, barras de progresso reais
  (no render conta os quadros do vídeo; nas outras etapas usa o tempo) e previsões que aprendem com `videos/_tempos.json`. A IA roda em stream-json:
  o painel mostra o que ela está fazendo e o uso do plano (`usoIA` no status).
- **Estilo 2D no fluxo (2026-11-21):** estilo `2d-flat-noturno` (`motor: remotion`).
  - Arquivos: `storyboard2d.json` + `apps/render/render2d.mjs` (`--validar`, `--quadros`, `--previa`, `--capa`). Guia para a IA: `apps/render/STORYBOARD2D.md`.
  - Os vídeos 2D ficam em `videos/<id>/`. O visual dos personagens vem de `personagens/<id>/personagem.json` → `rig2d`.
  - Biblioteca: 5 cenários, 13 objetos e as poses comemorando e segurando. O personagem anda quando `x` tem chaves.
  - O render leva cerca de 40 s por vídeo de 40 s.
  - Exemplo: `videos/2026-11-21-tales-e-o-dinheiro-2d`.
- **Autonomia do criador (fluxo 2, vídeos novos com `"fluxo": 2`):**
  - **Áudio frase por frase:** `pipeline/audio_frases.py`, arquivo `audio/frases.json`.
    - Cada frase tem energia, pausa, velocidade, efeito e texto, e ganha 3 takes (seeds diferentes, mesmo perfil).
    - Os takes antigos ficam guardados. "Ouvir montagem" junta os escolhidos, e a aprovação exige a montagem atualizada.
    - A IA propõe a marcação em `marcacao.json`.
  - **Variantes de cena:** `pipeline/cenas.mjs`, arquivo `cenas/variantes.json`.
    - 2 variantes por cena, com clipe e áudio, e uma recomendada.
    - Ajuste de uma cena só gera 2 variantes novas.
    - O vídeo final é montado com as escolhidas. Funciona no 2D (cerca de 6s por variante) e no 3D (cerca de 15s por variante).
- **Biblioteca (aba no painel):** `pipeline/biblioteca.mjs` + a skill `/biblioteca`.
  - Pedidos ficam em `biblioteca/pedidos/<id>/`. A IA gera 3 opções, o painel faz as miniaturas em 2D e 3D, e a escolhida é publicada.
  - Onde cada asset é publicado: personagem em `personagens/<slug>/` (rig2d + kit3d); objeto em `assets2d/objetos/<slug>.svg` + `Kit_Video_3d/assets/scenery/hub/<slug>.js`; cenário em `assets2d/cenarios/<slug>.svg`.
- **Falta:** auto-post (APIs do YouTube e do Instagram), música e efeitos sonoros, um editor de cortes de cena e testar um motor de voz com emoção real.

## Próximo passo

Fatia vertical mínima: **1 personagem, 1 estilo, 1 vídeo de 15s** passando pelos 4 portões até gerar o MP4.
