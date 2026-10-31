import test from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/lib/data';
import { BIODIVERSITY_SEGMENT } from '../src/lib/editorial';
import { buildSpeciesPhotoCatalog } from '../src/lib/species-photos';

test('cada parque com levantamento tem rota própria de biodiversidade, sem rotas duplicadas',async()=>{
 const paths=await repo.listAllPaths();
 assert.equal(new Set(paths.map(p=>p.join('/'))).size,paths.length);
 for(const country of await repo.listCountries()){
  for(const park of await repo.listParks(country.slug)){
   if(park.biodiversity) assert(paths.some(p=>p.join('/')===[...park.path,BIODIVERSITY_SEGMENT].join('/')),park.slug);
  }
 }
});

test('a mesma espécie mantém nome e fotografia entre os parques e os destaques',async()=>{
 const photos=new Map<string,string>();
 const names=new Map<string,string>();
 const parks=await repo.listParks('br');
 const catalog=buildSpeciesPhotoCatalog(parks);
 for(const park of parks){
  const species=[...(park.biodiversity?.groups.flatMap(g=>g.species)??[]),...(park.biodiversity?.threatened??[]),...(park.guide?.flagships??[])];
  for(const s of species){
   const key=s.scientificName.trim().toLowerCase();
   if(s.photo && catalog.has(key)){
    if(photos.has(key)) assert.equal(s.photo.src,photos.get(key),`${park.slug}: ${key}`);
    photos.set(key,s.photo.src);
   }
   if(s.name){
    if(names.has(key)) assert.equal(s.name,names.get(key),`${park.slug}: ${key}`);
    names.set(key,s.name);
   }
  }
 }
 assert.equal(names.get('puma concolor'),'Onça-parda');
 assert.equal(photos.get('puma concolor'),'/media/species/puma-concolor.jpg');
 assert.ok(photos.has('tapirus terrestris'));
});
