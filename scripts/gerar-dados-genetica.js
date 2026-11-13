// Gera genetica-dados.js a partir do index.html: protocolos completos, corpos e imagens.
// Rode de novo sempre que um protocolo ou imagem mudar no index.html:
//   node scripts/gerar-dados-genetica.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
function literal(nome){
  const ini = s.indexOf(`const ${nome} = `);
  if (ini < 0) throw new Error(`${nome} não encontrado no index.html`);
  const a = ini + `const ${nome} = `.length, b = s.indexOf(";\n", a);
  return new Function(`return (${s.slice(a, b)});`)();
}
const PROTOCOLOS = literal("PROTOCOLOS");
const dados = { PROTOCOLOS, BODY: literal("BODY"), IMGS: literal("IMGS"), HEMACIAS: literal("HEMACIAS") };
const out = "/* Gerado por scripts/gerar-dados-genetica.js a partir do index.html. Não edite à mão. */\nwindow.HM_DADOS = " + JSON.stringify(dados) + ";\n";
fs.writeFileSync(path.join(raiz, "genetica-dados.js"), out);
console.log(`genetica-dados.js: ${PROTOCOLOS.length} protocolos, ${(out.length / 1048576).toFixed(1)} MB`);
