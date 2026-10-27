import test from 'node:test';
import assert from 'node:assert/strict';
import type { Biodiversity, SpeciesCard } from '../src/lib/data/types';
import { biodiversitySelections, speciesEvidenceLink } from '../src/lib/species-evidence';
const specimen:SpeciesCard={gbifKey:123,scientificName:'Planta documentada',name:null,family:null,records:4,iucn:null,wikidata:null,photo:null};
const bio:Biodiversity={generatedAt:'2026-10-27',boundary:'envoltória convexa',method:'',groups:[{id:'plantas',label:'Plantas',records:4,species:[specimen]}],threatened:[],sources:[]};
test('ocorrências preservam a área original e restringem o táxon',()=>{
 const data={...bio,sources:[{title:'GBIF',url:'https://www.gbif.org/occurrence/search?geometry=POLYGON%28%281%202%2C3%204%29%29&taxon_key=99',accessed:'2026-10-27'}]};
 const evidence=speciesEvidenceLink(data,specimen)!;const url=new URL(evidence.url);
 assert.equal(evidence.spatial,true);assert.equal(url.searchParams.get('taxon_key'),'123');assert.equal(url.searchParams.get('geometry'),'POLYGON((1 2,3 4))');assert.equal(data.sources[0].url.includes('taxon_key=99'),true);
});
test('fonte sem recorte ou de outro domínio não comprova ocorrência local',()=>{
 for(const url of ['https://www.gbif.org/occurrence/search','https://example.org/occurrence/search?geometry=area','http://www.gbif.org/occurrence/search?geometry=area']){
  const evidence=speciesEvidenceLink({...bio,sources:[{title:'Fonte',url,accessed:''}]},specimen)!;assert.equal(evidence.spatial,false);assert.equal(evidence.url,'https://www.gbif.org/species/123');
 }
 assert.equal(speciesEvidenceLink(bio,{...specimen,gbifKey:0}),null);
});
test('separa fauna e flora por grupo conhecido sem inferir o grupo de ameaçadas ou fungos',()=>{
 const data={...bio,groups:[...bio.groups,{id:'aves',label:'Aves',records:4,species:[{...specimen,gbifKey:456}]},{id:'fungos',label:'Fungos',records:4,species:[{...specimen,gbifKey:789}]}],threatened:[{...specimen,iucn:'EN' as const,records:null},{...specimen,gbifKey:999}]};
 const result=biodiversitySelections(data);assert.deepEqual(result.plants.map(s=>s.gbifKey),[123]);assert.deepEqual(result.animals.map(s=>s.gbifKey),[456]);assert.equal(result.plants[0].iucn,'EN');assert.equal(result.plants[0].records,4);
});
