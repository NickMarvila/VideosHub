// Pacote de postagem: tudo pronto para agendar à mão no YouTube Studio, Meta Business Suite e TikTok Studio.
// Lê <pasta>/postagem.md e render/capa.png e escreve:
//   postar/capa.jpg      capa 1080×1920 com o texto grande por cima (sem IA: ffmpeg)
//   postar/textos.json   título/descrição/legenda de cada plataforma (o painel deixa editar; não sobrescreve edições)
// Uso: node pipeline/pacote.mjs <pasta> [--texto "TEXTO DA CAPA"] [--refazer-textos]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const pasta = path.resolve(args[0] || '');
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const saida = path.join(pasta, 'postar');
fs.mkdirSync(saida, { recursive: true });

// ---------- postagem.md → seções ----------
const md = fs.existsSync(path.join(pasta, 'postagem.md')) ? fs.readFileSync(path.join(pasta, 'postagem.md'), 'utf8').replace(/\r\n/g, '\n') : '';
const secoes = {};
let atual = null;
for (const l of md.split('\n')) {
  const h = l.match(/^##\s+(.+)/);
  if (h) { atual = h[1].toLowerCase(); secoes[atual] = []; continue; }
  if (atual) secoes[atual].push(l);
}
const sec = (ini) => (Object.entries(secoes).find(([k]) => k.startsWith(ini))?.[1] || []).join('\n').trim();
const titulos = sec('título').split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
const descricao = sec('descrição');
const hashtags = (sec('hashtags').match(/#[\p{L}\p{N}_]+/gu) || []);
const fontes = sec('fontes').split('\n').map((l) => l.replace(/^-\s*/, '').trim()).filter((l) => /^https?:/.test(l));
const comentario = sec('comentário');
const textoCapaMd = (sec('capa').match(/texto sugerido:\s*[“"]([^”"]+)[”"]/i) || [])[1];

// ---------- textos por plataforma (regras fixas, sem IA) ----------
const semFontes = descricao.split('\n').filter((l) => !/^fontes\b/i.test(l.trim())).join('\n').trim();
const pergunta = semFontes.split('\n').filter(Boolean).at(-1) || '';
const sem = (tags, tira) => tags.filter((t) => !tira.includes(t.toLowerCase()));
const corta = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const textos = {
  youtube: {
    titulo: corta(titulos[0] || '', 100),
    descricao: [semFontes, hashtags.join(' '), fontes.length ? `Fontes:\n${fontes.join('\n')}` : ''].filter(Boolean).join('\n\n'),
    comentarioFixado: comentario,
  },
  instagram: { // links não são clicáveis na legenda: sem fontes; no máximo 5 hashtags
    legenda: [semFontes, sem(hashtags, ['#shorts']).slice(0, 5).join(' ')].filter(Boolean).join('\n\n'),
    comentarioFixado: comentario,
  },
  tiktok: { // curto: título + pergunta + hashtags
    legenda: corta([titulos[0], pergunta, sem(hashtags, ['#shorts']).join(' ')].filter(Boolean).join('\n\n'), 2000),
    comentarioFixado: comentario,
  },
};
const arqTextos = path.join(saida, 'textos.json');
if (!fs.existsSync(arqTextos) || args.includes('--refazer-textos')) {
  fs.writeFileSync(arqTextos, JSON.stringify(textos, null, 2));
  console.log('Textos das 3 plataformas prontos.');
}

// ---------- capa: quadro do vídeo + texto grande (Arial Black, branco com contorno) ----------
const capaPng = path.join(pasta, 'render', 'capa.png');
const texto = (opt('texto') ?? textoCapaMd ?? '').toUpperCase().trim();
if (!fs.existsSync(capaPng)) { console.log('Sem render/capa.png ainda: a capa sai depois do render final.'); process.exit(0); }
// quebra em linhas de até ~12 letras (o quadro é estreito)
const linhas = [];
for (const p of texto.split(/\s+/).filter(Boolean)) {
  if (linhas.length && (linhas.at(-1) + ' ' + p).length <= 12) linhas[linhas.length - 1] += ' ' + p;
  else linhas.push(p);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'capa-'));
const tam = linhas.some((l) => l.length > 9) ? 130 : 160, passo = tam * 1.15, topo = 300;
const filtros = ['scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'];
linhas.forEach((l, i) => {
  const f = path.join(tmp, `l${i}.txt`); fs.writeFileSync(f, l);
  // caminhos relativos à pasta temporária: o drawtext do ffmpeg não lida bem com "C:" no Windows
  filtros.push(`drawtext=fontfile=ariblk.ttf:textfile=l${i}.txt:fontsize=${tam}:fontcolor=white:borderw=14:bordercolor=black@0.95:x=(w-text_w)/2:y=${Math.round(topo + i * passo)}:shadowx=0:shadowy=10:shadowcolor=black@0.5`);
});
const fonte = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'ariblk.ttf');
if (fs.existsSync(fonte)) fs.copyFileSync(fonte, path.join(tmp, 'ariblk.ttf'));
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', capaPng, '-vf', filtros.join(','), '-q:v', '2', path.join(saida, 'capa.jpg')], { cwd: tmp, encoding: 'utf8' });
fs.rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
fs.writeFileSync(path.join(saida, 'capa.json'), JSON.stringify({ texto }, null, 2));
console.log(`Capa pronta: postar/capa.jpg${texto ? ` com "${texto}"` : ' (sem texto)'}`);
