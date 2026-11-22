// Liga ou desliga a legenda no storyboard antes do render (2D: legenda.ativo; 3D: legendas.ativo).
// Uso: node pipeline/legenda.mjs <pasta> sim|nao
import fs from 'node:fs';
import path from 'node:path';

const [pastaArg, valor] = process.argv.slice(2);
const pasta = path.resolve(pastaArg);
const ativa = valor !== 'nao';
for (const [arq, campo] of [['storyboard2d.json', 'legenda'], ['storyboard_cartoon.json', 'legenda'], ['storyboard.json', 'legendas']]) {
  const f = path.join(pasta, arq);
  if (!fs.existsSync(f)) continue;
  const sb = JSON.parse(fs.readFileSync(f, 'utf8'));
  sb[campo] = { ...(sb[campo] || {}), ativo: ativa };
  // 3D: o vídeo sai do kit sem áudio (o render do kit pode travar lendo áudio); o acabamento põe a trilha/narração
  if (arq === 'storyboard.json') delete sb.audio;
  fs.writeFileSync(f, JSON.stringify(sb, null, 1));
  console.log(`legenda ${ativa ? 'ligada' : 'desligada'} em ${arq}`);
}
