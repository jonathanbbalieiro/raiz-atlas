import assert from "node:assert/strict";
import test from "node:test";
import imageLoader from "../src/lib/image-loader";
import { applyParkPhotoCuration, photoIsPubliclyReusable, rankParkPhotos } from "../src/lib/photos";
import { applySpeciesPhotoReview, biodiversityRoster, buildSpeciesPhotoCatalog, fillSpeciesPhotoGaps, resolveFlagshipCard } from "../src/lib/species-photos";
import type { Biodiversity, ParkGuide, Photo } from "../src/lib/data/types";

const photo: Photo = {
  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Giantotter.jpg/1280px-Giantotter.jpg",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Giantotter.jpg",
  alt: "Ariranha (Pteronura brasiliensis)", author: "Fotógrafa identificada",
  license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", width: 1280, height: 506,
};
const bio = (scientificName: string, image: Photo | null = null): Biodiversity => ({
  generatedAt: "2026-10-26", boundary: "limite oficial simplificado", method: "", sources: [], threatened: [],
  groups: [{ id: "mamiferos", label: "Mamíferos", records: 5, species: [{
    gbifKey: 1, scientificName, name: "Ariranha", family: null, records: 5, iucn: null, wikidata: null, photo: image,
  }] }],
});

test("rejeição de identificação remove somente a associação errada sem alterar a base", () => {
  const original = { biodiversity: bio("Jacaranda copaia", photo) };
  const review = { photos: {}, rejected: [{ scientificName: "Jacaranda copaia", sourceUrl: photo.sourceUrl, reason: "Fonte identifica outra espécie" }] };
  assert.equal(applySpeciesPhotoReview(original, review).biodiversity.groups[0].species[0].photo, null);
  assert.equal(original.biodiversity.groups[0].species[0].photo, photo);
  assert.equal(applySpeciesPhotoReview({ biodiversity: bio("Jacaranda mimosifolia", photo) }, review).biodiversity.groups[0].species[0].photo, photo);
});

test("miniaturas usam degraus da CDN e nunca ampliam a fonte escolhida", () => {
  assert.match(imageLoader({ src: photo.src, width: 640 }), /\/960px-/);
  assert.match(imageLoader({ src: photo.src, width: 2400 }), /\/1280px-/);
  const original = "https://upload.wikimedia.org/wikipedia/commons/e/e2/Giantotter.jpg";
  assert.equal(imageLoader({ src: original, width: 500 }), original);
});

test("Flickr troca só entre tamanhos do mesmo segredo e nunca amplia", () => {
  const b = "https://live.staticflickr.com/65535/51234567890_abcdef1234_b.jpg";
  assert.equal(imageLoader({ src: b, width: 600 }), b.replace("_b.jpg", "_z.jpg"));
  assert.equal(imageLoader({ src: b, width: 3000 }), b);
  const c = b.replace("_b.jpg", "_c.jpg");
  assert.equal(imageLoader({ src: c, width: 1200 }), c);
  const k = "https://live.staticflickr.com/65535/51234567890_9f8e7d6c5b_k.jpg";
  assert.equal(imageLoader({ src: k, width: 400 }), k);
});

test("curadoria de galeria acrescenta, escolhe a capa e retira fotos rejeitadas", () => {
  const gen = (name: string): Photo => ({ ...photo, src: `https://upload.wikimedia.org/${name}`, sourceUrl: `https://commons.wikimedia.org/wiki/File:${name}` });
  const added = { ...gen("nova.jpg"), context: "Feita no parque." };
  const photos = applyParkPhotoCuration("x", [gen("a.jpg"), gen("errada.jpg"), gen("b.jpg")], {
    reviewedAt: "2026-10-27",
    parks: { x: { photos: [added], cover: gen("b.jpg").sourceUrl } },
    rejected: [{ park: "x", sourceUrl: gen("errada.jpg").sourceUrl, reason: "outra unidade" }],
  });
  assert.deepEqual(photos.map((p) => p.sourceUrl.split(":").pop()), ["b.jpg", "a.jpg", "nova.jpg"]);
  assert.equal(applyParkPhotoCuration("y", [gen("a.jpg")], undefined).length, 1);
  // Sem capa explícita, a foto acrescentada não toma a abertura; a versão curada substitui a gerada.
  const fixed = { ...gen("a.jpg"), alt: "Legenda corrigida", context: "Vista de fora do parque." };
  const kept = applyParkPhotoCuration("z", [gen("a.jpg"), gen("b.jpg")], {
    reviewedAt: "2026-10-27", parks: { z: { photos: [added, fixed] } }, rejected: [],
  });
  assert.deepEqual(kept.map((p) => p.sourceUrl.split(":").pop()), ["a.jpg", "b.jpg", "nova.jpg"]);
  assert.equal(kept[0].alt, "Legenda corrigida");
});

test("reuso não confunde nome popular, não transfere ocorrência e preserva curadoria", () => {
  const catalog = buildSpeciesPhotoCatalog([{ biodiversity: bio("Pteronura brasiliensis", photo) }]);
  const source = { biodiversity: bio("Pteronura brasiliensis") };
  const filled = fillSpeciesPhotoGaps(source, catalog);
  assert.equal(source.biodiversity.groups[0].species[0].photo, null);
  assert.equal(filled.biodiversity.groups[0].species[0].photo?.src, photo.src);
  assert.match(filled.biodiversity.groups[0].species[0].photo!.context!, /fora deste parque/);
  assert.equal(filled.biodiversity.groups[0].species[0].records, 5);
  assert.equal(fillSpeciesPhotoGaps({ biodiversity: bio("Lontra longicaudis") }, catalog).biodiversity.groups[0].species[0].photo, null);
  const curated = { ...photo, src: "/curadoria.jpg" };
  assert.equal(fillSpeciesPhotoGaps({ biodiversity: bio("Pteronura brasiliensis", curated) }, catalog).biodiversity.groups[0].species[0].photo?.src, curated.src);
});

test("catálogo rejeita associação sem identificação, crédito, resolução ou licença adequados", () => {
  for (const bad of [
    { ...photo, alt: "Paisagem com animal" }, { ...photo, author: "Autor desconhecido" },
    { ...photo, width: 330 }, { ...photo, license: "CC BY-NC 4.0" },
    { ...photo, license: "CC BY 4.0 all rights reserved" },
  ]) assert.equal(buildSpeciesPhotoCatalog([{ biodiversity: bio("Pteronura brasiliensis", bad) }]).size, 0);
});

test("guia usa somente a foto do mesmo táxon; catálogo não transforma símbolo em ocorrência", () => {
  const catalog = buildSpeciesPhotoCatalog([{ biodiversity: bio("Pteronura brasiliensis", photo) }]);
  const guide = { flagships: [{ scientificName: "Pteronura brasiliensis", name: "Ariranha", why: "Fonte editorial", sourceIds: ["plano"] }] } as ParkGuide;
  const filled = fillSpeciesPhotoGaps({ guide }, catalog);
  assert.equal(filled.guide.flagships[0].photo?.sourceUrl, photo.sourceUrl);
  assert.equal("biodiversity" in filled && Boolean(filled.biodiversity), false);
  assert.equal(guide.flagships[0].photo, undefined);
});

test("licença desconhecida não passa por correspondência parcial", () => {
  assert.equal(photoIsPubliclyReusable(photo), true);
  for (const license of ["", "CC BY-NC 4.0", "CC BY 4.0 ou outra condição", "CC0 PROPRIETARY"]) {
    assert.equal(photoIsPubliclyReusable({ ...photo, license }), false);
  }
});

test("explorador preserva a foto escolhida e não inventa registros dos destaques editoriais", () => {
  const chosen = { ...photo, src: "/foto-editorial.jpg" };
  const guide = { flagships: [
    { scientificName: "Pteronura brasiliensis", name: "Ariranha", why: "Fonte", sourceIds: ["plano"], photo: chosen },
    { scientificName: "Espécie editorial", name: "Destaque", why: "Fonte", sourceIds: ["plano"] },
  ] } as ParkGuide;
  const roster = biodiversityRoster(bio("Pteronura brasiliensis", photo), guide);
  assert.equal(roster.length, 2);
  assert.equal(roster[0].photo?.src, chosen.src);
  assert.equal(roster[0].records, 5);
  assert.equal(roster[1].records, null);
  assert(roster[1].gbifKey < 0);
  assert.equal(roster[1].photo, null);
});

test("curadoria do destaque prevalece sem perder os dados de ocorrência", () => {
  const curated = { ...photo, src: "/foto-escolhida.jpg", context: "Escolha editorial" };
  const flagship = { scientificName: "Pteronura brasiliensis", name: "Ariranha", why: "Relação documentada", sourceIds: ["plano"], photo: curated };
  const card = resolveFlagshipCard(flagship, bio("Pteronura brasiliensis", photo));
  assert.equal(card?.photo?.src, curated.src);
  assert.equal(card?.records, 5);
  assert.equal(resolveFlagshipCard({ ...flagship, photo: undefined }, bio("Pteronura brasiliensis"))?.photo, null);
});

test("destaque mantém a categoria de ameaça mesmo quando a foto vem de outro grupo", () => {
  const data = bio("Pteronura brasiliensis", photo);
  data.threatened = [{ ...data.groups[0].species[0], iucn: "EN", photo: null, records: null }];
  const card = resolveFlagshipCard({ scientificName: "Pteronura brasiliensis", name: "Ariranha", why: "Relação documentada", sourceIds: ["plano"] }, data);
  assert.equal(card?.iucn, "EN");
  assert.equal(card?.photo?.src, photo.src);
  assert.equal(card?.records, 5);
});

test("capa explicitamente curada tem prioridade e galeria é deduplicada", () => {
  const chosen = { ...photo, sourceUrl: "https://commons.wikimedia.org/wiki/File:Parque_Nacional_Guaricana_-_Luiz_Alves_(02).jpg" };
  const result = rankParkPhotos("guaricana", [photo, chosen, chosen]);
  assert.equal(result.length, 2);
  assert.equal(result[0].sourceUrl, chosen.sourceUrl);
});
