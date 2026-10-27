import test from 'node:test';
import assert from 'node:assert/strict';
import { repo } from '../src/lib/data';
import { buildMapFocus } from '../src/lib/map-focus';
import { cellKm, occurrenceFeatures } from '../src/lib/occurrences';

test('registros viram quadrados e centros, nunca os pontos originais, com intensidade relativa',()=>{
 const fc=occurrenceFeatures({cell:0.1,records:12,cells:[[-47.9,-14.2,9],[-47.8,-14.1,3]]});
 const polygons=fc.features.filter(f=>f.geometry.type==='Polygon'),points=fc.features.filter(f=>f.geometry.type==='Point');
 assert.equal(polygons.length,2);assert.equal(points.length,2);
 const ring=(polygons[0].geometry as GeoJSON.Polygon).coordinates[0];
 assert.deepEqual(ring[0],[-47.9,-14.2]);assert.ok(Math.abs(ring[2][0]-(-47.8))<1e-9&&Math.abs(ring[2][1]-(-14.1))<1e-9);
 assert.deepEqual((points[0].geometry as GeoJSON.Point).coordinates.map(v=>+v.toFixed(3)),[-47.85,-14.15]);
 assert.equal(polygons[0].properties!.share,1);assert.equal(polygons[1].properties!.share,1/3);
 assert.equal(cellKm(0.02),2);assert.equal(cellKm(0.1),11);
});

test('o mapa numera só as maravilhas com lugar, na ordem dos cartões, e só no nível do parque',async()=>{
 const park=await repo.getNode(['br','go','chapada-dos-veadeiros']);
 assert(park&&park.level==='park');
 const focus=await buildMapFocus(park);
 const located=park.guide!.wonders.flatMap((w,index)=>w.location?[index]:[]);
 assert.deepEqual(focus.wonders.map(w=>w.index),located);
 assert.equal(focus.context,!!park.context);
 const state=await repo.getNode(['br','go']);
 const stateFocus=await buildMapFocus(state!);
 assert.deepEqual(stateFocus.wonders,[]);assert.equal(stateFocus.context,false);
});
