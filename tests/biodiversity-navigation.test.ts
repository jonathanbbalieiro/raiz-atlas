import test from "node:test";
import assert from "node:assert/strict";
import { biodiversityNavigation, orderBiodiversityRoster } from "../src/lib/biodiversity-navigation";

const fox = Object.freeze({ scientificName: "Cerdocyon thous", records: 900, photo: { src: "/fox.jpg" } });
const wolf = Object.freeze({ scientificName: "Chrysocyon brachyurus", records: 4, photo: null });
const orchid = Object.freeze({ scientificName: "Cattleya violacea", records: 12, photo: { src: "/orchid.jpg" } });
const otter = Object.freeze({ scientificName: "Pteronura brasiliensis", records: null, photo: null });
const roster = Object.freeze([fox, wolf, orchid, otter]);

test("descoberta começa pelos destaques na ordem da edição e mantém a sequência restante", () => {
  const ordered = orderBiodiversityRoster(roster, [otter, wolf]);
  assert.deepEqual(ordered, [otter, wolf, fox, orchid]);
  assert.equal(ordered[0], otter);
  assert.deepEqual(roster, [fox, wolf, orchid, otter]);
  assert.equal(biodiversityNavigation(ordered).active, otter);
});

test("prioridade editorial aceita variação de caixa/espaços sem duplicar ou confundir táxons", () => {
  const ordered = orderBiodiversityRoster(roster, [
    { scientificName: "  CATTLEYA   VIOLACEA " },
    { scientificName: "Chrysocyon brachyurus" },
    { scientificName: "Cattleya violacea" },
    { scientificName: "Cerdocyon inexistente" },
  ]);
  assert.deepEqual(ordered, [orchid, wolf, fox, otter]);
  assert.deepEqual(orderBiodiversityRoster(roster), [...roster]);
});

test("filtros temporários não apagam a escolha: a espécie retorna quando volta aos resultados", () => {
  const preferredName = "Pteronura brasiliensis";
  assert.equal(biodiversityNavigation(roster, preferredName).active, otter);
  const plantsOnly = biodiversityNavigation([orchid], preferredName);
  assert.equal(plantsOnly.active, orchid);
  assert.equal(plantsOnly.previous, undefined);
  assert.equal(plantsOnly.next, undefined);
  assert.equal(biodiversityNavigation([], preferredName).active, undefined);
  assert.equal(biodiversityNavigation(roster, preferredName).active, otter);
});

test("anterior/próximo seguem a seleção filtrada sem saltar para espécies ocultas ou circular", () => {
  const results = Object.freeze([wolf, otter, orchid]);
  const middle = biodiversityNavigation(results, " PTERONURA   BRASILIENSIS ");
  assert.equal(middle.previous, wolf);
  assert.equal(middle.active, otter);
  assert.equal(middle.next, orchid);
  assert.equal(middle.index, 1);
  assert.equal(middle.total, 3);
  assert.equal(biodiversityNavigation(results, wolf.scientificName).previous, undefined);
  assert.equal(biodiversityNavigation(results, orchid.scientificName).next, undefined);
  assert.deepEqual(biodiversityNavigation([]), { active: undefined, previous: undefined, next: undefined, index: -1, total: 0 });
});
