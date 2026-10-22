let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
const fs=require('fs'),path=require('path');
const roots=['src','next.config.ts'];
const files=[];
function walk(p){const s=fs.statSync(p);if(s.isDirectory()){for(const n of fs.readdirSync(p))walk(path.join(p,n));}else if(/\.(ts|tsx)$/.test(p))files.push(p)}
roots.forEach(walk);
let failed=0;
for(const file of files){
 const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}});
 const e=(r.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 for(const d of e){console.error(file, ts.flattenDiagnosticMessageText(d.messageText,' '));failed++;}
}
console.log(`${files.length} fontes TS/TSX transpiladas; ${failed} erros sintáticos.`);
if(failed)process.exit(1);
