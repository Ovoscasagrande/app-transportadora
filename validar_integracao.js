#!/usr/bin/env node
/**
 * CASAGRANDE — auditoria de integração
 * Node.js puro, ZERO dependências.
 *
 * Uso:
 *   node validar_integracao.js NOVO.html
 *   node validar_integracao.js NOVO.html ANTES.html
 *
 * Rode ANTES e DEPOIS de qualquer alteração.
 * Saída: código 0 = aprovado · código 1 = tem bloqueio (não publicar)
 */
const fs = require('fs');

const novoPath = process.argv[2];
const antesPath = process.argv[3];
if (!novoPath) {
  console.error('uso: node validar_integracao.js NOVO.html [ANTES.html]');
  process.exit(2);
}

const ler = p => fs.readFileSync(p, 'utf8');
const novo = ler(novoPath);
const antes = antesPath && fs.existsSync(antesPath) ? ler(antesPath) : null;

let bloqueios = 0;
const ok = m => console.log('  \x1b[32mOK\x1b[0m  ' + m);
const warn = m => console.log('  \x1b[33m!\x1b[0m   ' + m);
const erro = m => { bloqueios++; console.log('  \x1b[31mX\x1b[0m   ' + m); };

function scriptsDe(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m; while ((m = re.exec(html))) out.push(m[1]);
  return out.join('\n;\n');
}
function idsDe(html) {
  const s = new Set(); const re = /\bid="([A-Za-z0-9_-]+)"/g;
  let m; while ((m = re.exec(html))) s.add(m[1]);
  return s;
}
const contar = (txt, re) => (txt.match(re) || []).length;

console.log('\n\x1b[1m=== 1. SINTAXE DO JAVASCRIPT ===\x1b[0m');
const js = scriptsDe(novo);
if (!js.trim()) erro('nenhum <script> embutido encontrado — o app é single-file, isso não deveria acontecer');
else {
  try { new Function(js); ok('JavaScript compila sem erro de sintaxe (' + (js.length / 1024).toFixed(0) + ' KB de JS)'); }
  catch (e) { erro('ERRO DE SINTAXE: ' + e.message); }
}

console.log('\n\x1b[1m=== 2. IDs ===\x1b[0m');
const idsNovo = idsDe(novo);
const conta = {};
{
  const re = /\bid="([A-Za-z0-9_-]+)"/g; let m;
  while ((m = re.exec(novo))) conta[m[1]] = (conta[m[1]] || 0) + 1;
}
const repetidos = Object.keys(conta).filter(k => conta[k] > 1);
const REPETIDOS_CONHECIDOS = new Set(['m-cancel','m-ok','j-msg','j-rot','j-carga','pc','pc-gps','pc-gpsbtn',
  'pc-gpsmsg','pc-fotos-sec','pc-fotos','pc-cam','pc-gal','pc-fcount','pc-fin-sec','pc-fin','pc-msg',
  'gj-just','gj-ok','nr-data','nr-msg','en-cancel','en-ok']);

if (antes) {
  const idsAntes = idsDe(antes);
  const faltando = [...idsAntes].filter(i => !idsNovo.has(i));
  const novosIds = [...idsNovo].filter(i => !idsAntes.has(i));
  if (faltando.length === 0) ok('nenhum ID removido (' + idsAntes.size + ' preservados)');
  else erro('IDs REMOVIDOS (' + faltando.length + '): ' + faltando.slice(0, 25).join(', '));
  if (novosIds.length) warn('IDs novos (confirme se é intencional): ' + novosIds.slice(0, 15).join(', '));
} else {
  console.log('    IDs no arquivo: ' + idsNovo.size + ' (esperado 390 no original)');
  warn('sem arquivo de referência — não foi possível comparar (passe o ANTES como 2o argumento)');
}
const inesperados = repetidos.filter(k => !REPETIDOS_CONHECIDOS.has(k));
if (inesperados.length) erro('IDs DUPLICADOS não previstos: ' + inesperados.join(', ') + '  (id duplicado quebra getElementById)');
else ok('nenhuma duplicidade fora das previstas (' + repetidos.length + ' modais reaproveitados, como esperado)');

console.log('\n\x1b[1m=== 3. POPUPS DO NAVEGADOR (proibidos) ===\x1b[0m');
const popups = contar(js, /\b(alert|confirm|prompt)\s*\(/g);
if (popups === 0) ok('zero alert() / confirm() / prompt()');
else erro(popups + ' ocorrência(s) de alert/confirm/prompt — proibido. Use o modal #modal-wrap.');

console.log('\n\x1b[1m=== 4. TABELAS (<table>) ===\x1b[0m');
const tNovo = contar(novo, /<table/gi);
const tAntes = antes ? contar(antes, /<table/gi) : null;
if (tAntes !== null) {
  ok('tabelas: ' + tAntes + ' -> ' + tNovo + (tNovo === 0 ? ' (migração completa)' : ' (' + tNovo + ' ainda por migrar)'));
  if (tNovo > tAntes) erro('o número de <table> AUMENTOU — algo foi reintroduzido');
} else {
  console.log('    <table> no arquivo: ' + tNovo + ' (esperado 16 no original)');
}
console.log('    .listcard encontrados: ' + contar(novo, /class="listcard/g));

console.log('\n\x1b[1m=== 5. LUCIDE ===\x1b[0m');
const icones = contar(novo, /data-lucide=/g);
const createIcons = contar(js, /lucide\.createIcons\(/g);
const innerHTML = contar(js, /\.innerHTML\s*=/g);
console.log('    <i data-lucide>: ' + icones + ' | lucide.createIcons(): ' + createIcons + ' | innerHTML=: ' + innerHTML);
if (icones > 0 && createIcons === 0) erro('há ícones Lucide mas NENHUMA chamada de lucide.createIcons() — os ícones não aparecem');
else if (icones > 0) {
  if (createIcons < 3) warn('só ' + createIcons + ' chamada(s) de createIcons() — confirme se cobre cada render dinâmico');
  else ok('ícones + ' + createIcons + ' chamadas de createIcons()');
}
const iconeEmTexto = [];
for (const re of [/doc\.text\(\s*[`'"][^`'"]*data-lucide/g, /toast\(\s*[`'"][^`'"]*data-lucide/g,
                  /textContent\s*=\s*[`'"][^`'"]*data-lucide/g, /doc\.save\(\s*[`'"][^`'"]*data-lucide/g]) {
  const m = novo.match(re); if (m) iconeEmTexto.push(m[0].slice(0, 60));
}
if (iconeEmTexto.length) erro('ícone Lucide DENTRO de texto puro (não renderiza): ' + iconeEmTexto.join(' | '));
else ok('nenhum ícone Lucide em doc.text / toast / textContent / doc.save');

console.log('\n\x1b[1m=== 6. EMOJIS ===\x1b[0m');
const emo = contar(novo, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
const emoAntes = antes ? contar(antes, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) : null;
console.log('    emojis: ' + (emoAntes !== null ? emoAntes + ' -> ' + emo : emo));
warn('~44 emojis são TEXTO DE SAÍDA (toast, mensagem, nome de arquivo) e devem permanecer');

console.log('\n\x1b[1m=== 7. CHAMADAS DE BANCO ===\x1b[0m');
function refs(txt) {
  return {
    tabelas: new Set((txt.match(/\.from\('([a-z_]+)'/g) || []).map(s => s.slice(7, -1))),
    rpcs: new Set((txt.match(/\.rpc\('([a-z_]+)'/g) || []).map(s => s.slice(6, -1))),
  };
}
const rNovo = refs(novo);
if (antes) {
  const rAntes = refs(antes);
  const ft = [...rAntes.tabelas].filter(t => !rNovo.tabelas.has(t));
  const fr = [...rAntes.rpcs].filter(t => !rNovo.rpcs.has(t));
  if (!ft.length) ok(rAntes.tabelas.size + ' tabelas preservadas'); else erro('tabelas perdidas: ' + ft.join(', '));
  if (!fr.length) ok(rAntes.rpcs.size + ' RPCs preservadas'); else erro('RPCs perdidas: ' + fr.join(', '));
} else {
  console.log('    tabelas: ' + rNovo.tabelas.size + ' | RPCs: ' + rNovo.rpcs.size + ' (esperado 35 e 12)');
}

console.log('\n\x1b[1m=== 8. FUNÇÕES CRÍTICAS ===\x1b[0m');
const criticas = ['parseBR','numQtd','numBR','parsePedido','parseDanfe','geraPdfCarga','geraPdfCargaCliente',
  'geraPdfRoteiro','menusPara','buildNav','afterLogin','setEmp','empAtiva','filaAdd','filaLer','lightbox',
  'ins','upd','sel','esc','fmtBRL','rotTxt'];
const faltamFn = criticas.filter(f => !new RegExp('function\\s+' + f + '\\s*\\(').test(js) &&
  !new RegExp('(const|let|var)\\s+' + f + '\\s*=').test(js));
if (!faltamFn.length) ok(criticas.length + ' funções críticas presentes');
else erro('funções ausentes: ' + faltamFn.join(', '));

console.log('\n\x1b[1m=== 9. SEPARACAO POR EMPRESA ===\x1b[0m');
const mApp = novo.match(/window\.APP\s*=\s*(\{[\s\S]*?\});/);
if (!mApp) erro('bloco window.APP ausente — a separacao por empresa foi removida (o app vai abrir com as 3 empresas)');
else {
  try {
    const app = JSON.parse(mApp[1]);
    console.log('    empresa do app: ' + app.empresa + ' | telas: ' + (app.telas || []).length);
    if (!app.empresa) erro('window.APP sem "empresa"');
    else ok('empresa travada em ' + app.empresa);
    if (!Array.isArray(app.telas) || !app.telas.length) erro('window.APP sem lista de telas');
    else ok((app.telas.length) + ' telas declaradas');
  } catch (e) { erro('window.APP invalido: ' + e.message); }
}

console.log('\n\x1b[1m=== 10. ARQUIVO ===\x1b[0m');
if (antes) console.log('    tamanho: ' + (antes.length / 1024).toFixed(0) + ' KB -> ' + (novo.length / 1024).toFixed(0) + ' KB');
else console.log('    tamanho: ' + (novo.length / 1024).toFixed(0) + ' KB');
if (!/<\/html>\s*$/i.test(novo.trim())) erro('o arquivo NÃO termina com </html> — provavelmente foi CORTADO');
else ok('arquivo termina com </html> (não truncado)');
if (!/id="nav"/.test(novo) || !/id="main"/.test(novo)) erro('estrutura base (#nav / #main) ausente');
else ok('estrutura base (#nav / #main) presente');

console.log('\n' + '='.repeat(54));
if (bloqueios === 0) {
  console.log('\x1b[42m\x1b[30m  APROVADO — nenhum bloqueio  \x1b[0m');
  console.log('  Pode publicar (depois de testar no celular).\n');
  process.exit(0);
} else {
  console.log('\x1b[41m\x1b[37m  REPROVADO — ' + bloqueios + ' bloqueio(s)  \x1b[0m');
  console.log('  NÃO publique. Corrija os itens marcados com X.\n');
  process.exit(1);
}
