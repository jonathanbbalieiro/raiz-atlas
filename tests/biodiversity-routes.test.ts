import test from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/lib/data';
import { BIODIVERSITY_SEGMENT } from '../src/lib/editorial';

test('cada parque com levantamento tem rota própria de biodiversidade, sem rotas duplicadas',async()=>{
 const paths=await repo.listAllPaths();
 assert.equal(new Set(paths.map(p=>p.join('/'))).size,paths.length);
 for(const country of await repo.listCountries()){
  for(const park of await repo.listParks(country.slug)){
   if(park.biodiversity) assert(paths.some(p=>p.join('/')===[...park.path,BIODIVERSITY_SEGMENT].join('/')),park.slug);
  }
 }
});
