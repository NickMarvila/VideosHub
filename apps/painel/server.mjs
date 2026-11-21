// Painel do VideosHub: servidor local sem dependências (só Node).
// Uso: node apps/painel/server.mjs   →  http://localhost:4300
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLICO = path.join(RAIZ, 'apps', 'painel', 'public');
const VIDEOS = path.join(RAIZ, 'videos');
const ESTILOS = path.join(RAIZ, 'estilos');
const KIT = path.join(RAIZ, 'Kit_Video_3d');
const PORTA = Number(process.env.PORTA || 4300);
const FFMPEG_DIR = 'C:\\Users\\nickm\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.1-full_build\\bin';
const ETAPAS = ['roteiro', 'narracao', 'cenas', 'final'];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };

const agora = () => new Date().toISOString();
const lerJSON = (arq, padrao = null) => { try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return padrao; } };
const gravarJSON = (arq, obj) => fs.writeFileSync(arq, JSON.stringify(obj, null, 2), 'utf8');
const lerTexto = (arq) => { try { return fs.readFileSync(arq, 'utf8'); } catch { return null; } };
const idValido = (id) => /^[a-z0-9][a-z0-9-]{2,80}$/.test(id);

// ---------- vídeos ----------
const arqStatus = (id) => path.join(VIDEOS, id, 'status.json');
function lerVideo(id) { return idValido(id) ? lerJSON(arqStatus(id)) : null; }
function salvarVideo(v, evento) {
  if (evento) (v.historico ||= []).push({ em: agora(), evento });
  gravarJSON(arqStatus(v.id), v);
  return v;
}
function listarVideos() {
  if (!fs.existsSync(VIDEOS)) return [];
  return fs.readdirSync(VIDEOS).filter((d) => !d.startsWith('_') && fs.existsSync(arqStatus(d)))
    .map((d) => lerJSON(arqStatus(d))).filter(Boolean)
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
}
function detalhes(v) {
  const pasta = path.join(RAIZ, v.pasta || '');
  const rel = (f) => `/midia/${path.posix.join(v.pasta, f)}`;
  const existe = (f) => fs.existsSync(path.join(pasta, f));
  const quadrosDir = path.join(pasta, 'render', 'quadros');
  const quadros = fs.existsSync(quadrosDir) ? fs.readdirSync(quadrosDir).filter((f) => f.endsWith('.png')).sort().map((f) => rel(`render/quadros/${f}`)) : [];
  const versao = (f) => { try { return Math.round(fs.statSync(path.join(pasta, f)).mtimeMs); } catch { return 0; } };
  return {
    ...v,
    job: situacao(JOBS.get(v.id)),
    previsoes: previsoes(v),
    orfao: ['ia_trabalhando', 'processando'].includes(v.estado) && !JOBS.get(v.id)?.rodando,
    arquivos: {
      sinopse: lerTexto(path.join(pasta, 'sinopse.md')),
      narracao: lerTexto(path.join(pasta, 'narracao.txt')),
      plano: lerTexto(path.join(pasta, 'plano-animacao.md')),
      postagem: lerTexto(path.join(pasta, 'postagem.md')),
      vozInfo: lerJSON(path.join(pasta, 'voz.json')),
      audioFrases: audioFrasesDe(v),
      variantes: variantesDe(v),
      marcacao: lerJSON(path.join(pasta, 'marcacao.json')),
      audio: existe('narracao.wav') ? `${rel('narracao.wav')}?v=${versao('narracao.wav')}` : null,
      previa: existe('render/previa.mp4') ? `${rel('render/previa.mp4')}?v=${versao('render/previa.mp4')}` : null,
      video: existe('render/video.mp4') ? `${rel('render/video.mp4')}?v=${versao('render/video.mp4')}` : null,
      capa: existe('render/capa.png') ? `${rel('render/capa.png')}?v=${versao('render/capa.png')}` : null,
      quadros,
    },
  };
}

// ---------- tarefas (voz, quadros, render, IA) ----------
// Cada tarefa guarda passo atual, previsão e progresso. Os tempos reais vão para videos/_tempos.json e
// a previsão seguinte usa a mediana das últimas medições (o hub aprende o ritmo da sua máquina).
const JOBS = new Map(); // id → job
const ARQ_TEMPOS = path.join(VIDEOS, '_tempos.json');
// segundos = fixo + porUnidade × unidades (valores iniciais medidos na RTX 5060 Ti; depois o hub aprende)
const PADRAO = {
  narrar: { fixo: 4, porUnidade: 0.26, unidade: 'palavra' },
  gravar: { fixo: 14, porUnidade: 4, unidade: 'take' },
  montar: { fixo: 8, porUnidade: 0, unidade: '' },
  midia2d: { fixo: 15, porUnidade: 3, unidade: 'variante' },
  midia3d: { fixo: 5, porUnidade: 16, unidade: 'variante' },
  quadros: { fixo: 8, porUnidade: 2.5, unidade: 'cena' },
  previa: { fixo: 6, porUnidade: 0.6, unidade: 's de vídeo' },
  render: { fixo: 12, porUnidade: 1.6, unidade: 's de vídeo' },
  quadros2d: { fixo: 14, porUnidade: 1, unidade: 'cena' },
  previa2d: { fixo: 12, porUnidade: 0.4, unidade: 's de vídeo' },
  render2d: { fixo: 18, porUnidade: 0.6, unidade: 's de vídeo' },
  'ia-roteiro': { fixo: 300, porUnidade: 0, unidade: '' },
  'ia-biblioteca': { fixo: 360, porUnidade: 0, unidade: '' },
  'opcoes-biblioteca': { fixo: 45, porUnidade: 0, unidade: '' },
  'publicar-biblioteca': { fixo: 30, porUnidade: 0, unidade: '' },
  'vitrine-kit': { fixo: 50, porUnidade: 0, unidade: '' },
  'ia-cenas': { fixo: 900, porUnidade: 0, unidade: '' },
  'ia-ajuste': { fixo: 420, porUnidade: 0, unidade: '' },
};
function unidadesDe(tipo, v) {
  const pasta = path.join(RAIZ, v.pasta || '');
  if (tipo === 'gravar') {
    const af = audioFrasesDe(v);
    if (!af) return 3 * (((lerJSON(path.join(pasta, 'marcacao.json')) || []).length) || ((lerTexto(path.join(pasta, 'narracao.txt')) || '').split(/(?<=[.!?…])\s+/).filter(Boolean).length) || 12);
    return 3 * Math.max(1, af.frases.filter((f) => f.precisaGravar).length);
  }
  if (tipo === 'narrar') return (lerTexto(path.join(pasta, 'narracao.txt')) || '').split(/\s+/).filter(Boolean).length || 100;
  const sb = lerJSON(path.join(pasta, 'storyboard.json')) || lerJSON(path.join(pasta, 'storyboard2d.json'));
  if (tipo === 'quadros') return sb?.cenas?.length || 10;
  if (tipo === 'previa' || tipo === 'render') return sb?.duracao || lerJSON(path.join(pasta, 'voz.json'))?.duracao || v.duracaoAlvo || 45;
  return 1;
}
const chaveIA = (v) => (v.etapa === 'roteiro' && !v.portoes?.roteiro?.ajustes?.some((a) => !a.resolvido) ? 'ia-roteiro'
  : v.etapa === 'cenas' && !v.portoes?.cenas?.ajustes?.some((a) => !a.resolvido) ? 'ia-cenas' : 'ia-ajuste');
function estimar(chave, unidades) {
  const base = PADRAO[chave] || { fixo: 60, porUnidade: 0 };
  const medidas = (lerJSON(ARQ_TEMPOS, {})[chave] || []).slice(-8);
  if (!medidas.length) return Math.round(base.fixo + base.porUnidade * unidades);
  // ajusta a previsão padrão pela razão real/previsto das últimas medições (mediana)
  const razoes = medidas.map((m) => m.seg / Math.max(1, base.fixo + base.porUnidade * m.unidades)).sort((a, b) => a - b);
  const r = razoes[Math.floor(razoes.length / 2)];
  return Math.round((base.fixo + base.porUnidade * unidades) * r);
}
function registrarTempo(chave, seg, unidades) {
  const t = lerJSON(ARQ_TEMPOS, {});
  (t[chave] ||= []).push({ seg: Math.round(seg), unidades, em: agora() });
  t[chave] = t[chave].slice(-20);
  gravarJSON(ARQ_TEMPOS, t);
}
function previsoes(v) { // tempo de máquina de cada etapa que ainda falta
  const ia = (k) => estimar(k, 1);
  return {
    roteiro: ia('ia-roteiro'),
    narracao: v.fluxo === 2 ? estimar('gravar', unidadesDe('gravar', v)) + estimar('montar', 1) : estimar('narrar', unidadesDe('narrar', v)),
    cenas: ia('ia-cenas') + (v.fluxo === 2 ? estimar(eh2D(v) ? 'midia2d' : 'midia3d', 2 * Math.max(6, Math.round((v.duracaoAlvo || 45) / 3.5))) : estimar(eh2D(v) ? 'quadros2d' : 'quadros', unidadesDe('quadros', v))),
    final: estimar(eh2D(v) ? 'render2d' : 'render', unidadesDe('render', v)) + 6,
  };
}

// Descreve uma ação do Claude (stream-json) em uma linha que o criador entende.
function descreverFerramenta(nome, ent = {}) {
  const arq = (f) => (f || '').split(/[\\/]/).pop();
  if (nome === 'Read') return /\.png$/i.test(ent.file_path || '') ? `Olhando o quadro ${arq(ent.file_path)}` : `Lendo ${arq(ent.file_path)}`;
  if (nome === 'Write') return `Escrevendo ${arq(ent.file_path)}`;
  if (nome === 'Edit') return `Ajustando ${arq(ent.file_path)}`;
  if (nome === 'Bash') return /validar/.test(ent.command) ? 'Validando o storyboard' : /--quadros/.test(ent.command) ? 'Gerando os quadros das cenas' : 'Rodando um comando do kit';
  if (nome === 'Glob' || nome === 'Grep') return 'Procurando arquivos';
  if (nome === 'Skill') return 'Abrindo as instruções do /video';
  return nome;
}
function lerEventoIA(job, linha) {
  let ev; try { ev = JSON.parse(linha); } catch { return; }
  if (ev.type === 'assistant') {
    for (const c of ev.message?.content || []) {
      if (c.type === 'tool_use') job.atividade.push({ em: agora(), texto: descreverFerramenta(c.name, c.input) });
      else if (c.type === 'text' && c.text?.trim()) job.resumo = c.text.trim().slice(0, 600);
    }
    job.atividade = job.atividade.slice(-12);
  } else if (ev.type === 'result') {
    job.uso = { custoUSD: ev.total_cost_usd, turnos: ev.num_turns, segundos: Math.round((ev.duration_ms || 0) / 1000),
      tokensEntrada: (ev.usage?.input_tokens || 0) + (ev.usage?.cache_read_input_tokens || 0) + (ev.usage?.cache_creation_input_tokens || 0),
      tokensSaida: ev.usage?.output_tokens || 0 };
    if (ev.result) job.resumo = String(ev.result).slice(0, 600);
  }
}

function fase(job) { // o que está acontecendo agora, em palavras
  const l = job.logPasso || '';
  if (job.tipo === 'narrar') return job.passo === 1 ? 'Reajustando o tempo das cenas' : /marcando/.test(l) ? 'Marcando o tempo de cada palavra' : 'Gerando a voz do narrador';
  if (job.tipo === 'gravar') { const m = [...l.matchAll(/frase f(\d+) take (\d+)/g)].at(-1); return job.passo === 0 ? 'Preparando as frases' : job.passo === 2 ? 'Montando o áudio e marcando as palavras' : m ? `Gravando a frase ${Number(m[1])}, take ${m[2]}` : 'Gravando os takes'; }
  if (job.tipo === 'montar') return 'Montando o áudio e marcando as palavras';
  if (job.tipo === 'opcoes') return /3D/.test(l) ? 'Desenhando as opções em 3D' : 'Desenhando as opções em 2D';
  if (job.tipo === 'publicar') return 'Publicando na biblioteca e gerando as miniaturas';
  if (job.tipo === 'variantes') { const m = [...l.matchAll(/(c\d+-[a-z])\.(mp4|png)|\)\s+(c\d+-[a-z])/g)].at(-1); return m ? `Gerando os clipes · ${m[1] || m[3]}` : 'Preparando os clipes das variantes'; }
  if (job.tipo === 'render') return job.passos === 3 && job.passo === 0 ? 'Montando as cenas escolhidas' : job.passo === job.passos - 1 ? 'Gerando a capa' : 'Renderizando o vídeo';
  if (job.tipo === 'previa') return 'Renderizando a prévia';
  if (job.tipo === 'quadros') return job.passo === 0 ? 'Validando o storyboard' : 'Gerando os quadros das cenas';
  if (job.tipo === 'ia') return job.atividade.at(-1)?.texto || 'A IA está começando';
  return job.tipo;
}
function situacao(job) { // progresso 0–1, segundos restantes, fase
  if (!job) return null;
  const decorrido = (Date.now() - Date.parse(job.inicio)) / 1000;
  let prog = null;
  const q = [...(job.logPasso || '').matchAll(/Quadro (\d+)\/(\d+)/g)].at(-1);
  if (q && job.tipo !== 'narrar' && !(job.tipo === 'gravar' && job.passo === 2)) { // render do kit informa quadro a quadro
    const frac = Number(q[1]) / Number(q[2]);
    const peso = job.tipo === 'render' && job.passos === 3 ? [0.02, 0.91, 0.07] : job.tipo === 'render' ? [0.93, 0.07] : job.tipo === 'quadros' ? [0.1, 0.9] : job.tipo === 'gravar' ? [0.02, 0.88, 0.1] : [1];
    prog = peso.slice(0, job.passo).reduce((a, b) => a + b, 0) + (peso[job.passo] ?? 0) * frac;
  }
  if (prog === null) prog = Math.min(0.96, decorrido / Math.max(5, job.estimativa));
  if (!job.rodando) prog = job.ok ? 1 : prog;
  const restante = job.rodando ? Math.max(1, prog > 0.08 && q ? decorrido / prog - decorrido : job.estimativa - decorrido) : 0;
  const { log, logPasso, ...resto } = job;
  return { ...resto, log: log.slice(-3000), progresso: +prog.toFixed(3), decorrido: Math.round(decorrido),
    restante: Math.round(restante), atrasado: job.rodando && decorrido > job.estimativa * 1.15, fase: job.rodando ? fase(job) : null };
}

function rodar(v, tipo, passos, aoTerminar, chave = tipo, unidadesFixas) {
  const id = v.id;
  if (JOBS.get(id)?.rodando) throw new Error('Já tem uma tarefa rodando para este vídeo. Espere ela terminar.');
  const unidades = unidadesFixas ?? unidadesDe(tipo, v);
  const job = { tipo, chave, inicio: agora(), rodando: true, ok: null, log: '', logPasso: '', passo: 0, passos: passos.length,
    estimativa: estimar(chave, unidades), unidades, atividade: [], resumo: null, uso: null };
  JOBS.set(id, job);
  const logArq = path.join(v.logDir || path.join(VIDEOS, id), `${tipo}.log`);
  fs.writeFileSync(logArq, '');
  const env = { ...process.env, PATH: `${process.env.PATH};${FFMPEG_DIR}`, PYTHONIOENCODING: 'utf-8' };
  const terminar = (ok) => {
    job.rodando = false; job.ok = ok;
    if (ok) registrarTempo(chave, (Date.now() - Date.parse(job.inicio)) / 1000, unidades);
    aoTerminar?.(ok, job);
  };
  const proximo = (i) => {
    if (i >= passos.length) return terminar(true);
    job.passo = i; job.logPasso = '';
    const [cmd, args, cwd] = passos[i];
    const p = spawn(cmd, args, { cwd: cwd || RAIZ, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let resto = '';
    const anota = (d) => {
      const s = d.toString();
      fs.appendFileSync(logArq, s);
      if (tipo === 'ia') { // saída em stream-json: uma linha = um evento
        const linhas = (resto + s).split('\n'); resto = linhas.pop();
        for (const l of linhas) lerEventoIA(job, l);
        return;
      }
      job.log = (job.log + s).slice(-8000); job.logPasso = (job.logPasso + s).slice(-4000);
    };
    p.stdout.on('data', anota); p.stderr.on('data', (d) => { const s = d.toString(); job.log = (job.log + s).slice(-8000); fs.appendFileSync(logArq, s); });
    p.on('error', (e) => { job.log += `\nERRO: ${e.message}\n`; terminar(false); });
    p.on('close', (code) => {
      if (tipo === 'ia' && resto) lerEventoIA(job, resto);
      if (code === 0) return proximo(i + 1);
      job.log += `\n(saiu com código ${code})\n`; terminar(false);
    });
  };
  proximo(0);
  return job;
}
const motorDe = (v) => lerJSON(path.join(ESTILOS, v.estilo || '', 'estilo.json'))?.motor || 'kit3d';
const eh2D = (v) => motorDe(v) === 'remotion';
const R2D = (v, ...extra) => ['node', ['apps/render/render2d.mjs', v.pasta, ...extra]];
const projetoKit = (v) => path.relative(KIT, path.join(RAIZ, v.pasta)).split(path.sep).join('/');

const ACOES = {
  narrar(v) {
    const vz = v.voz || {};
    const pasta = path.join(RAIZ, v.pasta);
    const passos = [['python', ['pipeline/narrar_projeto.py', v.pasta, '--voz', vz.perfil || '2f02b91b',
      '--motor', vz.motor || 'omnivoice', '--velocidade', String(vz.velocidade ?? 0.82)]]];
    // se já existem cenas, reajusta os tempos delas para a voz nova
    if (fs.existsSync(path.join(pasta, 'storyboard.json')) && fs.existsSync(path.join(pasta, 'frases.json'))) {
      fs.copyFileSync(path.join(pasta, 'frases.json'), path.join(pasta, 'frases.anterior.json'));
      passos.push(['python', ['pipeline/remapear_storyboard.py', v.pasta, `${v.pasta}/frases.anterior.json`]]);
    }
    const job = rodar(v, 'narrar', passos,
      (ok) => { const a = lerVideo(v.id); salvarVideo({ ...a, estado: ok ? 'aguardando_aprovacao' : 'erro' }, ok ? 'narração pronta' : 'erro na narração'); });
    salvarVideo({ ...v, etapa: 'narracao', estado: 'processando' }, 'gerando narração');
    return job;
  },
  gravar(v, ids) {
    const passos = [['python', ['pipeline/audio_frases.py', 'preparar', v.pasta]], ['python', ['pipeline/audio_frases.py', 'gravar', v.pasta, ...(ids || [])]],
      ['python', ['pipeline/audio_frases.py', 'montar', v.pasta]]];
    const job = rodar(v, 'gravar', passos, (ok) => {
      const a = lerVideo(v.id); salvarVideo({ ...a, estado: ok ? 'aguardando_aprovacao' : 'erro' }, ok ? 'takes gravados' : 'erro ao gravar');
    }, 'gravar', ids ? ids.length * 3 : undefined);
    salvarVideo({ ...v, etapa: 'narracao', estado: 'processando' }, ids ? `regravando ${ids.length} frase(s)` : 'gravando os takes');
    return job;
  },
  montar(v) {
    return rodar(v, 'montar', [['python', ['pipeline/audio_frases.py', 'montar', v.pasta]]], null, 'montar');
  },
  midia(v) {
    const pend = Math.max(1, variantesPendentes(v));
    return rodar(v, 'variantes', [['node', ['pipeline/cenas.mjs', 'midia', v.pasta]]], null, eh2D(v) ? 'midia2d' : 'midia3d', pend);
  },
  quadros(v) {
    if (eh2D(v)) return rodar(v, 'quadros', [R2D(v, '--validar'), R2D(v, '--quadros')], null, 'quadros2d');
    return rodar(v, 'quadros', [['node', ['tools/validar.mjs', projetoKit(v)], KIT], ['node', ['tools/render.mjs', projetoKit(v), '--quadros'], KIT]]);
  },
  previa(v) {
    if (eh2D(v)) return rodar(v, 'previa', [R2D(v, '--previa')], null, 'previa2d');
    return rodar(v, 'previa', [['node', ['tools/render.mjs', projetoKit(v), '--previa'], KIT]]);
  },
  render(v) {
    const capa = String(v.capaEm ?? 1.2);
    const passos = eh2D(v) ? [R2D(v), R2D(v, '--capa', capa)]
      : [['node', ['tools/render.mjs', projetoKit(v)], KIT], ['node', ['tools/render.mjs', projetoKit(v), '--capa', capa], KIT]];
    if (v.fluxo === 2 && fs.existsSync(arqVariantes(v))) passos.unshift(['node', ['pipeline/cenas.mjs', 'montar', v.pasta]]);
    const job = rodar(v, 'render', passos,
      (ok) => { const a = lerVideo(v.id); salvarVideo({ ...a, estado: ok ? 'aguardando_aprovacao' : 'erro' }, ok ? 'vídeo final pronto' : 'erro no render'); }, eh2D(v) ? 'render2d' : 'render');
    salvarVideo({ ...v, etapa: 'final', estado: 'processando' }, 'renderizando o vídeo final');
    return job;
  },
  ia(v) {
    // Chama o Claude Code em modo não interativo com a skill /video (usa a assinatura do criador).
    const permitidas = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill',
      'Bash(node Kit_Video_3d/tools/validar.mjs:*)', 'Bash(node Kit_Video_3d/tools/render.mjs:*)',
      'Bash(node Kit_Video_3d/tools/novo-projeto.mjs:*)', 'Bash(node apps/render/render2d.mjs:*)'];
    const job = rodar(v, 'ia', [['claude', ['-p', `/video ${v.id}`, '--output-format', 'stream-json', '--verbose',
      '--permission-mode', 'acceptEdits', '--allowedTools', ...permitidas]]],
    (ok, j) => {
      const a = lerVideo(v.id);
      if (j.uso) (a.usoIA ||= []).push({ em: agora(), etapa: a.etapa, ...j.uso });
      if (a.estado === 'ia_trabalhando') salvarVideo({ ...a, estado: ok ? 'aguardando_ia' : 'erro' }, ok ? 'IA terminou sem devolver para aprovação' : 'erro na IA');
      else salvarVideo(a);
      if (ok && a.fluxo === 2 && a.etapa === 'cenas' && a.estado === 'aguardando_aprovacao' && variantesPendentes(a) > 0) ACOES.midia(lerVideo(v.id));
      // ajuste de texto no áudio: grava sozinho as frases que a IA mudou (e monta de novo)
      const alteradas = a.fluxo === 2 && a.etapa === 'narracao' ? (audioFrasesDe(a)?.frases || []).filter((f) => f.precisaGravar).map((f) => f.id) : [];
      if (ok && alteradas.length) ACOES.gravar(lerVideo(v.id), alteradas);
    }, chaveIA(v));
    salvarVideo({ ...v, estado: 'ia_trabalhando' }, 'IA trabalhando');
    return job;
  },
};

// ---------- áudio frase por frase ----------
// Mesma regra de pipeline/audio_frases.py (texto_tts/config): serve para saber quais frases precisam ser regravadas.
const ENERGIA_VEL = { calma: 0.92, normal: 1, animada: 1.08 };
function textoTTS(f) {
  let t = String(f.texto || '').trim();
  if (f.energia === 'calma') { t = t.replace(/!+/g, '.'); if (t.endsWith('.') && !t.endsWith('...')) t = `${t.slice(0, -1)}...`; }
  else if (f.energia === 'animada' && t.endsWith('.') && !t.endsWith('...')) t = `${t.slice(0, -1)}!`;
  if (f.efeito === 'suspiro') t = `[sigh] ${t}`;
  else if (f.efeito === 'risada') t = `${t} [laughter]`;
  return t;
}
const r3 = (x) => Math.round(x * 1000) / 1000;
const configDe = (f, voz) => ({ texto: textoTTS(f), vel: r3(r3(f.velocidade || voz.velocidade) * (ENERGIA_VEL[f.energia] || 1)) });
function audioFrasesDe(v) {
  const d = lerJSON(path.join(RAIZ, v.pasta || '', 'audio', 'frases.json'));
  if (!d) return null;
  for (const f of d.frases) {
    const cfg = configDe(f, d.voz);
    f.precisaGravar = !f.takes.some((t) => t.config.texto === cfg.texto && Math.abs(t.config.vel - cfg.vel) < 0.001);
    for (const t of f.takes) t.url = `/midia/${path.posix.join(v.pasta, t.arquivo)}`;
  }
  return d;
}
function salvarFrases(v, { frases = [], escolhas = {} }) {
  const arq = path.join(RAIZ, v.pasta, 'audio', 'frases.json');
  const d = lerJSON(arq);
  if (!d) throw new Error('As frases ainda não foram preparadas.');
  if (JOBS.get(v.id)?.rodando) throw new Error('Espere a gravação terminar para mudar as frases.');
  let mudouMontagem = false;
  for (const f of d.frases) {
    const novo = frases.find((x) => x.id === f.id);
    if (novo) {
      for (const k of ['texto', 'energia', 'efeito']) if (typeof novo[k] === 'string') f[k] = novo[k].trim();
      if (novo.pausa !== undefined) { const p = Math.max(0, Math.min(2, Number(novo.pausa) || 0)); if (p !== f.pausa) mudouMontagem = true; f.pausa = p; }
      if (novo.velocidade !== undefined) f.velocidade = Math.max(0.6, Math.min(1.2, Number(novo.velocidade) || d.voz.velocidade));
    }
    if (escolhas[f.id] && f.takes.some((t) => t.id === escolhas[f.id]) && escolhas[f.id] !== f.escolhido) { f.escolhido = escolhas[f.id]; mudouMontagem = true; }
  }
  if (mudouMontagem) d.montagem = { ...d.montagem, atual: false };
  gravarJSON(arq, d);
}

// ---------- variantes de cena ----------
const arqVariantes = (v) => path.join(RAIZ, v.pasta || '', 'cenas', 'variantes.json');
function variantesDe(v) {
  const d = lerJSON(arqVariantes(v));
  if (!d) return null;
  const frases = lerJSON(path.join(RAIZ, v.pasta, 'frases.json')) || [];
  for (const c of d.cenas) c.frasesTexto = (c.frases || []).map((id) => frases.find((f) => f.id === id || f.n === id)?.texto).filter(Boolean);
  for (const c of d.cenas) for (const x of c.variantes) {
    if (x.clipe) x.clipeUrl = `/midia/${path.posix.join(v.pasta, x.clipe)}?v=${x.hash}`;
    if (x.poster) x.posterUrl = `/midia/${path.posix.join(v.pasta, x.poster)}?v=${x.hash}`;
  }
  return d;
}
const variantesPendentes = (v) => (variantesDe(v)?.cenas || []).reduce((n, c) => n + c.variantes.filter((x) => !x.hash).length, 0);
function editarVariantes(v, fn) {
  const d = lerJSON(arqVariantes(v));
  if (!d) throw new Error('Este vídeo ainda não tem variantes de cena.');
  fn(d);
  gravarJSON(arqVariantes(v), d);
}
function escolherVariante(v, { cena, variante }) {
  editarVariantes(v, (d) => {
    const c = d.cenas.find((x) => x.id === cena);
    if (!c?.variantes.some((x) => x.id === variante)) throw new Error('Variante não encontrada.');
    c.escolhida = variante;
  });
}
function escolherRecomendadas(v) {
  editarVariantes(v, (d) => { for (const c of d.cenas) if (!c.escolhida) c.escolhida = (c.variantes.find((x) => x.recomendada) || c.variantes[0]).id; });
}
function ajusteCena(v, { cena, texto }) {
  if (!texto?.trim()) throw new Error('Escreva o que quer nesta cena.');
  editarVariantes(v, (d) => {
    const c = d.cenas.find((x) => x.id === cena);
    if (!c) throw new Error('Cena não encontrada.');
    (c.ajustes ||= []).push({ em: agora(), texto: texto.trim(), resolvido: false });
  });
  (v.portoes.cenas.ajustes ||= []).push({ em: agora(), texto: `[${cena}] ${texto.trim()}`, cena, resolvido: false });
  v.portoes.cenas.aprovado = false;
  if (v.portoes.final) v.portoes.final.aprovado = false;
  salvarVideo({ ...v, etapa: 'cenas', estado: 'aguardando_ia' }, `ajuste pedido na cena ${cena}`);
  ACOES.ia(lerVideo(v.id));
}

// ---------- visualizador 3D interativo do kit (npm run preview) ----------
const visualizador = { proc: null, url: null };
async function abrirVisualizador() {
  const url = 'http://localhost:5173';
  const vivo = await fetch(url, { signal: AbortSignal.timeout(1500) }).then(() => true).catch(() => false);
  if (!vivo) {
    visualizador.proc = spawn('node', ['tools/serve.mjs'], { cwd: KIT, stdio: 'ignore', windowsHide: true });
    await new Promise((r) => setTimeout(r, 1200));
  }
  visualizador.url = url;
  return { url };
}

// ---------- biblioteca ----------
const BIB = path.join(RAIZ, 'biblioteca');
const dirPedido = (id) => path.join(BIB, 'pedidos', id);
const miniUrl = (arq) => (fs.existsSync(arq) ? `/midia/${path.relative(RAIZ, arq).split(path.sep).join('/')}?v=${Math.round(fs.statSync(arq).mtimeMs)}` : null);
function listarBiblioteca() {
  const mini = (tipo, slug, d) => miniUrl(path.join(BIB, 'miniaturas', `${tipo}-${slug}-${d}.png`));
  const personagens = fs.readdirSync(path.join(RAIZ, 'personagens')).filter((s) => !s.startsWith('_') && fs.existsSync(path.join(RAIZ, 'personagens', s, 'personagem.json')))
    .map((slug) => { const d = lerJSON(path.join(RAIZ, 'personagens', slug, 'personagem.json')) || {};
      return { slug, nome: d.nome || slug, papel: d.papel || '', mini2d: mini('personagem', slug, '2d'), mini3d: mini('personagem', slug, '3d') }; });
  const nativos = { objetos: ['parati', 'dinheiro', 'moeda', 'relogio', 'celular', 'caixa_som', 'skate', 'pneu', 'balao', 'pensamento', 'seta', 'icone', 'placa'], cenarios: ['rua_dia', 'rua_noite', 'mercado', 'sala', 'estrada'] };
  const extras = (sub) => { const dir = path.join(RAIZ, 'assets2d', sub); return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)) : []; };
  const tem3d = (slug) => fs.existsSync(path.join(KIT, 'assets', 'scenery', 'hub', `${slug}.js`));
  const objetos = [...nativos.objetos.map((slug) => ({ slug, nativo: true })), ...extras('objetos').map((slug) => ({ slug, tem3d: tem3d(slug) }))]
    .map((o) => ({ ...o, mini2d: mini('objeto', o.slug, '2d'), mini3d: mini('objeto', o.slug, '3d') }));
  const cenarios = [...nativos.cenarios.map((slug) => ({ slug, nativo: true })), ...extras('cenarios').map((slug) => ({ slug }))]
    .map((c) => ({ ...c, mini2d: mini('cenario', c.slug, '2d') }));
  const pdir = path.join(BIB, 'pedidos');
  const pedidos = fs.existsSync(pdir) ? fs.readdirSync(pdir).map((id) => pedidoDetalhe(id)).filter(Boolean).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')) : [];
  const kit = lerJSON(path.join(BIB, 'kit3d.json'));
  const kit3d = (kit?.itens || []).map((it) => ({ ...it, mini: miniUrl(path.join(BIB, 'miniaturas', `kit-${it.tipo}-${it.id}.png`)) }));
  return { personagens, objetos, cenarios, pedidos, kit3d, visualizador: visualizador.url };
}
function pedidoDetalhe(id) {
  const p = lerJSON(path.join(dirPedido(id), 'pedido.json'));
  if (!p) return null;
  const base = path.join(dirPedido(id), 'opcoes');
  const opcoes = fs.existsSync(base) ? fs.readdirSync(base).filter((n) => /^\d+$/.test(n)).sort((a, b) => a - b).map((n) => {
    const dir = path.join(base, n);
    const info = (p.opcoes || []).find((o) => String(o.n) === n) || {};
    const pj = lerJSON(path.join(dir, 'personagem.json'));
    return { n, descricao: info.descricao || pj?.nome || '', mini2d: miniUrl(path.join(dir, 'mini-2d.png')), mini3d: miniUrl(path.join(dir, 'mini-3d.png')) };
  }) : [];
  return { ...p, opcoesView: opcoes, referenciaUrl: p.referencia ? miniUrl(path.join(dirPedido(id), p.referencia)) : null, job: situacao(JOBS.get(`bib-${id}`)) };
}
const salvarPedido = (id, mudancas) => { const p = lerJSON(path.join(dirPedido(id), 'pedido.json')); gravarJSON(path.join(dirPedido(id), 'pedido.json'), { ...p, ...mudancas }); };
const jobPedido = (id) => ({ id: `bib-${id}`, pasta: path.relative(RAIZ, dirPedido(id)), logDir: dirPedido(id) });
function iaBiblioteca(id) {
  const permitidas = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'Bash(node pipeline/biblioteca.mjs validar:*)', 'Bash(npx tsc --noEmit -p apps/render:*)'];
  salvarPedido(id, { estado: 'ia_trabalhando' });
  return rodar(jobPedido(id), 'ia', [['claude', ['-p', `/biblioteca ${id}`, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', ...permitidas]]],
    (ok, j) => {
      const p = lerJSON(path.join(dirPedido(id), 'pedido.json'));
      if (j.uso) (p.usoIA ||= []).push({ em: agora(), ...j.uso });
      gravarJSON(path.join(dirPedido(id), 'pedido.json'), p);
      if (ok && p.estado === 'aguardando_escolha') opcoesBiblioteca(id);
      else salvarPedido(id, { estado: ok ? 'erro' : 'erro', erro: ok ? 'A IA terminou sem entregar as opções.' : 'A IA falhou. Veja o log.' });
    }, 'ia-biblioteca', 1);
}
function opcoesBiblioteca(id) {
  salvarPedido(id, { estado: 'processando' });
  return rodar(jobPedido(id), 'opcoes', [['node', ['pipeline/biblioteca.mjs', 'opcoes', id]]],
    (ok) => salvarPedido(id, { estado: ok ? 'aguardando_escolha' : 'erro', erro: ok ? null : 'Falha ao desenhar as opções.' }), 'opcoes-biblioteca', 1);
}
function novoPedido({ tipo, nome, descricao, referencia, permissao }) {
  if (!['personagem', 'objeto', 'cenario'].includes(tipo)) throw new Error('Escolha o tipo: personagem, objeto ou cenário.');
  if (!descricao?.trim()) throw new Error('Descreva o que você quer criar.');
  const base = slug(nome || descricao.split(/[,.;]/)[0]).replace(/-/g, '_').slice(0, 30) || tipo;
  let id = `${agora().slice(0, 10)}-${base.replace(/_/g, '-')}`; let n = 2;
  while (fs.existsSync(dirPedido(id))) id = `${agora().slice(0, 10)}-${base.replace(/_/g, '-')}-${n++}`;
  fs.mkdirSync(dirPedido(id), { recursive: true });
  let arqRef = null;
  if (referencia) { // data URL de imagem enviada pelo painel
    const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(referencia);
    if (!m) throw new Error('A referência precisa ser uma imagem PNG, JPG ou WEBP.');
    arqRef = `referencia.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    fs.writeFileSync(path.join(dirPedido(id), arqRef), Buffer.from(m[2], 'base64'));
  }
  gravarJSON(path.join(dirPedido(id), 'pedido.json'), { id, tipo, nome: nome?.trim() || '', slug: base, descricao: descricao.trim(), referencia: arqRef,
    permissao: !!permissao, estado: 'aguardando_ia', opcoes: [], ajustes: [], criadoEm: agora() });
  iaBiblioteca(id);
  return pedidoDetalhe(id);
}
function escolherOpcao(id, n) {
  salvarPedido(id, { estado: 'processando' });
  return rodar(jobPedido(id), 'publicar', [['node', ['pipeline/biblioteca.mjs', 'publicar', id, String(n)]]],
    (ok) => { if (!ok) salvarPedido(id, { estado: 'erro', erro: 'Não consegui publicar. Veja o log.' }); }, 'publicar-biblioteca', 1);
}
function ajustePedido(id, texto) {
  if (!texto?.trim()) throw new Error('Escreva o que mudar.');
  const p = lerJSON(path.join(dirPedido(id), 'pedido.json'));
  (p.ajustes ||= []).push({ em: agora(), texto: texto.trim(), resolvido: false });
  gravarJSON(path.join(dirPedido(id), 'pedido.json'), p);
  iaBiblioteca(id);
}

// ---------- portões ----------
function aprovar(v) {
  const etapa = v.etapa;
  if (!ETAPAS.includes(etapa) || v.estado !== 'aguardando_aprovacao') throw new Error('Nada aguardando aprovação.');
  v.portoes[etapa].aprovado = true;
  v.portoes[etapa].aprovadoEm = agora();
  for (const a of v.portoes[etapa].ajustes || []) a.resolvido = true;
  if (etapa === 'roteiro') { salvarVideo(v, 'roteiro aprovado'); if (v.fluxo === 2) ACOES.gravar(lerVideo(v.id)); else ACOES.narrar(lerVideo(v.id)); return; }
  if (etapa === 'narracao' && v.fluxo === 2 && !audioFrasesDe(v)?.montagem?.atual) throw new Error('Clique em "Ouvir montagem" antes de aprovar: a montagem está desatualizada.');
  if (etapa === 'narracao') { salvarVideo({ ...v, etapa: 'cenas', estado: 'aguardando_ia' }, 'narração aprovada'); ACOES.ia(lerVideo(v.id)); return; }
  if (etapa === 'cenas' && v.fluxo === 2 && variantesDe(v)?.cenas.some((c) => !c.escolhida)) throw new Error('Escolha uma variante em todas as cenas (ou use "Escolher as recomendadas").');
  if (etapa === 'cenas') { salvarVideo(v, 'cenas aprovadas'); ACOES.render(lerVideo(v.id)); return; }
  if (etapa === 'final') { salvarVideo({ ...v, etapa: 'agenda', estado: 'aguardando_agenda' }, 'vídeo final aprovado'); }
}
function pedirAjuste(v, texto) {
  if (!texto?.trim()) throw new Error('Escreva o que quer ajustar.');
  const etapa = ETAPAS.includes(v.etapa) ? v.etapa : 'final';
  (v.portoes[etapa].ajustes ||= []).push({ em: agora(), texto: texto.trim(), resolvido: false });
  v.portoes[etapa].aprovado = false;
  salvarVideo({ ...v, etapa, estado: 'aguardando_ia' }, `ajuste pedido (${etapa})`);
  ACOES.ia(lerVideo(v.id));
}
function slug(t) {
  return t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}
function novoVideo({ ideia, titulo, duracao, estilo }) {
  if (!ideia?.trim()) throw new Error('Descreva a ideia do vídeo.');
  const data = agora().slice(0, 10);
  const nome = slug(titulo || ideia.split(/[.,:;!?]/)[0]) || 'video';
  let id = `${data}-${nome}`; let n = 2;
  while (fs.existsSync(path.join(VIDEOS, id))) id = `${data}-${nome}-${n++}`;
  const est = lerJSON(path.join(ESTILOS, estilo || '3d-cidade', 'estilo.json'));
  if (!est) throw new Error('Estilo não encontrado.');
  if (!est.pronto) throw new Error(`O estilo "${est.nome}" ainda está em construção.`);
  const pasta = est.motor === 'remotion' ? `videos/${id}` : `Kit_Video_3d/projects/${id}`;
  fs.mkdirSync(path.join(VIDEOS, id), { recursive: true });
  fs.mkdirSync(path.join(RAIZ, pasta), { recursive: true });
  const v = { id, titulo: titulo || ideia.split(/[.,:;!?]/)[0].slice(0, 60), ideia: ideia.trim(), duracaoAlvo: Number(duracao) || 45,
    estilo: est.slug, personagens: [], pasta, voz: { perfil: '2f02b91b', motor: 'omnivoice', velocidade: 0.82 },
    etapa: 'roteiro', estado: 'aguardando_ia', fluxo: 2,
    portoes: Object.fromEntries(ETAPAS.map((e) => [e, { aprovado: false, ajustes: [] }])),
    agenda: null, historico: [], criadoEm: agora() };
  return salvarVideo(v, 'pedido criado no painel');
}

// ---------- estilos e agenda ----------
function listarEstilos() {
  return fs.readdirSync(ESTILOS).filter((d) => fs.existsSync(path.join(ESTILOS, d, 'estilo.json')))
    .map((d) => lerJSON(path.join(ESTILOS, d, 'estilo.json'))).sort((a, b) => (b.nota || 0) - (a.nota || 0));
}
function agendar(v, { quando, plataformas, legenda }) {
  if (!quando) throw new Error('Escolha data e hora.');
  v.agenda = { quando, plataformas: plataformas?.length ? plataformas : ['youtube', 'instagram'], legenda: legenda || '', estado: 'na_fila' };
  salvarVideo({ ...v, etapa: 'agenda', estado: 'agendado' }, `agendado para ${quando}`);
}

// ---------- HTTP ----------
function enviar(res, code, corpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(typeof corpo === 'string' || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo));
}
function servirArquivo(req, res, arq) {
  if (!fs.existsSync(arq) || !fs.statSync(arq).isFile()) return enviar(res, 404, { erro: 'não achei' });
  const tam = fs.statSync(arq).size;
  const tipo = TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) { // vídeo/áudio com avanço (seek)
    const ini = range[1] ? Number(range[1]) : 0;
    const fim = range[2] ? Math.min(Number(range[2]), tam - 1) : tam - 1;
    res.writeHead(206, { 'Content-Type': tipo, 'Content-Range': `bytes ${ini}-${fim}/${tam}`, 'Accept-Ranges': 'bytes', 'Content-Length': fim - ini + 1 });
    return fs.createReadStream(arq, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': tam, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(arq).pipe(res);
}
const lerCorpo = (req) => new Promise((ok, falha) => {
  const partes = []; let tam = 0;
  req.on('data', (c) => { partes.push(c); tam += c.length; if (tam > 12e6) req.destroy(); });
  req.on('end', () => { try { const d = Buffer.concat(partes).toString('utf8'); ok(d ? JSON.parse(d) : {}); } catch (e) { falha(e); } });
});

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith('/midia/')) { // só arquivos dentro de videos/ e Kit_Video_3d/projects/
      const arq = path.resolve(RAIZ, p.slice(7));
      const permitido = [VIDEOS, path.join(KIT, 'projects'), path.join(RAIZ, 'biblioteca')].some((b) => arq.startsWith(b + path.sep));
      return permitido ? servirArquivo(req, res, arq) : enviar(res, 403, { erro: 'fora das pastas permitidas' });
    }
    if (p.startsWith('/api/')) {
      const partes = p.split('/').filter(Boolean); // api, recurso, id, acao
      if (req.method === 'GET' && p === '/api/videos') return enviar(res, 200, listarVideos().map((v) => ({ ...v, temCapa: (() => { try { return Math.round(fs.statSync(path.join(RAIZ, v.pasta, 'render', 'capa.png')).mtimeMs); } catch { return 0; } })(), job: situacao(JOBS.get(v.id)), previsoes: previsoes(v), orfao: ['ia_trabalhando', 'processando'].includes(v.estado) && !JOBS.get(v.id)?.rodando })));
      if (req.method === 'POST' && p === '/api/videos') return enviar(res, 200, novoVideo(await lerCorpo(req)));
      if (req.method === 'GET' && p === '/api/estilos') return enviar(res, 200, listarEstilos());
      if (req.method === 'GET' && p === '/api/biblioteca') return enviar(res, 200, listarBiblioteca());
      if (req.method === 'POST' && p === '/api/visualizador') return enviar(res, 200, await abrirVisualizador());
      if (req.method === 'POST' && p === '/api/biblioteca/kit3d') { rodar({ id: 'bib-kit3d', pasta: 'biblioteca', logDir: BIB }, 'vitrine', [['node', ['pipeline/biblioteca.mjs', 'kit3d']]], null, 'vitrine-kit', 1); return enviar(res, 200, { ok: true }); }
      if (req.method === 'POST' && p === '/api/biblioteca/pedidos') return enviar(res, 200, novoPedido(await lerCorpo(req)));
      if (partes[1] === 'biblioteca' && partes[2] === 'pedidos' && partes[3] && req.method === 'POST') {
        const id = partes[3]; if (!idValido(id) || !fs.existsSync(dirPedido(id))) return enviar(res, 404, { erro: 'pedido não existe' });
        const corpo = await lerCorpo(req);
        if (partes[4] === 'escolher') escolherOpcao(id, corpo.n);
        else if (partes[4] === 'ajuste') ajustePedido(id, corpo.texto);
        else if (partes[4] === 'ia') iaBiblioteca(id);
        else return enviar(res, 404, { erro: 'ação desconhecida' });
        return enviar(res, 200, pedidoDetalhe(id));
      }
      if (req.method === 'GET' && p === '/api/previsoes') return enviar(res, 200, previsoes({ pasta: 'videos/_nenhum', duracaoAlvo: 45 }));
      if (req.method === 'POST' && partes[1] === 'estilos' && partes[3] === 'nota') {
        const arq = path.join(ESTILOS, partes[2], 'estilo.json'); const e = lerJSON(arq);
        if (!e || !idValido(partes[2])) return enviar(res, 404, { erro: 'estilo não existe' });
        e.nota = Math.max(0, Math.min(5, Number((await lerCorpo(req)).nota) || 0)); gravarJSON(arq, e); return enviar(res, 200, e);
      }
      if (partes[1] === 'videos' && partes[2]) {
        const v = lerVideo(partes[2]);
        if (!v) return enviar(res, 404, { erro: 'vídeo não existe' });
        const acao = partes[3];
        if (req.method === 'GET' && !acao) return enviar(res, 200, detalhes(v));
        if (req.method === 'GET' && acao === 'log') return enviar(res, 200, situacao(JOBS.get(v.id)) || {});
        if (req.method === 'POST') {
          const corpo = await lerCorpo(req);
          if (acao === 'aprovar') aprovar(v);
          else if (acao === 'ajuste') pedirAjuste(v, corpo.texto);
          else if (acao === 'agendar') agendar(v, corpo);
          else if (acao === 'voz') salvarVideo({ ...v, voz: { ...v.voz, ...corpo } }, 'voz alterada');
          else if (acao === 'frases') salvarFrases(v, corpo);
          else if (acao === 'gravar') ACOES.gravar(v, corpo.ids);
          else if (acao === 'montar') ACOES.montar(v);
          else if (acao === 'escolher') escolherVariante(v, corpo);
          else if (acao === 'recomendadas') escolherRecomendadas(v);
          else if (acao === 'ajuste-cena') ajusteCena(v, corpo);
          else if (acao === 'midia') ACOES.midia(v);
          else if (ACOES[acao]) ACOES[acao](v);
          else return enviar(res, 404, { erro: 'ação desconhecida' });
          return enviar(res, 200, detalhes(lerVideo(v.id)));
        }
      }
      return enviar(res, 404, { erro: 'rota desconhecida' });
    }
    const arq = path.resolve(PUBLICO, p === '/' ? 'index.html' : p.slice(1));
    if (!arq.startsWith(PUBLICO)) return enviar(res, 403, { erro: 'proibido' });
    return servirArquivo(req, res, arq);
  } catch (e) {
    return enviar(res, 400, { erro: e.message });
  }
});
servidor.listen(PORTA, '127.0.0.1', () => console.log(`VideosHub: http://localhost:${PORTA}`));
