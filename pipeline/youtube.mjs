// YouTube Data API v3, sem biblioteca: login OAuth (uma vez) e envio agendado de um vídeo com capa.
// Credenciais (fora do git): config/youtube/client_secret.json (baixado do Google Cloud, cliente "App para computador")
//                            config/youtube/token.json (criado no login; guarda o refresh_token)
// Uso pela linha de comando (o painel chama assim):
//   node pipeline/youtube.mjs enviar <pasta> <quando ISO>    sobe privado com publishAt, põe a capa, grava postar/youtube.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(RAIZ, 'config', 'youtube');
const ARQ_CLIENTE = path.join(DIR, 'client_secret.json');
const ARQ_TOKEN = path.join(DIR, 'token.json');
// youtube.upload: enviar vídeo e trocar a capa; youtube.readonly: ler o nome do canal e o processamento
const ESCOPOS = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
const lerJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

function cliente() {
  const c = lerJSON(ARQ_CLIENTE);
  const d = c?.installed || c?.web;
  if (!d?.client_id) throw new Error('Falta config/youtube/client_secret.json (cliente OAuth "App para computador" do Google Cloud).');
  return d;
}
export function estado() {
  let configurado = false;
  try { cliente(); configurado = true; } catch { /* sem cliente */ }
  const t = lerJSON(ARQ_TOKEN);
  return { configurado, conectado: !!t?.refresh_token, canal: t?.canal || null };
}
export function urlLogin(redirect) {
  const c = cliente();
  const q = new URLSearchParams({ client_id: c.client_id, redirect_uri: redirect, response_type: 'code', scope: ESCOPOS.join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}
async function token(corpo) {
  const c = cliente();
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, ...corpo }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google recusou o login: ${j.error_description || j.error || r.status}`);
  return j;
}
export async function trocarCodigo(code, redirect) {
  const j = await token({ code, redirect_uri: redirect, grant_type: 'authorization_code' });
  if (!j.refresh_token) throw new Error('O Google não devolveu o refresh_token. Tente conectar de novo.');
  fs.mkdirSync(DIR, { recursive: true });
  const salvo = { refresh_token: j.refresh_token, access_token: j.access_token, expira: Date.now() + (j.expires_in - 60) * 1000 };
  fs.writeFileSync(ARQ_TOKEN, JSON.stringify(salvo, null, 2));
  const canal = await api('GET', 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true');
  salvo.canal = canal.items?.[0] ? { id: canal.items[0].id, nome: canal.items[0].snippet.title } : null;
  fs.writeFileSync(ARQ_TOKEN, JSON.stringify(salvo, null, 2));
  return salvo.canal;
}
async function acesso() {
  const t = lerJSON(ARQ_TOKEN);
  if (!t?.refresh_token) throw new Error('O YouTube não está conectado. Clique em "Conectar YouTube" no painel.');
  if (t.access_token && t.expira > Date.now()) return t.access_token;
  let j;
  try { j = await token({ refresh_token: t.refresh_token, grant_type: 'refresh_token' }); }
  catch (e) { throw new Error(`${e.message}. Conecte o YouTube de novo no painel (o acesso pode ter expirado).`); }
  fs.writeFileSync(ARQ_TOKEN, JSON.stringify({ ...t, access_token: j.access_token, expira: Date.now() + (j.expires_in - 60) * 1000 }, null, 2));
  return j.access_token;
}
async function api(metodo, url, corpo, tipo = 'application/json', extra = {}) {
  const r = await fetch(url, { method: metodo, headers: { Authorization: `Bearer ${await acesso()}`, ...(corpo ? { 'Content-Type': tipo } : {}), ...extra },
    body: corpo && tipo === 'application/json' ? JSON.stringify(corpo) : corpo });
  const texto = await r.text();
  const j = texto ? (() => { try { return JSON.parse(texto); } catch { return { texto }; } })() : {};
  if (!r.ok) throw new Error(`YouTube ${r.status}: ${j.error?.message || j.texto || 'erro'}`);
  return { ...j, _headers: r.headers };
}

// sobe o vídeo privado com publishAt (o YouTube publica sozinho na hora), depois a capa
export async function enviar(pastaRel, quando) {
  const pasta = path.resolve(RAIZ, pastaRel);
  const video = path.join(pasta, 'render', 'final.mp4');
  const capa = path.join(pasta, 'postar', 'capa.jpg');
  const textos = lerJSON(path.join(pasta, 'postar', 'textos.json'))?.youtube;
  if (!fs.existsSync(video)) throw new Error('Falta render/final.mp4: renderize o vídeo final antes.');
  if (!textos?.titulo) throw new Error('Falta o título do YouTube no pacote de postagem.');
  const publica = new Date(quando);
  if (!(publica > new Date(Date.now() + 15 * 60e3))) throw new Error('A data de publicação precisa estar pelo menos 15 minutos no futuro.');
  const tags = (textos.descricao.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1)).slice(0, 15);
  const meta = {
    snippet: { title: textos.titulo.slice(0, 100), description: textos.descricao.slice(0, 5000), tags, categoryId: '27', defaultLanguage: 'pt-BR', defaultAudioLanguage: 'pt-BR' },
    status: { privacyStatus: 'private', publishAt: publica.toISOString(), selfDeclaredMadeForKids: false, containsSyntheticMedia: false },
  };
  console.log(`Enviando para o YouTube, publicação em ${publica.toLocaleString('pt-BR')}...`);
  const ini = await api('POST', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', meta, 'application/json',
    { 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(fs.statSync(video).size) });
  const destino = ini._headers.get('location');
  if (!destino) throw new Error('O YouTube não devolveu o endereço de envio.');
  const enviado = await api('PUT', destino, fs.readFileSync(video), 'video/mp4');
  const id = enviado.id;
  console.log(`Vídeo enviado: https://youtube.com/shorts/${id}. Esperando o YouTube processar para pôr a capa...`);
  const resultado = { videoId: id, url: `https://youtube.com/shorts/${id}`, publishAt: meta.status.publishAt, enviadoEm: new Date().toISOString(), capa: false };
  fs.writeFileSync(path.join(pasta, 'postar', 'youtube.json'), JSON.stringify(resultado, null, 2));

  // capa: só depois do processamento (Shorts ignoram capa posta antes)
  if (fs.existsSync(capa)) {
    for (let i = 0; i < 60; i++) {
      await new Promise((ok) => setTimeout(ok, 10000));
      const st = await api('GET', `https://www.googleapis.com/youtube/v3/videos?part=processingDetails,status&id=${id}`);
      const p = st.items?.[0]?.processingDetails?.processingStatus;
      console.log(`Processamento: ${p || '...'}`);
      if (p === 'failed' || p === 'terminated') throw new Error(`O YouTube não conseguiu processar o vídeo (${p}).`);
      if (p === 'succeeded') break;
    }
    try {
      await api('POST', `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}`, fs.readFileSync(capa), 'image/jpeg');
      resultado.capa = true; console.log('Capa aplicada.');
    } catch (e) { resultado.erroCapa = e.message; console.log(`Não deu para pôr a capa (${e.message}). Ponha à mão no YouTube Studio; canal precisa estar verificado por telefone.`); }
  }
  const st = await api('GET', `https://www.googleapis.com/youtube/v3/videos?part=status&id=${id}`);
  resultado.status = st.items?.[0]?.status || null;
  fs.writeFileSync(path.join(pasta, 'postar', 'youtube.json'), JSON.stringify(resultado, null, 2));
  console.log(`Agendado no YouTube: ${resultado.url}`);
  return resultado;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, pasta, quando] = process.argv.slice(2);
  if (cmd !== 'enviar' || !pasta || !quando) { console.error('Uso: node pipeline/youtube.mjs enviar <pasta> <quando ISO>'); process.exit(1); }
  enviar(pasta, quando).then(() => process.exit(0), (e) => { console.error(`ERRO: ${e.message}`); process.exit(1); });
}
