// Painel do VideosHub (sem framework). Rotas: #/ · #/novo · #/v/<id> · #/cardapio · #/agenda
// A tela só é redesenhada quando algo muda de verdade; entre uma mudança e outra, só as barras e os cronômetros andam.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const ETAPAS = [['roteiro', 'Roteiro'], ['narracao', 'Narração'], ['cenas', 'Cenas'], ['final', 'Vídeo final'], ['agenda', 'Agenda']];
const NOME_TAREFA = { vozpropria: 'Preparando a sua gravação', trilha: 'Refazendo a trilha sonora', variantes: 'Gerando os clipes das cenas', gravar: 'Gravando os takes', montar: 'Montando o áudio', narrar: 'Gerando a narração', quadros: 'Gerando os quadros', previa: 'Gerando a prévia', render: 'Renderizando o vídeo', ia: 'A IA está trabalhando' };
let ciclo = null;
let assinatura = '';
let rotaAtual = '';
let recebidoEm = Date.now();

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function md(t) { // markdown simples: títulos, negrito, listas
  return esc(t || '—').split('\n').map((l) => {
    const neg = (x) => x.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (/^#{1,3} /.test(l)) return `<h3>${neg(l.replace(/^#+ /, ''))}</h3>`;
    if (/^\s*([-*]|\d+\.) /.test(l)) return `<div class="item">${neg(l.replace(/^\s*([-*]|\d+\.) /, ''))}</div>`;
    return l.trim() ? `<div>${neg(l)}</div>` : '<div style="height:6px"></div>';
  }).join('');
}
const relogio = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const duracao = (s) => (s < 60 ? `${Math.max(5, Math.round(s / 5) * 5)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
async function api(url, corpo) {
  const r = await fetch(url, corpo === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.erro || 'Não deu certo. Tente de novo.');
  return d;
}
function aviso(msg, ok = false) {
  const a = $('#aviso'); a.textContent = msg; a.className = ok ? 'aviso ok' : 'aviso'; a.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, 3200);
}
const vezDoCriador = (v) => ['aguardando_aprovacao', 'aguardando_agenda'].includes(v.estado);
const maquinaTrabalhando = (v) => v.job?.rodando || ['ia_trabalhando', 'processando'].includes(v.estado) && !v.orfao;

function selo(v) {
  if (v.job?.rodando) return `<span class="selo maquina"><i class="pulso"></i>${esc(NOME_TAREFA[v.job.tipo] || 'Trabalhando')}</span>`;
  if (v.orfao) return '<span class="selo erro">Tarefa interrompida</span>';
  return {
    aguardando_aprovacao: '<span class="selo vez">Sua vez: aprovar</span>',
    aguardando_agenda: '<span class="selo vez">Sua vez: agendar</span>',
    aguardando_ia: '<span class="selo maquina">Na fila da IA</span>',
    agendado: '<span class="selo pronto">Agendado</span>',
    publicado: '<span class="selo pronto">Publicado</span>',
    erro: '<span class="selo erro">Erro</span>',
  }[v.estado] || `<span class="selo">${esc(v.estado)}</span>`;
}
function tira(v) {
  const idx = ETAPAS.findIndex(([e]) => e === v.etapa);
  return `<div class="tira" aria-hidden="true">${ETAPAS.map((_, i) => `<i class="${v.estado === 'agendado' || i < idx ? 'feito' : i === idx ? `agora ${maquinaTrabalhando(v) ? 'maquina' : ''}` : ''}"></i>`).join('')}</div>`;
}
function barra(job, grande = false) {
  if (!job?.rodando) return '';
  return `<div class="progresso" data-job>
    ${grande ? `<div class="fase" data-fase>${esc(job.fase || '')}</div>` : ''}
    <div class="trilho ${grande ? 'grande' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(job.progresso * 100)}"><i style="width:${(job.progresso * 100).toFixed(1)}%"></i></div>
    <div class="linha-tempo"><span data-decorrido="${job.decorrido}">${relogio(job.decorrido)}</span>
      <span data-restante="${job.restante}" class="${job.atrasado ? 'atrasado' : ''}">${job.atrasado ? 'demorando mais que o normal' : `faltam ~${relogio(job.restante)}`} · <b data-pct>${Math.round(job.progresso * 100)}%</b></span></div>
  </div>`;
}
// Atualiza barras e textos já desenhados, sem refazer a tela.
function atualizarBarra(el, job) {
  if (!el || !job) return;
  $('i', $('.trilho', el)).style.width = `${(job.progresso * 100).toFixed(1)}%`;
  $('.trilho', el).setAttribute('aria-valuenow', Math.round(job.progresso * 100));
  const pct = $('[data-pct]', el); if (pct) pct.textContent = `${Math.round(job.progresso * 100)}%`;
  const dec = $('[data-decorrido]', el); if (dec) dec.dataset.decorrido = job.decorrido;
  const res = $('[data-restante]', el);
  if (res) { res.dataset.restante = job.restante; res.classList.toggle('atrasado', !!job.atrasado); res.firstChild.textContent = job.atrasado ? 'demorando mais que o normal · ' : `faltam ~${relogio(job.restante)} · `; }
  const fase = $('[data-fase]', el); if (fase && fase.textContent !== job.fase) fase.textContent = job.fase || '';
}
// Cronômetros andam a cada segundo entre as consultas ao servidor.
setInterval(() => {
  const passou = (Date.now() - recebidoEm) / 1000;
  $$('[data-decorrido]').forEach((e) => { e.textContent = relogio(Number(e.dataset.decorrido) + passou); });
  $$('[data-restante]').forEach((e) => { if (!e.classList.contains('atrasado')) e.firstChild.textContent = `faltam ~${relogio(Number(e.dataset.restante) - passou)} · `; });
}, 1000);

function fila(vs) {
  const f = $('#fila');
  const rodando = vs.filter((v) => v.job?.rodando);
  if (!rodando.length) { f.hidden = true; return; }
  const media = rodando.reduce((a, v) => a + v.job.progresso, 0) / rodando.length;
  f.hidden = false;
  f.href = `#/v/${rodando[0].id}`;
  f.innerHTML = `<i class="pulso"></i>${rodando.length === 1 ? esc(NOME_TAREFA[rodando[0].job.tipo]) : `${rodando.length} tarefas`}<span class="mini"><i style="width:${(media * 100).toFixed(0)}%"></i></span>`;
}

// ---------- tela: vídeos ----------
function cartao(v) {
  const capa = v.capaUrl ? `<img src="${v.capaUrl}" alt="">` : '';
  return `<a class="cartao ${vezDoCriador(v) ? 'sua-vez' : ''}" href="#/v/${v.id}" data-id="${v.id}">
    <div class="fotograma ${capa ? '' : 'vazio'}">${capa}</div>
    <div><h3>${esc(v.titulo)}</h3>${tira(v)}${selo(v)}${barra(v.job)}<p>${esc(v.ideia)}</p></div></a>`;
}
async function telaVideos() {
  const vs = await api('/api/videos');
  for (const v of vs) v.capaUrl = v.temCapa ? `/midia/${v.pasta}/render/capa.png?v=${v.temCapa}` : null;
  fila(vs);
  const grupos = [
    ['Esperando você', vs.filter(vezDoCriador)],
    ['Em produção', vs.filter((v) => !vezDoCriador(v) && !['agendado', 'publicado'].includes(v.estado))],
    ['Agendados', vs.filter((v) => ['agendado', 'publicado'].includes(v.estado))],
  ].filter(([, l]) => l.length);
  const sig = JSON.stringify(vs.map((v) => [v.id, v.etapa, v.estado, v.job?.rodando, v.job?.tipo, v.orfao, v.capaUrl]));
  if (sig === assinatura && $('.grade')) { // só atualiza as barras
    for (const v of vs) atualizarBarra($(`[data-id="${v.id}"] [data-job]`), v.job);
  } else {
    assinatura = sig;
    const pend = vs.filter(vezDoCriador).length;
    app.innerHTML = `<div class="entra"><h1>Vídeos</h1>
      <p class="sub">${pend ? `${pend} ${pend === 1 ? 'vídeo espera' : 'vídeos esperam'} a sua decisão.` : vs.length ? 'Nada esperando você agora.' : ''}</p>
      ${grupos.length ? grupos.map(([t, l]) => `<div class="secao"><span class="n">${l.length}</span> ${t}</div><div class="grade">${l.map(cartao).join('')}</div>`).join('')
        : '<p class="vazio">Nenhum vídeo ainda. <a href="#/novo">Peça o primeiro</a>: você descreve a ideia e a IA escreve o roteiro.</p>'}</div>`;
  }
  recebidoEm = Date.now();
  return vs.some((v) => v.job?.rodando || v.estado === 'ia_trabalhando');
}


// ---------- 10 ideias (tela Novo vídeo) ----------
function blocoIdeias(d) {
  if (!d) return '';
  if (d.estado === 'ia_trabalhando' || d.job?.rodando) {
    return `<div class="bloco maquina"><h2>Pensando em 10 ideias${d.tema ? ` sobre “${esc(d.tema)}”` : ''}</h2>${barra(d.job, true)}
      ${d.job?.atividade?.length ? `<ol class="atividade">${d.job.atividade.slice(-4).map((a) => `<li><time>${a.em.slice(14, 19)}</time>${esc(a.texto)}</li>`).join('')}</ol>` : ''}
      <p class="dica">A IA confere na web os fatos de cada ideia apresentada como verdade.</p></div>`;
  }
  if (d.estado === 'erro') return `<div class="bloco erro"><h2>Ideias</h2><p>${esc(d.erro || 'Não deu certo.')} Tente de novo.</p></div>`;
  return `<div class="bloco ideias"><div class="audio-topo"><div class="bloco-titulo" style="margin:0">10 ideias${d.tema ? ` · ${esc(d.tema)}` : ''}</div>
      <button data-mais-ideias>Me dê mais 10</button></div>
    <div class="lista-ideias">${(d.ideias || []).map((i) => `<article class="ideia" data-ideia="${i.n}">
      <span class="frase-n">${String(i.n).padStart(2, '0')}</span>
      <div><h3>${esc(i.titulo)}</h3><p class="gancho">“${esc(i.gancho)}”</p>${i.receita ? `<p class="dica" style="margin:2px 0 6px"><span class="selo">${esc(i.receita)}</span></p>` : ''}
        <p><b>Virada:</b> ${esc(i.virada)}</p>${i.pensaComigo ? `<p><b>Pensa comigo:</b> ${esc(i.pensaComigo)}</p>` : ''}<p><b>Anima bem:</b> ${esc(i.porQueAnima)}</p>
        <p class="dica" style="margin:4px 0 0"><span class="selo ${/lenda|disput/i.test(i.fatoOuLenda) ? 'vez' : /fic/i.test(i.fatoOuLenda) ? '' : 'pronto'}">${esc(i.fatoOuLenda)}</span>
        ${(i.fontes || []).slice(0, 2).map((f) => ` <a href="${esc(f)}" target="_blank" rel="noopener">fonte</a>`).join('')}</p></div>
      <button class="vez" data-fazer="${i.n}">Fazer este</button></article>`).join('')}</div></div>`;
}

// ---------- quem narra (etapa de áudio) ----------
let VOZES = null;
async function carregarVozes() { const d = await api('/api/vozes').catch(() => null); VOZES = d?.vozes || []; return d; }
function cartoesVozes(v) {
  if (!VOZES?.length) return '';
  const atual = v.voz?.catalogo || VOZES.find((x) => x.perfil === v.voz?.perfil)?.id;
  return `<div class="vozes">${VOZES.map((x) => `<article class="voz-cartao ${x.id === atual ? 'on' : ''}" data-voz="${x.id}">
      <div><b>${esc(x.nome)}</b> ${x.comercial ? '<span class="selo pronto">pode monetizar</span>' : '<span class="selo">uso não comercial</span>'}
        <p>${esc(x.descricao || '')}</p></div>
      <div class="acoes" style="margin:0">${x.amostraUrl ? `<button data-amostra="${x.amostraUrl}">▶ Ouvir</button>` : ''}
        ${x.id === atual ? '<span class="selo pronto">Em uso</span>' : `<button class="vez" data-usar-voz="${x.id}">Usar esta voz</button>`}</div>
    </article>`).join('')}</div>`;
}
function blocoQuemNarra(v) {
  const gravacao = v.voz?.modo === 'gravacao';
  const vi = v.arquivos.vozInfo;
  const rodando = v.job?.rodando;
  return `<div class="bloco quem-narra">
    <div class="audio-topo"><div class="bloco-titulo" style="margin:0">Quem narra</div>
      <div class="segmentado"><button class="${gravacao ? '' : 'on'}" data-narra="narrador" ${rodando ? 'disabled' : ''}>Narrador (IA)</button><button class="${gravacao ? 'on' : ''}" data-narra="gravacao" ${rodando ? 'disabled' : ''}>Minha gravação</button></div></div>
    <div data-painel-narrador ${gravacao ? 'hidden' : ''}>${cartoesVozes(v)}<p class="dica">Ao trocar de voz, todas as frases ficam marcadas para gravar de novo com a voz nova.</p></div>
    <div data-painel-gravacao ${gravacao ? '' : 'hidden'}>
      ${gravacao && v.arquivos.audio ? `<audio controls src="${v.arquivos.audio}" style="margin-top:12px"></audio>
        <div class="uso"><span><b>${relogio(vi?.duracao || 0)}</b> de áudio</span><span>legenda pelo <b>${vi?.legendaDe === 'whisper' ? 'que você falou' : 'roteiro'}</b></span><span><b>${Math.round((vi?.coberturaTempos || 0) * 100)}%</b> do roteiro reconhecido</span></div>
        <p class="dica">O Whisper ouviu: “${esc(vi?.ouvidoPeloWhisper || '')}”</p>` : ''}
      <p class="dica">Grave lendo o roteiro abaixo, com uma voz firme e calorosa e pausas naturais no fim das frases, sem música. Pode ser wav, mp3 ou m4a (o áudio do WhatsApp também serve). A gravação entra <b>sem nenhuma alteração</b>: o vídeo é que se ajusta a ela.</p>
      <details><summary>Roteiro para ler</summary><p class="texto" style="margin-top:8px">${esc((v.arquivos.narracao || '').replace(/\[(laughter|sigh)\]\s*/g, ''))}</p></details>
      ${!rodando ? `<div class="acoes"><input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.opus" data-arquivo-voz style="max-width:340px"><button class="vez" data-enviar-voz>${gravacao ? 'Trocar a gravação' : 'Usar esta gravação'}</button></div>` : ''}
    </div>
  </div>`;
}
function ligarQuemNarra(id) {
  const box = $('.quem-narra'); if (!box) return;
  $$('[data-narra]', box).forEach((b) => { b.onclick = async () => {
    if (b.dataset.narra === 'gravacao') { $$('[data-narra]', box).forEach((x) => x.classList.toggle('on', x === b)); $('[data-painel-gravacao]', box).hidden = false; $('[data-painel-narrador]', box).hidden = true; return; }
    try { await api(`/api/videos/${id}/voz-narrador`, {}); aviso('Voltando para a voz do narrador', true); } catch (e) { aviso(e.message); }
    assinatura = ''; rodarCiclo();
  }; });
  $$('[data-amostra]', box).forEach((b) => { b.onclick = () => tocar(b.dataset.amostra, b); });
  $$('[data-usar-voz]', box).forEach((b) => { b.onclick = async () => {
    try { b.disabled = true; await api(`/api/videos/${id}/voz`, { catalogo: b.dataset.usarVoz }); abrirMotorDaVoz(VOZES.find((x) => x.id === b.dataset.usarVoz)); aviso('Voz trocada: grave as frases de novo para ouvir', true); } catch (e) { aviso(e.message); b.disabled = false; }
    assinatura = ''; rodarCiclo();
  }; });
  const env = $('[data-enviar-voz]', box);
  if (env) env.onclick = async () => {
    const arq = $('[data-arquivo-voz]', box).files[0];
    if (!arq) { aviso('Escolha o arquivo da sua gravação.'); return; }
    if (arq.size > 40e6) { aviso('Arquivo grande demais (máx. 40 MB).'); return; }
    try {
      env.disabled = true;
      const dados = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(arq); });
      await api(`/api/videos/${id}/voz-propria`, { arquivo: dados, nome: arq.name });
      aviso('Gravação enviada: marcando o tempo das palavras', true);
    } catch (e) { aviso(e.message); env.disabled = false; }
    assinatura = ''; rodarCiclo();
  };
}

// ---------- tela: novo vídeo ----------
async function telaNovo() {
  const estilos = await api('/api/estilos');
  if (!VOZES) await carregarVozes();
  app.innerHTML = `<div class="entra"><h1>Novo vídeo</h1><p class="sub">Descreva a história. A IA escreve a sinopse e a narração, e você aprova cada etapa.</p>
    <div class="bloco" style="max-width:700px">
      <label for="ideia" style="margin-top:0">Ideia</label>
      <textarea id="ideia" placeholder="Ex.: o Tales ganha um vale-presente do mercado e gasta tudo em brinde de posto de gasolina"></textarea>
      <label for="titulo">Título interno <span style="font-weight:400">(opcional)</span></label><input id="titulo">
      <div style="display:grid;grid-template-columns:140px 1fr;gap:14px">
        <div><label for="duracao">Duração</label><select id="duracao">${[30, 45, 60, 90].map((d) => `<option value="${d}" ${d === 45 ? 'selected' : ''}>${d} s</option>`).join('')}</select></div>
        <div><label for="estilo">Estilo</label><select id="estilo">${estilos.map((e) => `<option value="${e.slug}" ${e.pronto ? '' : 'disabled'}>${esc(e.nome)}${e.pronto ? '' : ' (em construção)'}</option>`).join('')}</select></div>
      </div>
      <label>Voz do narrador</label><input type="hidden" id="voz">
      <div id="vozes-novo"></div>
      <p class="dica" id="estimativa"></p>
      <div class="acoes"><button class="vez" id="criarIA">Criar e pedir o roteiro à IA</button><button id="criar">Só criar</button></div>
    </div>
    <div class="bloco" style="max-width:700px">
      <div class="bloco-titulo">Sem ideia? Peça 10</div>
      <div class="acoes" style="margin-top:0"><input id="tema-ideias" placeholder="Tema opcional: invenções por acidente, leis absurdas, o Tales no trabalho..." style="flex:1;min-width:240px">
        <button class="maquina" id="pedir-ideias">Me dê 10 ideias</button></div>
      <p class="dica">A IA mistura épocas e temas, confere os fatos na web e diz o que é fato e o que é lenda. Você escolhe uma e ela vira o pedido.</p>
    </div>
    <div id="ideias-area"></div></div>`;
  const prev = await api('/api/previsoes').catch(() => null);
  if (prev) $('#estimativa').textContent = `Tempo de máquina previsto do pedido ao vídeo pronto: ~${duracao(prev.roteiro + prev.narracao + prev.cenas + prev.final)}, sem contar o tempo das suas aprovações.`;
  vozesAssinatura = ''; await atualizarVozesNovo();
  const vozEscolhida = () => $('#voz')?.value;
  const criar = async (comIA, botao) => {
    try {
      botao.disabled = true;
      const v = await api('/api/videos', { ideia: $('#ideia').value, titulo: $('#titulo').value, duracao: $('#duracao').value, estilo: $('#estilo').value, voz: vozEscolhida() });
      if (comIA) await api(`/api/videos/${v.id}/ia`, {});
      location.hash = `#/v/${v.id}`;
    } catch (e) { aviso(e.message); botao.disabled = false; }
  };
  $('#criarIA').onclick = (e) => criar(true, e.target);
  $('#criar').onclick = (e) => criar(false, e.target);
  $('#pedir-ideias').onclick = async (e) => {
    try { e.target.disabled = true; await api('/api/ideias', { tema: $('#tema-ideias').value, duracao: $('#duracao').value, estilo: $('#estilo').value }); aviso('A IA está pensando em 10 ideias', true); } catch (er) { aviso(er.message); }
    e.target.disabled = false; ideiasAssinatura = ''; await atualizarIdeias(); rodarCiclo();
  };
  await atualizarIdeias();
}
// ---------- escolha da voz no Novo vídeo (cada voz se apresenta) ----------
let vozesAssinatura = '';
let vozNovo = null;
function blocoVozesNovo(d) {
  const vozes = d?.vozes || [];
  if (!vozes.length) return '<p class="vazio">Nenhuma voz no catálogo (config/vozes.json).</p>';
  if (!vozes.some((x) => x.id === vozNovo)) vozNovo = vozes[0].id;
  const rodando = d.job?.rodando;
  const faltam = vozes.filter((x) => !x.apresentacaoUrl).length;
  return `${rodando ? barra(d.job, true) : faltam ? `<div class="aviso-vozes"><span>${faltam === vozes.length ? 'As vozes ainda não gravaram a apresentação.' : `${faltam} ${faltam === 1 ? 'voz ainda não gravou' : 'vozes ainda não gravaram'} a apresentação.`} O painel abre o VoiceStudio${vozes.some((x) => !x.apresentacaoUrl && x.motor === 'voicebox') ? ' e o Voicebox' : ''} sozinho.</span>
      <button class="maquina" data-apresentar>Gravar ${faltam === 1 ? 'a apresentação' : `as ${faltam} apresentações`}</button></div>` : ''}
    ${d.erro && !rodando ? `<p class="dica" style="color:var(--erro)">Não deu para gravar: ${esc(d.erro)}</p>` : ''}
    <div class="vozes" role="radiogroup" aria-label="Voz do narrador">${vozes.map((x) => `<article class="voz-cartao escolher ${x.id === vozNovo ? 'on' : ''}" data-escolher-voz="${x.id}" role="radio" aria-checked="${x.id === vozNovo}" tabindex="0">
      <div><b>${esc(x.nome)}</b> ${x.comercial ? '<span class="selo pronto">pode monetizar</span>' : '<span class="selo">uso não comercial</span>'}
        <p>${esc(x.descricao || '')}</p></div>
      <div class="acoes" style="margin:0">${x.apresentacaoUrl ? `<button type="button" data-amostra="${x.apresentacaoUrl}">▶ Ouvir apresentação</button>`
        : x.amostraUrl ? `<button type="button" data-amostra="${x.amostraUrl}" title="Ainda sem apresentação: toca o teste antigo">▶ Ouvir teste</button>` : ''}
        ${x.apresentacaoUrl && !rodando ? `<button type="button" class="discreto" data-reapresentar="${x.id}" title="Gravar a apresentação de novo">↻</button>` : ''}
        ${x.id === vozNovo ? '<span class="selo pronto">Escolhida</span>' : ''}</div>
    </article>`).join('')}</div>
    ${seloMotor(d, vozes.find((x) => x.id === vozNovo))}`;
}
const appDoMotor = (motor) => (motor === 'voicebox' ? 'voicebox' : 'voicestudio');
function seloMotor(d, voz) { // mostra se o app da voz escolhida está aberto
  const m = voz && d?.motores?.[appDoMotor(voz.motor)];
  if (!m) return '';
  const txt = { pronto: `${m.nome} aberto e pronto`, abrindo: `Abrindo o ${m.nome}…`, fechado: `${m.nome} fechado: ele abre sozinho quando você escolhe a voz` }[m.estado];
  return `<p class="dica motor-estado ${m.estado}" style="margin-top:10px"><i></i>${txt}</p>`;
}
async function abrirMotorDaVoz(voz) {
  if (!voz) return;
  try { const r = await api('/api/motores/abrir', { motor: voz.motor }); if (r.estado === 'abrindo') aviso(`Abrindo o ${appDoMotor(voz.motor) === 'voicebox' ? 'Voicebox' : 'VoiceStudio'}`, true); }
  catch (e) { aviso(e.message); }
}
async function atualizarVozesNovo() {
  const area = $('#vozes-novo'); if (!area) return false;
  const d = await carregarVozes();
  const sig = JSON.stringify([d?.job?.rodando, d?.job?.ok, d?.erro, vozNovo, d?.motores, (d?.vozes || []).map((x) => [x.id, x.apresentacaoUrl, x.amostraUrl])]);
  if (sig !== vozesAssinatura) {
    vozesAssinatura = sig;
    area.innerHTML = blocoVozesNovo(d);
    $('#voz').value = vozNovo || '';
    const escolher = async (id) => { vozNovo = id; vozesAssinatura = ''; await abrirMotorDaVoz(VOZES.find((x) => x.id === id)); await atualizarVozesNovo(); rodarCiclo(); };
    $$('[data-escolher-voz]', area).forEach((c) => {
      c.onclick = (e) => { if (!e.target.closest('button')) escolher(c.dataset.escolherVoz); };
      c.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); escolher(c.dataset.escolherVoz); } };
    });
    $$('[data-amostra]', area).forEach((b) => { b.onclick = () => tocar(b.dataset.amostra, b); });
    const pedir = async (b, corpo) => {
      try { b.disabled = true; await api('/api/vozes/apresentar', corpo); aviso('Gravando as apresentações das vozes', true); } catch (e) { aviso(e.message); b.disabled = false; }
      vozesAssinatura = ''; await atualizarVozesNovo(); rodarCiclo();
    };
    const ap = $('[data-apresentar]', area); if (ap) ap.onclick = () => pedir(ap, {});
    $$('[data-reapresentar]', area).forEach((b) => { b.onclick = () => pedir(b, { id: b.dataset.reapresentar, refazer: true }); });
  } else if (d?.job?.rodando) atualizarBarra($('[data-job]', area), d.job);
  return !!d?.job?.rodando || Object.values(d?.motores || {}).some((m) => m.estado === 'abrindo');
}
let ideiasAssinatura = '';
async function atualizarIdeias() {
  const area = $('#ideias-area'); if (!area) return false;
  const d = await api('/api/ideias').catch(() => null);
  const sig = JSON.stringify([d?.id, d?.estado, d?.job?.rodando, (d?.ideias || []).length]);
  if (sig !== ideiasAssinatura) {
    ideiasAssinatura = sig;
    area.innerHTML = blocoIdeias(d);
    $$('[data-fazer]', area).forEach((b) => { b.onclick = async () => {
      const i = d.ideias.find((x) => String(x.n) === b.dataset.fazer);
      const ideia = `${i.titulo}. Gancho: ${i.gancho} Virada: ${i.virada} Momentos visuais: ${i.porQueAnima}.${i.receita ? ` Receita do gancho: ${i.receita}.` : ''}${i.pensaComigo ? ` Pensa comigo: ${i.pensaComigo}.` : ''} (${i.fatoOuLenda}${i.fontes?.length ? `; fontes: ${i.fontes.join(' ')}` : ''})`;
      try { b.disabled = true; const v = await api('/api/videos', { ideia, titulo: i.titulo, duracao: $('#duracao').value, estilo: $('#estilo').value, voz: $('#voz')?.value }); await api(`/api/videos/${v.id}/ia`, {}); location.hash = `#/v/${v.id}`; }
      catch (e) { aviso(e.message); b.disabled = false; }
    }; });
    const mais = $('[data-mais-ideias]', area);
    if (mais) mais.onclick = () => $('#pedir-ideias').click();
  } else if (d?.job?.rodando) atualizarBarra($('[data-job]', area), d.job);
  return !!(d?.job?.rodando || d?.estado === 'ia_trabalhando');
}


// ---------- editor de áudio frase por frase ----------
const ENERGIAS = [['calma', 'Calma'], ['normal', 'Normal'], ['animada', 'Animada']];
const EFEITOS = [['nenhum', 'Sem efeito'], ['risada', 'Risada no fim'], ['suspiro', 'Suspiro antes']];
const VELOCIDADES = [0.72, 0.76, 0.8, 0.82, 0.86, 0.9, 0.95, 1];
const tocador = new Audio();
function tocar(url, botao) {
  $$('.take.tocando, .montagem.tocando, button.tocando').forEach((b) => b.classList.remove('tocando'));
  if (tocador.src.endsWith(url) && !tocador.paused) { tocador.pause(); return; }
  tocador.src = url; tocador.play();
  botao?.classList.add('tocando');
  tocador.onended = () => botao?.classList.remove('tocando');
}
function marcacaoTabela(m) {
  if (!m?.length) return '';
  const rotulo = (lista, v) => (lista.find(([k]) => k === v) || [v, v])[1];
  return `<div class="bloco"><h2>Marcação proposta para a leitura</h2><p class="dica" style="margin:0 0 10px">Você ajusta tudo isso na etapa de áudio, frase por frase.</p>
    <table class="marcacao"><tr><th></th><th>Frase</th><th>Energia</th><th>Pausa</th><th>Efeito</th></tr>
    ${m.map((f, i) => `<tr><td class="tempo">${i + 1}</td><td>${esc(f.texto)}</td><td><span class="energia ${esc(f.energia)}">${esc(rotulo(ENERGIAS, f.energia || 'normal'))}</span></td><td class="tempo">${Number(f.pausa ?? 0.35).toFixed(2)}s</td><td>${f.efeito && f.efeito !== 'nenhum' ? esc(rotulo(EFEITOS, f.efeito)) : '—'}</td></tr>`).join('')}</table></div>`;
}
function blocoAudio(v) {
  const d = v.arquivos.audioFrases;
  const rodando = v.job?.rodando;
  if (!d) return `<div class="bloco"><h2>Áudio frase por frase</h2><p class="vazio">As frases aparecem aqui quando a gravação começar.</p></div>`;
  const alteradas = d.frases.filter((f) => f.precisaGravar);
  const atual = d.montagem?.atual;
  const linhas = d.frases.map((f, i) => `
    <div class="frase ${f.precisaGravar ? 'alterada' : ''}" data-f="${f.id}">
      <div class="frase-cab"><span class="frase-n">${String(i + 1).padStart(2, '0')}</span>
        <textarea class="frase-texto" data-campo="texto" rows="1" ${rodando ? 'disabled' : ''}>${esc(f.texto)}</textarea></div>
      <div class="frase-controles">
        <div class="segmentado" role="radiogroup" aria-label="Energia">${ENERGIAS.map(([k, n]) => `<button class="${f.energia === k ? 'on' : ''} ${k}" data-campo="energia" data-valor="${k}" ${rodando ? 'disabled' : ''}>${n}</button>`).join('')}</div>
        <select data-campo="efeito" ${rodando ? 'disabled' : ''} aria-label="Efeito">${EFEITOS.map(([k, n]) => `<option value="${k}" ${f.efeito === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <select data-campo="velocidade" ${rodando ? 'disabled' : ''} aria-label="Velocidade">${VELOCIDADES.map((x) => `<option value="${x}" ${Math.abs(x - (f.velocidade || d.voz.velocidade)) < 0.001 ? 'selected' : ''}>vel. ${x}</option>`).join('')}</select>
        <label class="pausa">pausa <input type="range" min="0" max="2" step="0.05" value="${f.pausa}" data-campo="pausa" ${rodando ? 'disabled' : ''}><output>${Number(f.pausa).toFixed(2)}s</output></label>
      </div>
      <div class="takes">${f.takes.length ? f.takes.map((t, k) => `
        <span class="take ${t.id === f.escolhido ? 'escolhido' : ''} ${t.config.texto === f.takes.at(-1).config.texto && Math.abs(t.config.vel - f.takes.at(-1).config.vel) < 0.001 ? '' : 'antigo'}">
          <button class="tocar" data-tocar="${t.url}" aria-label="Ouvir take ${k + 1}">▶</button>
          <button class="usar" data-usar="${t.id}" ${rodando ? 'disabled' : ''}>Take ${k + 1} · ${t.duracao.toFixed(1)}s</button></span>`).join('') : '<span class="dica" style="margin:0">sem takes ainda</span>'}
        ${!rodando ? `<button class="regravar" data-regravar="${f.id}">${f.precisaGravar ? 'Gravar com a nova marcação' : '+3 takes'}</button>` : ''}
      </div>
    </div>`).join('');
  return `<div class="bloco audio-editor">
      <div class="audio-topo"><div class="bloco-titulo" style="margin:0">Áudio frase por frase</div>
        <div class="acoes" style="margin:0">
          ${alteradas.length && !rodando ? `<button class="maquina" data-acao-audio="gravar-alteradas">Gravar ${alteradas.length} frase${alteradas.length > 1 ? 's' : ''} alterada${alteradas.length > 1 ? 's' : ''}</button>` : ''}
          ${!rodando ? `<button class="montagem ${atual ? '' : 'vez'}" data-acao-audio="montagem">${atual ? '▶ Ouvir montagem' : 'Montar e ouvir'}</button>` : ''}
        </div></div>
      <p class="dica" style="margin:6px 0 16px">${rodando ? 'Gravando: os takes aparecem aqui conforme ficam prontos.' : atual ? `Montagem pronta: ${relogio(d.montagem.duracao)} com os takes escolhidos e suas pausas.` : 'Você mudou takes ou pausas: monte de novo para ouvir e aprovar.'}
        A energia é aproximada: muda a pontuação, a velocidade e o jeito de ler. Grave mais takes até achar a leitura certa.</p>
      ${alteradas.length && !rodando ? `<div class="faixa-alerta"><b>${alteradas.length} frase${alteradas.length > 1 ? 's' : ''} com texto ou marcação nova ainda sem gravação</b>
        <span>(${alteradas.map((f) => Number(f.id.slice(1))).join(', ')}). A montagem e a aprovação usam o áudio antigo até você gravar.</span>
        <button class="vez" data-acao-audio="gravar-alteradas">Gravar agora</button></div>` : ''}
      ${linhas}
    </div>`;
}
let salvarTimer = null;
const pendentes = {};
function salvarFrase(id, fid, campo, valor) {
  (pendentes[fid] ||= { id: fid })[campo] = valor;
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(async () => {
    const frases = Object.values(pendentes); for (const k of Object.keys(pendentes)) delete pendentes[k];
    try { await api(`/api/videos/${id}/frases`, { frases }); assinatura = ''; } catch (e) { aviso(e.message); }
  }, 500);
}
function ligarAudio(id) {
  const ed = $('.audio-editor'); if (!ed) return;
  $$('[data-tocar]', ed).forEach((b) => { b.onclick = () => tocar(b.dataset.tocar, b.closest('.take')); });
  $$('[data-usar]', ed).forEach((b) => { b.onclick = async () => {
    const fid = b.closest('[data-f]').dataset.f;
    try { await api(`/api/videos/${id}/frases`, { escolhas: { [fid]: b.dataset.usar } }); tocar($('[data-tocar]', b.closest('.take')).dataset.tocar, b.closest('.take')); assinatura = ''; rodarCiclo(); } catch (e) { aviso(e.message); }
  }; });
  $$('[data-campo]', ed).forEach((el) => {
    const fid = el.closest('[data-f]').dataset.f;
    if (el.tagName === 'BUTTON') el.onclick = () => { $$('button[data-campo="energia"]', el.parentElement).forEach((x) => x.classList.toggle('on', x === el)); el.closest('.frase').classList.add('alterada'); salvarFrase(id, fid, 'energia', el.dataset.valor); };
    else if (el.type === 'range') el.oninput = () => { el.nextElementSibling.textContent = `${Number(el.value).toFixed(2)}s`; salvarFrase(id, fid, 'pausa', Number(el.value)); };
    else el.onchange = () => { if (el.dataset.campo !== 'pausa') el.closest('.frase').classList.add('alterada'); salvarFrase(id, fid, el.dataset.campo, el.dataset.campo === 'velocidade' ? Number(el.value) : el.value); };
  });
  $$('textarea.frase-texto', ed).forEach((t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; t.oninput = () => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }; });
  $$('[data-regravar]', ed).forEach((b) => { b.onclick = async () => {
    try { await esperarSalvar(); await api(`/api/videos/${id}/gravar`, { ids: [b.dataset.regravar] }); aviso('Gravando 3 takes novos', true); } catch (e) { aviso(e.message); }
    assinatura = ''; rodarCiclo();
  }; });
  $$('[data-acao-audio]', ed).forEach((b) => { b.onclick = async () => {
    try {
      await esperarSalvar();
      if (b.dataset.acaoAudio === 'gravar-alteradas') {
        const v = await api(`/api/videos/${id}`);
        await api(`/api/videos/${id}/gravar`, { ids: v.arquivos.audioFrases.frases.filter((f) => f.precisaGravar).map((f) => f.id) });
        aviso('Gravando as frases alteradas', true);
      } else {
        const v = await api(`/api/videos/${id}`);
        if (v.arquivos.audioFrases.montagem?.atual) { tocar(v.arquivos.audio, b); return; }
        await api(`/api/videos/${id}/montar`, {}); aviso('Montando o áudio', true); esperandoMontagem = id;
      }
    } catch (e) { aviso(e.message); }
    assinatura = ''; rodarCiclo();
  }; });
}
let esperandoMontagem = null;
async function esperarSalvar() {
  if (!Object.keys(pendentes).length) return;
  clearTimeout(salvarTimer);
  const frases = Object.values(pendentes); for (const k of Object.keys(pendentes)) delete pendentes[k];
  await api(`/api/videos/${location.hash.slice(4)}/frases`, { frases });
}


// ---------- escolha de variantes de cena ----------
function blocoVariantes(v) {
  const d = v.arquivos.variantes;
  if (!d) return `<div class="bloco"><h2>Cenas</h2><p class="vazio">As variantes aparecem aqui quando a IA terminar de montar as cenas.</p></div>`;
  const rodando = v.job?.rodando;
  const escolhidas = d.cenas.filter((c) => c.escolhida).length;
  const frasesTxt = (c) => (c.frasesTexto || []).join(' ');
  return `<div class="bloco variantes">
    <div class="audio-topo"><div class="bloco-titulo" style="margin:0">Cenas · ${escolhidas} de ${d.cenas.length} escolhidas</div>
      ${escolhidas < d.cenas.length && !rodando ? '<button class="maquina" data-var-acao="recomendadas">Escolher as recomendadas nas que faltam</button>' : ''}</div>
    <div class="trilho-escolha" aria-hidden="true">${d.cenas.map((c) => `<i class="${c.escolhida ? 'on' : ''}"></i>`).join('')}</div>
    ${d.cenas.map((c, i) => {
      const abertos = (c.ajustes || []).filter((a) => !a.resolvido);
      return `<section class="cena-escolha" data-cena="${c.id}">
        <header><span class="frase-n">${String(i + 1).padStart(2, '0')}</span>
          <div><b>${esc(c.resumo || `Cena ${i + 1}`)}</b><small>${relogio(c.inicio)}–${relogio(c.fim)} · ${(c.fim - c.inicio).toFixed(1)}s ${frasesTxt(c) ? `· “${esc(frasesTxt(c))}”` : ''}</small></div>
          ${c.escolhida ? '<span class="selo pronto">Escolhida</span>' : '<span class="selo vez">Escolha</span>'}</header>
        <div class="opcoes">${c.variantes.map((x) => `
          <article class="opcao ${c.escolhida === x.id ? 'on' : ''}">
            <div class="opcao-midia" data-clipe="${x.clipeUrl || ''}">
              ${x.posterUrl ? `<img src="${x.posterUrl}" alt="" loading="lazy">` : '<div class="gerando">gerando clipe…</div>'}
              ${x.clipeUrl ? '<button class="play" aria-label="Assistir com som">▶</button>' : ''}
            </div>
            <div class="opcao-info">
              ${x.recomendada ? '<span class="recomendada">★ recomendada</span>' : ''}
              <p>${esc(x.descricao || '')}</p>
              ${x.erro ? `<p class="dica" style="color:var(--erro);margin:0">Clipe não gerado: ${esc(x.erro)}. Escolha pela imagem ou peça variantes novas.</p>` : ''}
              <button class="${c.escolhida === x.id ? 'aprovar' : ''}" data-escolher="${x.id}" ${rodando && !x.clipeUrl ? 'disabled' : ''}>${c.escolhida === x.id ? '✓ Escolhida' : 'Usar esta'}</button>
            </div>
          </article>`).join('')}</div>
        ${abertos.length ? `<p class="dica">Pedido em andamento: “${esc(abertos.at(-1).texto)}”. A IA está fazendo variantes novas desta cena.</p>`
          : `<details class="pedir"><summary>Nenhuma serve? Pedir variantes novas desta cena</summary>
            <textarea data-ajuste-cena placeholder="Ex.: mostrar o Tales de perto, surpreso, com a Paratí soltando fumaça atrás"></textarea>
            <div class="acoes"><button data-pedir-cena>Pedir 2 variantes novas</button></div></details>`}
      </section>`;
    }).join('')}
  </div>`;
}
function ligarVariantes(id) {
  const box = $('.variantes'); if (!box) return;
  $$('.opcao-midia', box).forEach((m) => {
    const abrir = () => {
      if (!m.dataset.clipe) return;
      $$('.opcao-midia video').forEach((x) => { const pai = x.parentElement; x.remove(); pai.classList.remove('tocando'); });
      const vid = document.createElement('video'); vid.src = m.dataset.clipe; vid.controls = true; vid.autoplay = true; vid.playsInline = true;
      m.classList.add('tocando'); m.append(vid);
    };
    m.onclick = (e) => { if (e.target.tagName !== 'VIDEO') abrir(); };
  });
  $$('[data-escolher]', box).forEach((b) => { b.onclick = async () => {
    try { await api(`/api/videos/${id}/escolher`, { cena: b.closest('[data-cena]').dataset.cena, variante: b.dataset.escolher }); } catch (e) { aviso(e.message); }
    assinatura = ''; rodarCiclo();
  }; });
  $$('[data-var-acao="recomendadas"]', box).forEach((b) => { b.onclick = async () => {
    try { await api(`/api/videos/${id}/recomendadas`, {}); aviso('Recomendadas escolhidas', true); } catch (e) { aviso(e.message); }
    assinatura = ''; rodarCiclo();
  }; });
  $$('[data-pedir-cena]', box).forEach((b) => { b.onclick = async () => {
    const sec = b.closest('[data-cena]');
    try { b.disabled = true; await api(`/api/videos/${id}/ajuste-cena`, { cena: sec.dataset.cena, texto: $('[data-ajuste-cena]', sec).value }); aviso('Pedido enviado para a IA', true); } catch (e) { aviso(e.message); b.disabled = false; }
    assinatura = ''; rodarCiclo();
  }; });
}


// ---------- trilha sonora (etapa do vídeo final) ----------
const NIVEL_PADRAO = { musica: -14, efeitos: -6 }; // dB em relação à voz (igual ao pipeline/trilha.py)
const dbParaPct = (db) => (db <= -60 ? 0 : Math.round(Math.min(100, 10 ** (db / 20) * 100) / 5) * 5);
const pctParaDb = (p) => (p <= 0 ? -60 : +(20 * Math.log10(p / 100)).toFixed(1));
const textoVolume = (p) => (p <= 0 ? 'mudo' : `${p} % da voz`);
const CLIMAS = [['leve', 'Leve'], ['marcha', 'Marcha'], ['misterio', 'Mistério'], ['nenhuma', 'Sem música']];
const TIPOS_EFEITO = ['whoosh', 'impacto', 'batida', 'estalo', 'quebra', 'pop', 'ting', 'moeda', 'passos', 'uou', 'aplausos', 'passaros', 'grilos', 'vento', 'agua', 'splash', 'sting', 'motor', 'freio', 'buzina'];
function blocoTrilha(v) {
  const a = v.arquivos;
  const cfg = a.trilha || { musica: { clima: 'leve' } };
  const m = cfg.musica || {};
  const rel = a.trilhaRelatorio;
  const qa = a.qa;
  const rodando = v.job?.rodando;
  const manuais = cfg.efeitos || [];
  const autos = (rel?.efeitos || []).filter((e) => e.auto);
  const legenda = v.legenda ?? true;
  return `<div class="bloco trilha-editor">
    <div class="audio-topo"><div class="bloco-titulo" style="margin:0">Trilha sonora</div>
      ${!rodando ? '<button class="maquina" data-trilha="refazer">Salvar e refazer a trilha</button>' : ''}</div>
    <p class="dica" style="margin:6px 0 14px">A voz nunca é alterada: você regula a música e os efeitos em relação a ela. Refazer a trilha leva cerca de 15 s e não renderiza o vídeo de novo.</p>
    <div class="volumes">
      ${[['musica', 'Música', cfg.nivelMusica ?? NIVEL_PADRAO.musica], ['efeitos', 'Efeitos', cfg.nivelEfeitos ?? NIVEL_PADRAO.efeitos]].map(([k, n, db]) => `<label class="volume">
        <span>${n}</span><input type="range" min="0" max="100" step="5" value="${dbParaPct(db)}" data-volume="${k}" ${rodando ? 'disabled' : ''} aria-label="Volume: ${n}">
        <output data-volume-txt="${k}">${textoVolume(dbParaPct(db))}</output></label>`).join('')}
    </div>
    <div class="frase-controles" style="margin:0">
      <div class="segmentado" role="radiogroup" aria-label="Clima da música">${CLIMAS.map(([k, n]) => `<button class="${(m.clima || 'leve') === k ? 'on' : ''}" data-clima="${k}" ${rodando ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      <label class="pausa">ritmo <input type="number" min="60" max="160" step="2" value="${m.bpm || 104}" data-trilha-campo="bpm" style="width:76px;padding:6px 8px"> bpm</label>
      <label class="pausa">para na virada em <input type="number" min="0" step="0.1" value="${m.paraEm ?? ''}" placeholder="—" data-trilha-campo="paraEm" style="width:84px;padding:6px 8px"> s</label>
    </div>
    <h3 class="cat-kit">Efeitos <small>${autos.length} automáticos + ${manuais.length} seus</small></h3>
    <p class="dica" style="margin:0 0 8px">Os automáticos saem das cenas: flash vira whoosh, tremor vira impacto, objeto que aparece vira pop, dinheiro vira moedinha. Acrescente os seus no tempo exato (0 a 3 quadros antes da palavra).</p>
    <div class="efeitos">
      ${autos.map((e) => `<span class="efeito auto"><code>${Number(e.t).toFixed(2)}s</code> ${esc(e.tipo)}</span>`).join('')}
      ${manuais.map((e, i) => `<span class="efeito"><code>${Number(e.t).toFixed(2)}s</code> ${esc(e.tipo)} <button data-tirar="${i}" aria-label="Tirar">✕</button></span>`).join('')}
    </div>
    ${!rodando ? `<div class="acoes" style="margin-top:10px"><select data-novo-tipo style="width:auto">${TIPOS_EFEITO.map((t) => `<option>${t}</option>`).join('')}</select>
      <input type="number" step="0.05" min="0" placeholder="tempo (s)" data-novo-t style="width:120px">
      <button data-trilha="adicionar">Adicionar efeito</button></div>` : ''}
    ${rel ? `<div class="uso"><span>música <b>${rel.musicaVsVoz_dB ?? '—'} dB</b> da voz</span><span>efeitos <b>${rel.efeitosVsVoz_dB ?? '—'} dB</b></span><span>final <b>${qa?.lufs ?? '—'} LUFS</b>, pico ${qa?.pico_dBFS ?? '—'} dBFS</span></div>` : ''}
    ${qa ? `<p class="dica">${qa.problemas?.length ? `⚠️ ${esc(qa.problemas.join('; '))}` : '✓ Checagem: nada congelado, nenhuma tela preta, volume no alvo.'}</p>` : ''}
    ${a.qaFolha ? `<details style="margin-top:8px"><summary>Folha de quadros (um a cada 2 s)</summary><img src="${a.qaFolha}" alt="" style="width:100%;border-radius:8px;margin-top:8px" data-zoom></details>` : ''}
    <label style="display:flex;gap:8px;align-items:center;color:var(--tinta);margin-top:16px"><input type="checkbox" data-legenda style="width:auto" ${legenda ? 'checked' : ''} ${rodando ? 'disabled' : ''}> Legenda palavra a palavra <span class="dica" style="margin:0">(mudar exige renderizar de novo)</span></label>
  </div>`;
}
function ligarTrilha(id) {
  const box = $('.trilha-editor'); if (!box) return;
  let clima = $('[data-clima].on', box)?.dataset.clima || 'leve';
  $$('[data-clima]', box).forEach((b) => { b.onclick = () => { clima = b.dataset.clima; $$('[data-clima]', box).forEach((x) => x.classList.toggle('on', x === b)); }; });
  const coletar = async () => {
    const v = await api(`/api/videos/${id}`);
    const efeitos = (v.arquivos.trilha?.efeitos || []);
    return { nivelMusica: pctParaDb(Number($('[data-volume="musica"]', box).value)), nivelEfeitos: pctParaDb(Number($('[data-volume="efeitos"]', box).value)), musica: { clima, bpm: Number($('[data-trilha-campo="bpm"]', box).value) || 104, paraEm: $('[data-trilha-campo="paraEm"]', box).value === '' ? '' : Number($('[data-trilha-campo="paraEm"]', box).value) }, efeitos };
  };
  $$('[data-volume]', box).forEach((r) => { r.oninput = () => { $(`[data-volume-txt="${r.dataset.volume}"]`, box).textContent = textoVolume(Number(r.value)); }; });
  $$('[data-tirar]', box).forEach((b) => { b.onclick = async () => {
    const c = await coletar(); c.efeitos.splice(Number(b.dataset.tirar), 1);
    try { await api(`/api/videos/${id}/trilha-salvar`, c); } catch (e) { aviso(e.message); } assinatura = ''; rodarCiclo();
  }; });
  const add = $('[data-trilha="adicionar"]', box);
  if (add) add.onclick = async () => {
    const t = Number($('[data-novo-t]', box).value);
    if (!Number.isFinite(t) || $('[data-novo-t]', box).value === '') { aviso('Diga em que segundo o efeito entra.'); return; }
    const c = await coletar(); c.efeitos.push({ t, tipo: $('[data-novo-tipo]', box).value });
    try { await api(`/api/videos/${id}/trilha-salvar`, c); aviso('Efeito adicionado: refaça a trilha para ouvir', true); } catch (e) { aviso(e.message); } assinatura = ''; rodarCiclo();
  };
  const refazer = $('[data-trilha="refazer"]', box);
  if (refazer) refazer.onclick = async () => {
    try { refazer.disabled = true; await api(`/api/videos/${id}/trilha-salvar`, await coletar()); await api(`/api/videos/${id}/trilha`, {}); aviso('Refazendo a trilha', true); } catch (e) { aviso(e.message); refazer.disabled = false; }
    assinatura = ''; rodarCiclo();
  };
  const leg = $('[data-legenda]', box);
  if (leg) leg.onchange = async () => { try { await api(`/api/videos/${id}/legenda`, { ativa: leg.checked }); aviso(leg.checked ? 'Legenda ligada: renderize de novo para aplicar' : 'Legenda desligada: renderize de novo para aplicar', true); } catch (e) { aviso(e.message); } };
}

// ---------- tela: um vídeo ----------
function claquete(v, bater) {
  const take = (v.historico || []).filter((h) => /narração pronta|vídeo final pronto|IA:/.test(h.evento)).length || 1;
  const etapa = ETAPAS.find(([e]) => e === v.etapa)?.[1] || v.etapa;
  return `<div class="claquete ${bater ? 'bate' : ''}"><div class="claquete-bastao" aria-hidden="true"></div>
    <div class="claquete-corpo"><h1>${esc(v.titulo)}</h1><div>${selo(v)}</div>
      <div class="campos">
        <div class="campo"><small>Etapa</small><span>${esc(etapa)}</span></div>
        <div class="campo"><small>Take</small><span>${String(take).padStart(2, '0')}</span></div>
        <div class="campo"><small>Duração</small><span>${v.arquivos?.vozInfo?.duracao ? relogio(v.arquivos.vozInfo.duracao) : `~${relogio(v.duracaoAlvo)}`}</span></div>
        <div class="campo"><small>Estilo</small><span>${esc(v.estilo)}</span></div>
      </div></div></div>`;
}
function filme(v) {
  const idx = ETAPAS.findIndex(([e]) => e === v.etapa);
  const p = v.previsoes || {};
  let falta = 0;
  const quadros = ETAPAS.map(([e, nome], i) => {
    const feito = v.estado === 'agendado' || i < idx;
    let info;
    if (feito) info = 'aprovado ✓';
    else if (i === idx) info = v.job?.rodando ? `faltam ~${relogio(v.job.restante)}` : vezDoCriador(v) ? 'sua vez' : v.estado === 'aguardando_ia' ? 'na fila da IA' : 'agora';
    else if (p[e]) { falta += p[e]; info = `≈ ${duracao(p[e])} de máquina`; } else info = 'você escolhe a data';
    return `<div class="quadro ${feito ? 'feito' : i === idx ? `agora ${maquinaTrabalhando(v) ? 'maquina' : ''}` : ''}"><b>${nome}</b><small>${info}</small></div>`;
  }).join('');
  const atual = v.job?.rodando ? v.job.restante : 0;
  const total = falta + atual;
  return `<div class="filme" role="list" aria-label="Etapas do vídeo">${quadros}</div>
    ${total > 0 && v.etapa !== 'agenda' ? `<p class="previsao-total">Até o vídeo pronto: ~${duracao(total)} de máquina, sem contar suas aprovações.</p>` : ''}`;
}
function blocoTarefa(v) {
  const j = v.job;
  if (v.orfao) return `<div class="bloco erro"><h2>Tarefa interrompida</h2><p>O painel foi reiniciado no meio da tarefa. Mande fazer de novo.</p>
    <div class="acoes"><button class="maquina" data-acao="${v.estado === 'ia_trabalhando' ? 'ia' : v.etapa === 'final' ? 'render' : 'narrar'}">Fazer de novo</button></div></div>`;
  if (!j) return '';
  if (j.rodando) {
    return `<div class="bloco maquina"><h2>${esc(NOME_TAREFA[j.tipo] || j.tipo)}</h2>${barra(j, true)}
      ${j.tipo === 'ia' ? `<ol class="atividade" data-atividade>${(j.atividade || []).slice(-6).map((a) => `<li><time>${a.em.slice(14, 19)}</time>${esc(a.texto)}</li>`).join('')}</ol>` : ''}
      <p class="dica">Previsão baseada nas últimas vezes que esta etapa rodou na sua máquina.</p></div>`;
  }
  if (j.ok === false) return `<div class="bloco erro"><h2>${esc(NOME_TAREFA[j.tipo] || j.tipo)}: falhou</h2><div class="log">${esc(j.log || '')}</div></div>`;
  return '';
}
// ---------- assets que o vídeo precisa ----------
const SITUACAO_ASSET = { existe: ['pronto', 'Já tem'], pronto: ['pronto', 'Criado'], criando: ['maquina', 'Criando'], escolher: ['vez', 'Escolha na Biblioteca'],
  improvisar: ['', 'Seguir sem'], falta: ['vez', 'Falta'], erro: ['erro', 'Erro'] };
function blocoAssets(v) {
  const a = v.arquivos.assets;
  if (!a?.itens?.length || !['roteiro', 'narracao', 'cenas'].includes(v.etapa)) return '';
  const pendentes = a.itens.filter((i) => ['falta', 'erro'].includes(i.situacao)).length;
  return `<div class="bloco ${pendentes ? 'vez' : ''}" data-assets>
    <div class="audio-topo"><div class="bloco-titulo" style="margin:0">Assets do vídeo</div>
      ${pendentes ? `<div class="acoes" style="margin:0"><button class="maquina" data-asset="*" data-asset-acao="auto">IA cria todos na hora</button><button data-asset="*" data-asset-acao="criar">Criar todos com 3 opções</button></div>` : ''}</div>
    <p class="dica" style="margin:6px 0 12px">O que o roteiro mostra e se já existe na biblioteca. <b>Na hora</b>: a IA cria e já publica a opção recomendada. <b>3 opções</b>: você escolhe na Biblioteca. <b>Seguir sem</b>: a IA representa com o que já existe.</p>
    <ul class="ajustes">${a.itens.map((i) => { const [cls, nome] = SITUACAO_ASSET[i.situacao] || ['', i.situacao];
      return `<li><small>${esc(i.tipo)}${i.momento ? ` · ${esc(i.momento)}` : ''}${i.slugFinal ? ` · <code>${esc(i.slugFinal)}</code>` : ''}</small>
        <div class="audio-topo" style="gap:10px"><div><b>${esc(i.nome)}</b> <span class="selo ${cls}">${i.job?.rodando ? '<i class="pulso"></i>' : ''}${esc(nome)}</span>
          <p style="margin:4px 0 0">${esc(i.situacao === 'existe' && i.usa ? `usa ${i.usa}` : i.descricao || '')}${i.erro ? ` (${esc(i.erro)})` : ''}</p></div>
        <div class="acoes" style="margin:0">${['falta', 'erro'].includes(i.situacao) ? `<button class="maquina" data-asset="${esc(i.id)}" data-asset-acao="auto">Na hora</button>
            <button data-asset="${esc(i.id)}" data-asset-acao="criar">3 opções</button><button data-asset="${esc(i.id)}" data-asset-acao="improvisar">Seguir sem</button>`
          : i.situacao === 'improvisar' ? `<button data-asset="${esc(i.id)}" data-asset-acao="desfazer">Desfazer</button>`
          : i.situacao === 'escolher' ? '<button class="vez" onclick="location.hash=\'#/biblioteca\'">Escolher</button>' : ''}</div></div></li>`; }).join('')}</ul></div>`;
}
function ligarAssets(id) {
  $$('[data-asset]').forEach((b) => { b.onclick = async () => {
    try { b.disabled = true; await api(`/api/videos/${id}/assets`, { id: b.dataset.asset, acao: b.dataset.assetAcao });
      aviso({ auto: 'A IA está criando o asset', criar: 'Pedido enviado: escolha a opção na Biblioteca', improvisar: 'Segue sem esse asset', desfazer: 'Desfeito' }[b.dataset.assetAcao] || 'Feito', true);
    } catch (e) { aviso(e.message); b.disabled = false; }
    assinatura = ''; rodarCiclo();
  }; });
}
function blocoEtapa(v) {
  const a = v.arquivos;
  const rodando = v.job?.rodando;
  const esperando = v.estado === 'aguardando_aprovacao' && !rodando;
  const nomeEtapa = ETAPAS.find(([e]) => e === v.etapa)?.[1] || '';
  let html = '';
  if (v.estado === 'aguardando_ia' && !rodando) {
    html += `<div class="bloco maquina"><h2>Vez da IA</h2><p>A IA ainda não pegou esta etapa (previsão: ~${duracao(v.etapa === 'cenas' ? v.previsoes.cenas : v.previsoes.roteiro)}).</p>
      <div class="acoes"><button class="maquina" data-acao="ia">Pedir para a IA fazer agora</button></div>
      <p class="dica">Ou, no Claude Code: <code>/video ${esc(v.id)}</code></p></div>`;
  }
  html += blocoAssets(v);
  if (v.etapa === 'roteiro') {
    html += `<div class="bloco"><h2>Sinopse</h2><div class="md">${md(a.sinopse)}</div></div>
      <div class="bloco"><h2>Narração</h2><p class="texto">${esc((a.narracao || '—').replace(/\[(laughter|sigh)\]\s*/g, ''))}</p></div>${marcacaoTabela(a.marcacao)}`;
  } else if (v.etapa === 'narracao' && v.fluxo === 2) {
    html += blocoQuemNarra(v);
    if (v.voz?.modo !== 'gravacao') html += blocoAudio(v);
  } else if (v.etapa === 'narracao') {
    html += `<div class="bloco"><h2>Narração</h2>${a.audio ? `<audio controls src="${a.audio}"></audio>` : '<p class="vazio">Ainda sendo gerada.</p>'}
      ${a.vozInfo ? `<div class="uso"><span><b>${relogio(a.vozInfo.duracao)}</b> de áudio</span><span><b>${a.vozInfo.frases}</b> frases</span><span>legenda sincronizada em <b>${Math.round(a.vozInfo.coberturaTempos * 100)}%</b> das palavras</span></div>
      <p class="dica">O Whisper ouviu: “${esc(a.vozInfo.ouvidoPeloWhisper || '')}”</p>` : ''}
      <p class="texto" style="margin-top:14px">${esc(a.narracao || '')}</p>
      ${!rodando ? `<div class="acoes"><label for="vel" style="margin:0">Velocidade</label>
        <select id="vel" style="width:auto">${[0.78, 0.82, 0.86, 0.9, 1].map((x) => `<option ${x === v.voz?.velocidade ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <button data-acao="regerarVoz">Gerar a voz de novo</button><span class="dica" style="margin:0">~${duracao(v.previsoes.narracao)}</span></div>` : ''}</div>`;
  } else if (v.etapa === 'cenas' && v.fluxo === 2) {
    html += blocoVariantes(v);
  } else if (v.etapa === 'cenas') {
    html += `<div class="bloco"><h2>Quadros das cenas</h2>
      ${a.quadros.length ? `<div class="quadros">${a.quadros.map((q) => `<img src="${q}" alt="" data-zoom loading="lazy">`).join('')}</div>` : '<p class="vazio">Os quadros aparecem aqui quando a IA terminar as cenas.</p>'}
      ${a.previa ? `<h2 style="margin-top:20px">Prévia</h2><video controls src="${a.previa}"></video>` : ''}
      ${!rodando && a.quadros.length ? `<div class="acoes"><button data-acao="quadros">Gerar quadros de novo</button><button data-acao="previa">Gerar prévia rápida</button></div>` : ''}
      ${a.plano ? `<details style="margin-top:16px"><summary>Plano de animação</summary><div class="md" style="font-size:13.5px;margin-top:8px">${md(a.plano)}</div></details>` : ''}</div>`;
  } else if (v.etapa === 'final' || v.etapa === 'agenda') {
    html += `<div class="bloco"><h2>Vídeo final</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
        <div>${a.video ? `<video controls src="${a.video}" preload="metadata"></video>` : '<p class="vazio">Ainda sendo renderizado.</p>'}</div>
        <div>${a.capa ? `<div class="bloco-titulo">Capa</div><img class="capa" src="${a.capa}" alt="Capa do vídeo">` : ''}</div></div>
      ${a.postagem ? `<details style="margin-top:16px"><summary>Texto da postagem</summary><div class="md" style="font-size:14px;margin-top:8px">${md(a.postagem)}</div></details>` : ''}
      ${v.etapa === 'final' && !rodando && !esperando ? `<div class="acoes"><button data-acao="render">Renderizar de novo</button></div>` : ''}</div>`;
    if (a.video) html += blocoTrilha(v);
    if (v.etapa === 'agenda') {
      const ag = v.agenda;
      html += `<div class="bloco ${ag ? '' : 'vez'}"><h2>Agenda</h2>
        ${ag ? `<p>Agendado para <b>${esc(new Date(ag.quando).toLocaleString('pt-BR'))}</b> em ${esc(ag.plataformas.join(', '))}.</p>` : ''}
        <label for="quando">Data e hora</label><input id="quando" type="datetime-local" value="${ag?.quando || ''}">
        <label>Plataformas</label>
        <div>${['youtube', 'instagram', 'tiktok'].map((p) => `<label style="display:inline-flex;gap:8px;margin:0 18px 0 0;color:var(--tinta)"><input type="checkbox" value="${p}" class="plat" style="width:auto" ${!ag || ag.plataformas.includes(p) ? 'checked' : ''}> ${p}</label>`).join('')}</div>
        <div class="acoes"><button class="vez" data-acao="agendar">${ag ? 'Reagendar' : 'Agendar'}</button></div>
        <p class="dica">A fila guarda os horários. O envio automático para as plataformas ainda precisa das contas conectadas.</p></div>`;
    }
  }
  const montagemVelha = (v.etapa === 'narracao' && v.fluxo === 2 && !a.audioFrases?.montagem?.atual)
    || (v.etapa === 'cenas' && v.fluxo === 2 && (a.variantes?.cenas || []).some((c) => !c.escolhida));
  if (esperando) {
    html += `<div class="bloco vez"><h2>Sua decisão</h2>
      <div class="acoes" style="margin-top:0"><button class="aprovar" data-acao="aprovar" ${montagemVelha ? `disabled title="${v.etapa === 'cenas' ? 'Escolha uma variante em todas as cenas' : 'Monte o áudio antes de aprovar'}"` : ''}>Aprovar ${esc(nomeEtapa.toLowerCase())}</button>
      <span class="dica" style="margin:0">${{ roteiro: `Depois: a voz é gerada (~${duracao(v.previsoes.narracao)}).`, narracao: `Depois: a IA monta as cenas (~${duracao(v.previsoes.cenas)}).`, cenas: `Depois: o vídeo é renderizado (~${duracao(v.previsoes.final)}).`, final: 'Depois: você escolhe quando postar.' }[v.etapa] || ''}</span></div>
      <label for="ajuste">Ou peça um ajuste</label><textarea id="ajuste" placeholder="O que mudar? A IA refaz esta etapa e devolve para você."></textarea>
      <div class="acoes"><button data-acao="ajuste">Pedir ajuste</button></div></div>`;
  }
  return html;
}
function lateral(v) {
  const ajustes = Object.entries(v.portoes).flatMap(([e, p]) => (p.ajustes || []).map((a) => ({ ...a, etapa: e }))).reverse();
  const uso = v.usoIA || [];
  const custo = uso.reduce((s, u) => s + (u.custoUSD || 0), 0);
  return `<div class="bloco"><h2>Pedido</h2><p style="margin:0">${esc(v.ideia)}</p>
      <p class="dica">Voz ${esc(v.voz?.perfil)} · velocidade ${v.voz?.velocidade}</p></div>
    ${ajustes.length ? `<div class="bloco"><h2>Ajustes pedidos</h2><ul class="ajustes">${ajustes.map((a) => `<li class="${a.resolvido ? '' : 'aberto'}"><small>${esc(a.etapa)} · ${a.resolvido ? 'feito' : 'em aberto'}</small>${esc(a.texto)}</li>`).join('')}</ul></div>` : ''}
    ${uso.length ? `<div class="bloco"><h2>Uso da IA</h2><div class="uso" style="margin:0"><span><b>${uso.length}</b> ${uso.length === 1 ? 'rodada' : 'rodadas'}</span><span><b>${duracao(uso.reduce((s, u) => s + (u.segundos || 0), 0))}</b> trabalhando</span><span>equivale a <b>US$ ${custo.toFixed(2)}</b> do plano</span></div>
      <p class="dica">Na assinatura não há cobrança por vídeo: esse valor só mostra quanto do limite do plano foi usado.</p></div>` : ''}`;
}
async function telaVideo(id) {
  if (!VOZES) await carregarVozes();
  const v = await api(`/api/videos/${id}`);
  const sig = JSON.stringify([v.etapa, v.estado, v.job?.rodando, v.job?.ok, v.job?.tipo, v.orfao, v.arquivos.audio, v.arquivos.video, v.arquivos.capa, v.arquivos.quadros.length, v.arquivos.previa, v.arquivos.sinopse, v.agenda, (v.usoIA || []).length,
    Object.values(v.portoes).map((p) => (p.ajustes || []).length),
    (v.arquivos.audioFrases?.frases || []).map((f) => [f.id, f.texto, f.energia, f.efeito, f.velocidade, f.pausa, f.escolhido, f.takes.length, f.precisaGravar]), v.arquivos.audioFrases?.montagem?.atual,
    (v.arquivos.variantes?.cenas || []).map((c) => [c.id, c.escolhida, c.variantes.map((x) => x.hash || x.id).join(), (c.ajustes || []).length]),
    JSON.stringify(v.arquivos.trilha), v.arquivos.trilhaRelatorio?.lufsAntes, v.arquivos.qa?.lufs, v.legenda, v.voz?.modo, v.voz?.catalogo, v.arquivos.vozInfo?.geradoEm,
    (v.arquivos.assets?.itens || []).map((i) => [i.id, i.situacao, i.job?.rodando])]);
  if (sig === assinatura && $('.claquete')) {
    atualizarBarra($('.bloco.maquina [data-job]'), v.job);
    const lista = $('[data-atividade]');
    if (lista && v.job?.atividade) {
      const html = v.job.atividade.slice(-6).map((a) => `<li><time>${a.em.slice(14, 19)}</time>${esc(a.texto)}</li>`).join('');
      if (lista.dataset.ultimo !== html) { lista.innerHTML = html; lista.dataset.ultimo = html; }
    }
    const quadroAgora = $('.quadro.agora small');
    if (quadroAgora && v.job?.rodando) quadroAgora.textContent = `faltam ~${relogio(v.job.restante)}`;
  } else {
    const etapaMudou = assinatura && JSON.parse(assinatura)[0] !== v.etapa;
    assinatura = sig;
    const pos = window.scrollY;
    app.innerHTML = `<div class="${etapaMudou ? '' : 'entra'}"><p style="margin:0 0 14px"><a href="#/" style="color:var(--tinta-2);font-weight:600;text-decoration:none">← Vídeos</a></p>
      ${claquete(v, etapaMudou || !$('.claquete'))}${filme(v)}
      <div class="dois"><div>${blocoTarefa(v)}${blocoEtapa(v)}</div><div>${lateral(v)}</div></div></div>`;
    window.scrollTo(0, pos);
    ligarAcoes(id);
    ligarAudio(id);
    ligarVariantes(id);
    ligarTrilha(id);
    ligarQuemNarra(id);
    ligarAssets(id);
    if (esperandoMontagem === id && !v.job?.rodando && v.arquivos.audioFrases?.montagem?.atual) { esperandoMontagem = null; tocar(v.arquivos.audio, $('.montagem')); }
  }
  recebidoEm = Date.now();
  return !!(v.job?.rodando || v.estado === 'ia_trabalhando' || v.estado === 'processando' || v.arquivos.assets?.itens?.some((i) => i.situacao === 'criando'));
}
function ligarAcoes(id) {
  $$('[data-zoom]').forEach((img) => { img.onclick = () => {
    const z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = `<img src="${img.src}" alt="">`; z.onclick = () => z.remove(); document.body.append(z);
  }; });
  $$('[data-acao]').forEach((b) => { b.onclick = async () => {
    const acao = b.dataset.acao;
    const msgs = { aprovar: 'Aprovado', ajuste: 'Ajuste enviado para a IA', regerarVoz: 'Gerando a voz de novo', agendar: 'Agendado', ia: 'A IA começou', quadros: 'Gerando os quadros', previa: 'Gerando a prévia', render: 'Renderizando', narrar: 'Gerando a narração' };
    try {
      b.disabled = true;
      if (acao === 'ajuste') await api(`/api/videos/${id}/ajuste`, { texto: $('#ajuste').value });
      else if (acao === 'regerarVoz') { await api(`/api/videos/${id}/voz`, { velocidade: Number($('#vel').value) }); await api(`/api/videos/${id}/narrar`, {}); }
      else if (acao === 'agendar') await api(`/api/videos/${id}/agendar`, { quando: $('#quando').value, plataformas: $$('.plat:checked').map((c) => c.value) });
      else await api(`/api/videos/${id}/${acao}`, {});
      aviso(msgs[acao] || 'Feito', true);
    } catch (e) { aviso(e.message); b.disabled = false; }
    assinatura = ''; rodarCiclo();
  }; });
}


// ---------- tela: biblioteca ----------
const CATEGORIAS_KIT = { personagens: 'Personagens prontos', casas: 'Casas', predios: 'Prédios e pontes', obra: 'Em construção (animáveis)', arvores: 'Árvores e plantas',
  ruas: 'Ruas e terreno', veiculos: 'Veículos', objetos: 'Objetos de rua e obra', formas: 'Formas livres', maquinas: 'Máquinas animadas' };
function blocoKit3d(b) {
  const grupos = {};
  for (const it of b.kit3d || []) (grupos[it.categoria] ||= []).push(it);
  return `<div class="kit3d-topo"><div class="secao" style="flex:1;margin-bottom:0"><span class="n">${(b.kit3d || []).length}</span> Kit 3D</div>
      <button class="maquina" data-visualizador>Abrir o visualizador 3D interativo</button>
      <button data-vitrine>Atualizar miniaturas</button></div>
    <p class="dica" style="margin:6px 0 14px">Tudo o que vem no kit 3D (incluindo as peças criadas no hub). No visualizador você gira os personagens, vê as 20 animações e monta cenários.</p>
    ${(b.kit3d || []).length ? Object.entries(grupos).map(([cat, l]) => `<h3 class="cat-kit">${esc(CATEGORIAS_KIT[cat] || cat)} <small>${l.length}</small></h3>
      <div class="grade-assets kit">${l.map((it) => `<div class="asset" title="${esc(it.descricao || '')}"><div class="asset-mini">${it.mini ? `<img src="${it.mini}" alt="" loading="lazy" data-zoom>` : ''}</div>
        <b>${esc(it.label.replace(/_/g, ' '))}</b><small><code>${esc(it.id)}</code>${it.tamanho ? ` · ${it.tamanho.x}×${it.tamanho.z} m` : ''}</small></div>`).join('')}</div>`).join('')
      : '<p class="vazio">Clique em "Atualizar miniaturas" para desenhar o kit (cerca de 1 min).</p>'}`;
}
const TIPOS_BIB = [['personagem', 'Personagem', '2D e 3D juntos, com as mesmas cores'], ['objeto', 'Objeto', '2D e 3D'], ['cenario', 'Cenário', '2D (no 3D o cenário é montado com peças)']];
const NOME_PEDIDO = { aguardando_ia: 'Na fila da IA', ia_trabalhando: 'A IA está criando', processando: 'Desenhando as opções', aguardando_escolha: 'Sua vez: escolher', concluido: 'Publicado', erro: 'Erro' };
function cartaoAsset(a, tipo) {
  const imgs = [a.mini2d && `<img src="${a.mini2d}" alt="" loading="lazy">`, a.mini3d && `<img src="${a.mini3d}" alt="" loading="lazy">`].filter(Boolean);
  return `<div class="asset ${tipo}"><div class="asset-mini n${imgs.length}">${imgs.join('') || '<div class="fotograma vazio"></div>'}</div>
    <b>${esc(a.nome || a.slug.replace(/_/g, ' '))}</b><small>${esc(a.papel || (a.nativo ? 'do estilo' : 'criado no hub'))}${a.mini3d ? ' · 2D + 3D' : ''}</small></div>`;
}
function blocoPedido(p) {
  const j = p.job;
  const vez = p.estado === 'aguardando_escolha';
  const opcoes = p.opcoesView || [];
  return `<div class="bloco pedido ${vez ? 'vez' : ['ia_trabalhando', 'processando', 'aguardando_ia'].includes(p.estado) ? 'maquina' : p.estado === 'erro' ? 'erro' : ''}" data-pedido="${p.id}">
    <div class="audio-topo"><div><div class="bloco-titulo" style="margin:0 0 4px">${esc(TIPOS_BIB.find(([k]) => k === p.tipo)?.[1] || p.tipo)} · ${esc(p.nome || p.slug)}</div>
      <p style="margin:0">${esc(p.descricao)}</p></div>
      <span class="selo ${vez ? 'vez' : p.estado === 'concluido' ? 'pronto' : p.estado === 'erro' ? 'erro' : 'maquina'}">${j?.rodando ? '<i class="pulso"></i>' : ''}${esc(NOME_PEDIDO[p.estado] || p.estado)}</span></div>
    ${p.referenciaUrl ? `<p class="dica">Referência: <a href="${p.referenciaUrl}" target="_blank">ver imagem</a></p>` : ''}
    ${p.extensaoRig ? `<p class="dica">O boneco 2D ganhou uma peça nova: ${esc(p.extensaoRig)}</p>` : ''}
    ${j?.rodando ? `${barra(j, true)}${j.tipo === 'ia' ? `<ol class="atividade">${(j.atividade || []).slice(-4).map((a) => `<li><time>${a.em.slice(14, 19)}</time>${esc(a.texto)}</li>`).join('')}</ol>` : ''}` : ''}
    ${p.estado === 'erro' ? `<p class="dica">${esc(p.erro || 'Algo deu errado.')}</p><div class="acoes"><button class="maquina" data-ped-ia>Tentar de novo</button></div>` : ''}
    ${opcoes.length ? `<div class="opcoes-bib">${opcoes.map((o) => `
      <article class="opcao-bib ${p.escolhida === o.n ? 'on' : ''}">
        <div class="asset-mini n${[o.mini2d, o.mini3d].filter(Boolean).length}">${o.mini2d ? `<img src="${o.mini2d}" alt="" data-zoom>` : '<div class="gerando">desenhando…</div>'}${o.mini3d ? `<img src="${o.mini3d}" alt="" data-zoom>` : ''}</div>
        <p>${esc(o.descricao)}</p>
        ${vez ? `<button class="aprovar" data-escolher-op="${o.n}">Usar a opção ${o.n}</button>` : p.escolhida === o.n ? '<span class="selo pronto">Escolhida</span>' : ''}
      </article>`).join('')}</div>` : ''}
    ${vez ? `<details class="pedir"><summary>Nenhuma serve? Pedir 3 opções novas</summary><textarea data-ped-ajuste placeholder="O que mudar?"></textarea>
      <div class="acoes"><button data-ped-ajustar>Pedir opções novas</button></div></details>` : ''}
  </div>`;
}
let bibAssinatura = '';
async function telaBiblioteca(forcar) {
  const b = await api('/api/biblioteca');
  const ativos = b.pedidos.filter((p) => p.estado !== 'concluido');
  const sig = JSON.stringify([b.personagens.length, b.objetos.length, b.cenarios.length, b.pedidos.map((p) => [p.id, p.estado, p.job?.rodando, p.opcoesView.map((o) => o.mini2d + o.mini3d).join()])]);
  if (!forcar && sig === bibAssinatura && $('.biblioteca')) {
    for (const p of b.pedidos) atualizarBarra($(`[data-pedido="${p.id}"] [data-job]`), p.job);
    return b.pedidos.some((p) => p.job?.rodando || ['aguardando_ia', 'ia_trabalhando', 'processando'].includes(p.estado));
  }
  bibAssinatura = sig;
  app.innerHTML = `<div class="entra biblioteca"><h1>Biblioteca</h1><p class="sub">Personagens, objetos e cenários que a IA pode usar nos vídeos. Peça um novo e escolha entre 3 opções.</p>
    <div class="bloco criar" style="max-width:760px">
      <div class="bloco-titulo">Criar novo</div>
      <div class="segmentado tipos" role="radiogroup">${TIPOS_BIB.map(([k, n], i) => `<button class="${i === 0 ? 'on' : ''}" data-tipo="${k}">${n}</button>`).join('')}</div>
      <p class="dica" id="tipo-dica">${TIPOS_BIB[0][2]}</p>
      <label for="b-nome">Nome</label><input id="b-nome" placeholder="Ex.: Dona Cida">
      <label for="b-desc">Descrição</label><textarea id="b-desc" placeholder="Ex.: vizinha de uns 65 anos, cabelo grisalho em coque, óculos, avental florido, sempre na janela"></textarea>
      <label for="b-ref">Imagem de referência <span style="font-weight:400">(opcional)</span></label><input id="b-ref" type="file" accept="image/png,image/jpeg,image/webp">
      <label style="display:flex;gap:8px;align-items:center;color:var(--tinta)"><input id="b-perm" type="checkbox" style="width:auto"> A imagem é de uma pessoa real que autorizou o uso</label>
      <div class="acoes"><button class="vez" id="b-criar">Pedir 3 opções à IA</button></div>
    </div>
    ${ativos.length ? `<div class="secao"><span class="n">${ativos.length}</span> Pedidos</div>${ativos.map(blocoPedido).join('')}` : ''}
    <div class="secao"><span class="n">${b.personagens.length}</span> Personagens</div><div class="grade-assets">${b.personagens.map((a) => cartaoAsset(a, 'personagem')).join('')}</div>
    <div class="secao"><span class="n">${b.objetos.length}</span> Objetos</div><div class="grade-assets">${b.objetos.map((a) => cartaoAsset(a, 'objeto')).join('')}</div>
    <div class="secao"><span class="n">${b.cenarios.length}</span> Cenários</div><div class="grade-assets">${b.cenarios.map((a) => cartaoAsset(a, 'cenario')).join('')}</div>
    ${blocoKit3d(b)}
    ${b.pedidos.length > ativos.length ? `<details style="margin-top:24px"><summary>Pedidos concluídos (${b.pedidos.length - ativos.length})</summary>${b.pedidos.filter((p) => p.estado === 'concluido').map(blocoPedido).join('')}</details>` : ''}
  </div>`;
  let tipo = 'personagem';
  $$('.tipos button').forEach((bt) => { bt.onclick = () => { tipo = bt.dataset.tipo; $$('.tipos button').forEach((x) => x.classList.toggle('on', x === bt)); $('#tipo-dica').textContent = TIPOS_BIB.find(([k]) => k === tipo)[2]; }; });
  $('#b-criar').onclick = async (e) => {
    const bt = e.target;
    try {
      bt.disabled = true;
      const arq = $('#b-ref').files[0];
      const referencia = arq ? await new Promise((ok, falha) => { if (arq.size > 8e6) falha(new Error('Imagem grande demais (máx. 8 MB).')); const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(arq); }) : null;
      await api('/api/biblioteca/pedidos', { tipo, nome: $('#b-nome').value, descricao: $('#b-desc').value, referencia, permissao: $('#b-perm').checked });
      aviso('Pedido enviado: a IA vai criar 3 opções', true);
      telaBiblioteca(true);
    } catch (er) { aviso(er.message); bt.disabled = false; }
  };
  $$('[data-pedido]').forEach((box) => {
    const id = box.dataset.pedido;
    $$('[data-escolher-op]', box).forEach((bt) => { bt.onclick = async () => { try { bt.disabled = true; await api(`/api/biblioteca/pedidos/${id}/escolher`, { n: bt.dataset.escolherOp }); aviso('Publicando na biblioteca', true); } catch (er) { aviso(er.message); } telaBiblioteca(true); }; });
    const aj = $('[data-ped-ajustar]', box); if (aj) aj.onclick = async () => { try { aj.disabled = true; await api(`/api/biblioteca/pedidos/${id}/ajuste`, { texto: $('[data-ped-ajuste]', box).value }); aviso('Pedido enviado para a IA', true); } catch (er) { aviso(er.message); aj.disabled = false; } telaBiblioteca(true); };
    const re = $('[data-ped-ia]', box); if (re) re.onclick = async () => { try { await api(`/api/biblioteca/pedidos/${id}/ia`, {}); } catch (er) { aviso(er.message); } telaBiblioteca(true); };
  });
  const vz = $('[data-visualizador]'); if (vz) vz.onclick = async () => { try { const r = await api('/api/visualizador', {}); window.open(r.url, '_blank'); } catch (er) { aviso(er.message); } };
  const vt = $('[data-vitrine]'); if (vt) vt.onclick = async () => { try { vt.disabled = true; await api('/api/biblioteca/kit3d', {}); aviso('Desenhando o kit 3D (cerca de 1 min)', true); setTimeout(() => telaBiblioteca(true), 70000); } catch (er) { aviso(er.message); vt.disabled = false; } };
  $$('[data-zoom]').forEach((img) => { img.onclick = () => { const z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = `<img src="${img.src}" alt="">`; z.onclick = () => z.remove(); document.body.append(z); }; });
  return b.pedidos.some((p) => p.job?.rodando || ['aguardando_ia', 'ia_trabalhando', 'processando'].includes(p.estado));
}

// ---------- tela: cardápio ----------
async function telaCardapio() {
  const es = await api('/api/estilos');
  app.innerHTML = `<div class="entra"><h1>Cardápio de estilos</h1><p class="sub">Dê notas: os estilos com 4 e 5 estrelas aparecem primeiro na hora de pedir um vídeo.</p>
    <div class="grade">${es.map((e) => `<div class="estilo">
      <h3>${esc(e.nome)}</h3>
      <div class="estrelas" data-slug="${e.slug}" role="group" aria-label="Nota de ${esc(e.nome)}">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= (e.nota || 0) ? 'on' : ''}" data-n="${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
      <p>${esc(e.descricao || '')}</p>
      <p style="margin-top:12px">${e.pronto ? '<span class="selo pronto">Pronto para usar</span>' : '<span class="selo">Em construção</span>'}
      ${e.exemplo ? ` · <a href="#/v/${e.exemplo.split('/').pop()}" style="font-weight:600">ver exemplo</a>` : ''}</p>
    </div>`).join('')}</div></div>`;
  $$('.estrelas button').forEach((b) => { b.onclick = async () => {
    await api(`/api/estilos/${b.parentElement.dataset.slug}/nota`, { nota: Number(b.dataset.n) }); telaCardapio();
  }; });
}

// ---------- tela: agenda ----------
async function telaAgenda() {
  const vs = (await api('/api/videos')).filter((v) => v.agenda).sort((a, b) => a.agenda.quando.localeCompare(b.agenda.quando));
  app.innerHTML = `<div class="entra"><h1>Agenda</h1><p class="sub">O que vai ao ar, e quando.</p>${vs.length ? `<div class="bloco"><table><tr><th>Quando</th><th>Vídeo</th><th>Onde</th><th>Situação</th></tr>
    ${vs.map((v) => `<tr><td class="tempo">${esc(new Date(v.agenda.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</td><td><a href="#/v/${v.id}">${esc(v.titulo)}</a></td>
      <td>${esc(v.agenda.plataformas.join(', '))}</td><td><span class="selo pronto">Na fila</span></td></tr>`).join('')}</table></div>`
    : '<p class="vazio">Nada agendado. Quando você aprovar um vídeo final, escolha a data aqui.</p>'}</div>`;
}

// ---------- ciclo de atualização ----------
function ocupado() { // não redesenha enquanto o criador digita
  return document.activeElement?.matches('textarea, input, select') || Object.keys(pendentes).length > 0 || [...document.querySelectorAll('.opcao-midia video')].some((x) => !x.paused);
}
async function rodarCiclo() {
  clearTimeout(ciclo);
  const h = location.hash.replace(/^#/, '') || '/';
  let ativo = false;
  try {
    if (h.startsWith('/v/')) { if (!ocupado()) ativo = await telaVideo(h.slice(3)); else ativo = true; fila(await api('/api/videos')); }
    else if (h === '/') ativo = await telaVideos();
    else if (h === '/novo') { ativo = (await atualizarIdeias()) | (await atualizarVozesNovo()); fila(await api('/api/videos')); }
    else if (h === '/biblioteca') { if (!ocupado()) ativo = await telaBiblioteca(); else ativo = true; fila(await api('/api/videos')); }
    else fila(await api('/api/videos'));
  } catch (e) { if (!$('.entra')) app.innerHTML = `<p class="vazio">Não consegui falar com o painel (${esc(e.message)}). Ele está rodando? Abra com <code>iniciar-hub.ps1</code>.</p>`; }
  ciclo = setTimeout(rodarCiclo, ativo || !$('#fila').hidden ? 1500 : 6000);
}
async function rotear() {
  clearTimeout(ciclo);
  assinatura = ''; bibAssinatura = ''; ideiasAssinatura = ''; vozesAssinatura = '';
  const h = location.hash.replace(/^#/, '') || '/';
  const rota = h.startsWith('/v/') ? 'videos' : h.slice(1) || 'videos';
  $$('nav a').forEach((a) => a.classList.toggle('ativo', a.dataset.rota === rota));
  if (rotaAtual !== h) window.scrollTo(0, 0);
  rotaAtual = h;
  try {
    if (h === '/novo') await telaNovo();
    else if (h === '/cardapio') await telaCardapio();
    else if (h === '/agenda') await telaAgenda();
    else if (h === '/biblioteca') { await telaBiblioteca(true); }
  } catch (e) { app.innerHTML = `<p class="vazio">Erro: ${esc(e.message)}</p>`; }
  rodarCiclo();
}
window.addEventListener('hashchange', rotear);
rotear();
