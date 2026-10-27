import assert from "node:assert/strict";
import test from "node:test";
import imageLoader from "../src/lib/image-loader";
import { photoIsPubliclyReusable, rankParkPhotos } from "../src/lib/photos";
import { applySpeciesPhotoReview, buildSpeciesPhotoCatalog, fillSpeciesPhotoGaps, resolveFlagshipCard } from "../src/lib/species-photos";
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

test("curadoria do destaque prevalece sem perder os dados de ocorrência", () => {
  const curated = { ...photo, src: "/foto-escolhida.jpg", context: "Escolha editorial" };
  const flagship = { scientificName: "Pteronura brasiliensis", name: "Ariranha", why: "Relação documentada", sourceIds: ["plano"], photo: curated };
  const card = resolveFlagshipCard(flagship, bio("Pteronura brasiliensis", photo));
  assert.equal(card?.photo?.src, curated.src);
  assert.equal(card?.records, 5);
  assert.equal(resolveFlagshipCard({ ...flagship, photo: undefined }, bio("Pteronura brasiliensis"))?.photo, null);
});

test("capa explicitamente curada tem prioridade e galeria é deduplicada", () => {
  const chosen = { ...photo, sourceUrl: "https://commons.wikimedia.org/wiki/File:Parque_Nacional_Guaricana_-_Luiz_Alves_(02).jpg" };
  const result = rankParkPhotos("guaricana", [photo, chosen, chosen]);
  assert.equal(result.length, 2);
  assert.equal(result[0].sourceUrl, chosen.sourceUrl);
});
