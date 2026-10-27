import assert from 'node:assert/strict';
import test from 'node:test';
import { searchMatchScore } from '../src/lib/search';
import { filterSpecies, mergeSpecies } from '../src/lib/species-search';
import type { SpeciesCard } from '../src/lib/data/types';
const species: SpeciesCard = { gbifKey: 1, scientificName: 'Pteronura brasiliensis', name: 'Ariranha', family: 'Mustelidae', records: 5, iucn: 'VU', wikidata: null, photo: { src:'/ariranha.jpg',alt:'Ariranha',author:'Autor',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://example.org/foto' } };
test('busca combina nome, UF e bioma sem exigir acentos ou ordem', () => {
 const fields=['Chapada dos Veadeiros','Cerrado','GO'];
 for(const q of ['chapada GO','go cerrado','VEADEÍROS',' cerrado  chapada ']) assert(Number.isFinite(searchMatchScore(fields,q)),q);
 assert.equal(searchMatchScore(fields,'chapada SP'),Infinity);
 assert.equal(searchMatchScore(['GO'],'g'),Infinity);
 assert.equal(searchMatchScore(fields,'  '),Infinity);
});
test('espécies aceitam família, nome popular e científico com filtros combinados', () => {
 for(const q of ['ariránha','Mustelidae','Pteronura brasiliensis']) assert.equal(filterSpecies([species],q).length,1);
 assert.equal(filterSpecies([species],'onça').length,0);
 assert.equal(filterSpecies([{...species,photo:null}],'',true).length,0);
 assert.equal(filterSpecies([{...species,photo:null}],'').length,1);
});
test('ameaça complementa a ocorrência sem apagar fotografia e registros', () => {
 const merged=mergeSpecies([species,{...species,photo:null,records:null,iucn:'EN'}]);
 assert.equal(merged.length,1);assert.equal(merged[0].photo,species.photo);assert.equal(merged[0].records,5);assert.equal(merged[0].iucn,'EN');
 assert.equal(species.iucn,'VU');
});
