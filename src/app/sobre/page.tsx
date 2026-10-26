import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sobre e créditos",
  description: "De onde vêm os dados, as fotos e os textos do Raiz, e como cada licença é respeitada.",
  alternates: { canonical: "/sobre" },
};

const CONTACT = SITE.contact;

const SOURCES = [
  { name: "ICMBio", use: "limites, áreas, atos de criação, planos de manejo e fichas dos parques", url: "https://www.gov.br/icmbio" },
  { name: "IBGE", use: "malha de estados e municípios", url: "https://www.ibge.gov.br" },
  { name: "GBIF", use: "registros de espécies dentro do limite de cada parque", url: "https://www.gbif.org" },
  { name: "Flora e Funga do Brasil (JBRJ)", use: "origem das plantas (nativa, exótica, cultivada)", url: "https://floradobrasil.jbrj.gov.br" },
  { name: "Wikimedia Commons e Wikidata", use: "fotografias livres, nomes populares e situação de conservação", url: "https://commons.wikimedia.org" },
  { name: "iNaturalist", use: "fotografias de espécies e nomes populares", url: "https://www.inaturalist.org" },
  { name: "NASA MODIS (GIBS)", use: "cobertura vegetal do mapa, recolorida pelo Raiz; dados de domínio público", url: "https://earthdata.nasa.gov/gibs" },
  { name: "OpenFreeMap e OpenStreetMap", use: "nomes, água e limites do mapa de base", url: "https://openfreemap.org" },
  { name: "Terrain Tiles (Mapzen, AWS)", use: "relevo em 3D", url: "https://registry.opendata.aws/terrain-tiles/" },
];

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-ink">
      <Link href="/" className="text-sm text-forest underline underline-offset-2">
        ← Voltar ao mapa
      </Link>
      <p className="mt-8 text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Raiz</p>
      <h1 className="mt-1 font-display text-4xl leading-tight font-semibold text-balance text-forest-deep">
        Sobre e créditos
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed">
        {SITE.name} é um atlas dos 77 parques nacionais do Brasil, do mapa do país até cada atração. O objetivo é
        encantar com informação rigorosa e incentivar quem visita a conhecer e proteger esses lugares.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold text-forest-deep">De onde vêm os dados</h2>
      <ul className="mt-3 space-y-2">
        {SOURCES.map((s) => (
          <li key={s.name} className="leading-relaxed">
            <a href={s.url} rel="noopener" className="font-medium text-forest underline underline-offset-2">
              {s.name}
            </a>
            : {s.use}.
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-2xl font-semibold text-forest-deep">Fotografias e licenças</h2>
      <p className="mt-3 leading-relaxed">
        Todas as fotos são de autores que as publicaram com licença livre, e o crédito (autor, licença e página de
        origem) aparece junto de cada imagem. Usamos CC0, domínio público, CC BY, CC BY-SA e, em poucos casos,
        CC BY-NC (uso não comercial). Fotografias de espécies são retratos da espécie e nem sempre foram feitas
        dentro do parque. Se uma foto for sua e você quiser que ela seja removida ou corrigida, escreva para nós.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold text-forest-deep">Textos e revisão</h2>
      <p className="mt-3 leading-relaxed">
        Os textos editoriais são escritos a partir de fontes oficiais citadas em cada página e passam por revisão
        antes de serem publicados. Textos sobre povos indígenas e comunidades tradicionais são revisados com as
        próprias comunidades e com a Funai. Encontrou um erro? Avise e corrigimos.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold text-forest-deep">Privacidade</h2>
      <p className="mt-3 leading-relaxed">
        O site não usa cookies de rastreamento nem coleta dados pessoais. As fotos e os mapas são carregados de
        serviços externos (Wikimedia, iNaturalist e provedores de mapa), que podem registrar o acesso técnico
        conforme as próprias políticas.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold text-forest-deep">Contato</h2>
      <p className="mt-3 leading-relaxed">
        {CONTACT ? (
          <a href={`mailto:${CONTACT}`} className="font-medium text-forest underline underline-offset-2">
            {CONTACT}
          </a>
        ) : (
          "Em breve."
        )}
      </p>
    </main>
  );
}
