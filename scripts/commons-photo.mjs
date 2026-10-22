/**
 * Ferramenta editorial: busca ou confere fotos do Wikimedia Commons para o
 * guia de um parque (campo `photo` das maravilhas), já com autor e licença.
 * Só aceita CC0, domínio público, CC BY e CC BY-SA (uso comercial permitido).
 *
 *   npm run photo -- search "Salto do Rio Preto Chapada dos Veadeiros"
 *   npm run photo -- file "File:Nome do arquivo.jpg" "Legenda: o que a foto mostra"
 *
 * `search` lista candidatos com licença válida; `file` imprime o JSON pronto
 * para colar em guide.json.
 */
const UA = { "User-Agent": "raiz-atlas/1.1 (ferramenta editorial de fotos)" };
const OK = /^(CC0|Public domain|CC BY(-SA)? [0-9.]+( [a-z]{2})?)$/i;
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const api = "https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query";

/** GET JSON com espera e nova tentativa quando o Commons limita as requisições. */
async function getJson(url) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    if (res.ok && text.startsWith("{")) return JSON.parse(text);
    await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
  }
  throw new Error("Commons indisponível ou limitando requisições: tente de novo em alguns minutos.");
}

async function info(titles) {
  const r = await getJson(`${api}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280&titles=${encodeURIComponent(titles.join("|"))}`);
  return (r.query?.pages ?? []).map((p) => {
    const ii = p.imageinfo?.[0];
    const m = ii?.extmetadata ?? {};
    const license = m.LicenseShortName?.value ?? "";
    return {
      title: p.title,
      ok: !!ii && OK.test(license) && /jpeg|png|webp/.test(ii.mime ?? "") && ii.width >= 900,
      license,
      width: ii?.width,
      description: strip(m.ImageDescription?.value).slice(0, 160),
      photo: ii && {
        src: (ii.thumburl ?? ii.url).split("?")[0],
        author: strip(m.Artist?.value).slice(0, 80) || "Autor desconhecido",
        license,
        licenseUrl: m.LicenseUrl?.value ?? "https://commons.wikimedia.org/wiki/Commons:Public_domain",
        sourceUrl: ii.descriptionurl,
        width: ii.thumbwidth,
        height: ii.thumbheight,
      },
    };
  });
}

const [cmd, arg, context] = process.argv.slice(2);
if (cmd === "search" && arg) {
  const r = await getJson(`${api}&list=search&srnamespace=6&srlimit=20&srsearch=${encodeURIComponent(arg + " filetype:bitmap")}`);
  const titles = (r.query?.search ?? []).map((h) => h.title);
  if (!titles.length) console.log("Nenhum resultado.");
  for (const i of titles.length ? await info(titles) : []) {
    if (i.ok) console.log(`✓ ${i.title}\n    ${i.license} · ${i.width}px · ${i.description}`);
  }
} else if (cmd === "file" && arg) {
  const [i] = await info([arg.startsWith("File:") ? arg : `File:${arg}`]);
  if (!i?.photo) throw new Error("Arquivo não encontrado no Commons.");
  if (!i.ok) throw new Error(`Recusada: licença "${i.license}", largura ${i.width}px (precisa CC0/PD/CC BY/CC BY-SA e ≥ 900px).`);
  console.log(JSON.stringify({ ...i.photo, alt: context ?? i.description, context: context ?? "" }, null, 2));
} else {
  console.log('Uso: npm run photo -- search "termos"  |  npm run photo -- file "File:Nome.jpg" "Legenda"');
}
