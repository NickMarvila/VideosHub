// Painel do VideosHub (sem framework). Rotas: #/ · #/novo · #/v/<id> · #/cardapio · #/agenda
// A tela só é redesenhada quando algo muda de verdade; entre uma mudança e outra, só as barras e os cronômetros andam.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const ETAPAS = [['roteiro', 'Roteiro'], ['narracao', 'Narração'], ['cenas', 'Cenas'], ['final', 'Vídeo final'], ['agenda', 'Agenda']];
const NOME_TAREFA = { variantes: 'Gerando os clipes das cenas', gravar: 'Gravando os takes', montar: 'Montando o áudio', narrar: 'Gerando a narração', quadros: 'Gerando os quadros', previa: 'Gerando a prévia', render: 'Renderizando o vídeo', ia: 'A IA está trabalhando' };
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

// ---------- tela: novo vídeo ----------
async function telaNovo() {
  const estilos = await api('/api/estilos');
  app.innerHTML = `<div class="entra"><h1>Novo vídeo</h1><p class="sub">Descreva a história. A IA escreve a sinopse e a narração, e você aprova cada etapa.</p>
    <div class="bloco" style="max-width:700px">
      <label for="ideia" style="margin-top:0">Ideia</label>
      <textarea id="ideia" placeholder="Ex.: o Tales ganha um vale-presente do mercado e gasta tudo em brinde de posto de gasolina"></textarea>
      <label for="titulo">Título interno <span style="font-weight:400">(opcional)</span></label><input id="titulo">
      <div style="display:grid;grid-template-columns:140px 1fr;gap:14px">
        <div><label for="duracao">Duração</label><select id="duracao">${[30, 45, 60, 90].map((d) => `<option value="${d}" ${d === 45 ? 'selected' : ''}>${d} s</option>`).join('')}</select></div>
        <div><label for="estilo">Estilo</label><select id="estilo">${estilos.map((e) => `<option value="${e.slug}" ${e.pronto ? '' : 'disabled'}>${esc(e.nome)}${e.pronto ? '' : ' (em construção)'}</option>`).join('')}</select></div>
      </div>
      <p class="dica" id="estimativa"></p>
      <div class="acoes"><button class="vez" id="criarIA">Criar e pedir o roteiro à IA</button><button id="criar">Só criar</button></div>
    </div></div>`;
  const prev = await api('/api/previsoes').catch(() => null);
  if (prev) $('#estimativa').textContent = `Tempo de máquina previsto do pedido ao vídeo pronto: ~${duracao(prev.roteiro + prev.narracao + prev.cenas + prev.final)}, sem contar o tempo das suas aprovações.`;
  const criar = async (comIA, botao) => {
    try {
      botao.disabled = true;
      const v = await api('/api/videos', { ideia: $('#ideia').value, titulo: $('#titulo').value, duracao: $('#duracao').value, estilo: $('#estilo').value });
      if (comIA) await api(`/api/videos/${v.id}/ia`, {});
      location.hash = `#/v/${v.id}`;
    } catch (e) { aviso(e.message); botao.disabled = false; }
  };
  $('#criarIA').onclick = (e) => criar(true, e.target);
  $('#criar').onclick = (e) => criar(false, e.target);
}


// ---------- editor de áudio frase por frase ----------
const ENERGIAS = [['calma', 'Calma'], ['normal', 'Normal'], ['animada', 'Animada']];
const EFEITOS = [['nenhum', 'Sem efeito'], ['risada', 'Risada no fim'], ['suspiro', 'Suspiro antes']];
const VELOCIDADES = [0.72, 0.76, 0.8, 0.82, 0.86, 0.9, 0.95, 1];
const tocador = new Audio();
function tocar(url, botao) {
  $$('.take.tocando, .montagem.tocando').forEach((b) => b.classList.remove('tocando'));
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
  if (v.etapa === 'roteiro') {
    html += `<div class="bloco"><h2>Sinopse</h2><div class="md">${md(a.sinopse)}</div></div>
      <div class="bloco"><h2>Narração</h2><p class="texto">${esc((a.narracao || '—').replace(/\[(laughter|sigh)\]\s*/g, ''))}</p></div>${marcacaoTabela(a.marcacao)}`;
  } else if (v.etapa === 'narracao' && v.fluxo === 2) {
    html += blocoAudio(v);
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
  const v = await api(`/api/videos/${id}`);
  const sig = JSON.stringify([v.etapa, v.estado, v.job?.rodando, v.job?.ok, v.job?.tipo, v.orfao, v.arquivos.audio, v.arquivos.video, v.arquivos.capa, v.arquivos.quadros.length, v.arquivos.previa, v.arquivos.sinopse, v.agenda, (v.usoIA || []).length,
    Object.values(v.portoes).map((p) => (p.ajustes || []).length),
    (v.arquivos.audioFrases?.frases || []).map((f) => [f.id, f.texto, f.energia, f.efeito, f.velocidade, f.pausa, f.escolhido, f.takes.length, f.precisaGravar]), v.arquivos.audioFrases?.montagem?.atual,
    (v.arquivos.variantes?.cenas || []).map((c) => [c.id, c.escolhida, c.variantes.map((x) => x.hash || x.id).join(), (c.ajustes || []).length])]);
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
    if (esperandoMontagem === id && !v.job?.rodando && v.arquivos.audioFrases?.montagem?.atual) { esperandoMontagem = null; tocar(v.arquivos.audio, $('.montagem')); }
  }
  recebidoEm = Date.now();
  return !!(v.job?.rodando || v.estado === 'ia_trabalhando' || v.estado === 'processando');
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
    else if (h === '/biblioteca') { if (!ocupado()) ativo = await telaBiblioteca(); else ativo = true; fila(await api('/api/videos')); }
    else fila(await api('/api/videos'));
  } catch (e) { if (!$('.entra')) app.innerHTML = `<p class="vazio">Não consegui falar com o painel (${esc(e.message)}). Ele está rodando? Abra com <code>iniciar-hub.ps1</code>.</p>`; }
  ciclo = setTimeout(rodarCiclo, ativo || !$('#fila').hidden ? 1500 : 6000);
}
async function rotear() {
  clearTimeout(ciclo);
  assinatura = ''; bibAssinatura = '';
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
