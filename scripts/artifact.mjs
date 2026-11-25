// Gera dist/artifact.html a partir do build single-file (dist/index.html).
// O Artifact embrulha a página no seu próprio <html><head><body>, por isso
// tiramos esses invólucros e deixamos só o conteúdo (title, meta, style, script, markup).
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist/index.html', 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = src.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const headClean = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
const out = `<meta charset="UTF-8">\n${headClean.trim()}\n${body.trim()}\n`;
writeFileSync('dist/artifact.html', out);
console.log(`dist/artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
