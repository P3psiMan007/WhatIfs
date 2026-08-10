import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EPISODE1_ACTUAL_BEAT_COUNTS,EPISODE1_IMAGE_ASSETS,EPISODE1_IMAGE_SCENE_IDS,EPISODE1_SCREENING_BLOCKED_ASSETS,assertEpisode1ImageAssetCoverage} from './episode1-image-assets.mjs';
import {IMAGE_FIRST_TAKES,imageFirstTakeFor} from './episode1-shot-map.mjs';

const episodePath='video/src/what-if-episode.jsx';
const cinematicPath='video/src/cinematic-full-episode.jsx';
const shotMapPath='video/src/episode1-shot-map.mjs';
function read(path){return fs.readFileSync(path,'utf8');}

test('Episode 1 is explicitly routed to the single cinematic renderer and not the rejected sleep SVG renderer',()=>{
  const episode=read(episodePath);
  assert.match(episode,/LEGACY_CINEMATIC_EPISODE_ID\s*=\s*['"]20260807-episode['"]/);
  assert.match(episode,/CinematicEpisodeScene/);
  assert.match(episode,/cinematic-image-first-v5/);
  assert.doesNotMatch(episode,/SleepAssetScene/);
  assert.match(read(cinematicPath),/data-visual-owner=["']cinematic-single["']/);
});

test('cinematic renderer is image-first with enough local cinematic environments for every actual section beat',()=>{
  assert.equal(fs.existsSync(cinematicPath),true,'cinematic full-episode renderer must exist');
  const source=read(cinematicPath);
  assertEpisode1ImageAssetCoverage(EPISODE1_IMAGE_SCENE_IDS);
  const requiredAssets={'scene-01':8,'scene-02':14,'scene-03':14,'scene-04':11,'scene-05':16,'scene-06':12,'scene-07':15,'scene-08':11,'scene-09':12};
  assert.deepEqual(EPISODE1_ACTUAL_BEAT_COUNTS,{'scene-01':6,'scene-02':12,'scene-03':13,'scene-04':10,'scene-05':12,'scene-06':11,'scene-07':13,'scene-08':10,'scene-09':10});
  for(const id of EPISODE1_IMAGE_SCENE_IDS) assert.equal(EPISODE1_IMAGE_ASSETS[id].length,requiredAssets[id]);
  assert.match(source,/IMAGE_FIRST_TAKES/);assert.match(source,/imageAssetsForScene/);assert.match(source,/staticFile\(source\)/);
  assert.doesNotMatch(source,/photoshop-api|visualAsset|\.svg|ClockFace|CityGrid|phone/i);
});

test('image-first shot map has an explicit nonrepeating take for every measured episode beat',()=>{
  const globalCameraRecipes=[];const selectedAssets=new Set();
  for(const [sceneId,count] of Object.entries(EPISODE1_ACTUAL_BEAT_COUNTS)) {
    const takes=IMAGE_FIRST_TAKES[sceneId];assert.equal(takes.length,count,`${sceneId} must map every actual beat`);
    const compositions=new Set(takes.map((entry)=>JSON.stringify([entry.asset,entry.position,entry.scale,entry.drift,entry.lift])));assert.equal(compositions.size,count,`${sceneId} must not recycle a composition`);
    for(let index=1;index<takes.length;index+=1) assert.notEqual(takes[index].asset,takes[index-1].asset,`${sceneId} must not show the same source plate on adjacent beats`);
    const useCounts=new Map();for(const entry of takes) useCounts.set(entry.asset,(useCounts.get(entry.asset)||0)+1);for(const [asset,uses] of useCounts) assert.equal(uses,1,`${sceneId} source plate ${asset} must appear in exactly one final-cut beat`);
    for(let ordinal=1;ordinal<=count;ordinal++) assert.equal(imageFirstTakeFor(sceneId,ordinal),takes[ordinal-1]);assert.throws(()=>imageFirstTakeFor(sceneId,count+1),/unmapped image-first beat/);
    for(const entry of takes){const asset=EPISODE1_IMAGE_ASSETS[sceneId][entry.asset];assert.ok(asset,`${sceneId} takes must resolve to an actual local source plate`);assert.equal(EPISODE1_SCREENING_BLOCKED_ASSETS.has(asset),false,`${asset} is too dark for the final cut`);selectedAssets.add(asset);}
    globalCameraRecipes.push(...takes.map((entry)=>JSON.stringify([entry.position,entry.scale,entry.drift,entry.lift,entry.occluder])));
  }
  assert.equal(new Set(globalCameraRecipes).size,globalCameraRecipes.length,'the full episode must not recycle a camera recipe across different environments');
  for(const asset of Object.values(EPISODE1_IMAGE_ASSETS).flat()) if(!EPISODE1_SCREENING_BLOCKED_ASSETS.has(asset)) assert.equal(selectedAssets.has(asset),true,`${asset} needs a real final-cut beat`);
});

test('camera geometry changes materially when the story moves into a new section',()=>{
  const allTakes=Object.entries(IMAGE_FIRST_TAKES).flatMap(([sceneId,takes])=>takes.map((take,index)=>({sceneId,index,take})));
  for(let leftIndex=0;leftIndex<allTakes.length;leftIndex+=1){for(let rightIndex=leftIndex+1;rightIndex<allTakes.length;rightIndex+=1){const left=allTakes[leftIndex],right=allTakes[rightIndex];if(left.sceneId===right.sceneId||left.take.occluder!==right.take.occluder)continue;const [leftX,leftY]=left.take.position.match(/[-.\d]+/g).map(Number);const [rightX,rightY]=right.take.position.match(/[-.\d]+/g).map(Number);const leftScale=(left.take.scale[0]+left.take.scale[1])/2;const rightScale=(right.take.scale[0]+right.take.scale[1])/2;const motionDelta=Math.abs(left.take.drift[0]-right.take.drift[0])+Math.abs(left.take.drift[1]-right.take.drift[1])+Math.abs(left.take.lift[0]-right.take.lift[0])+Math.abs(left.take.lift[1]-right.take.lift[1]);const nearTemplate=Math.abs(leftX-rightX)<=12&&Math.abs(leftY-rightY)<=12&&Math.abs(leftScale-rightScale)<=.09&&motionDelta<=1.5;assert.equal(nearTemplate,false,`${left.sceneId}#${left.index+1} and ${right.sceneId}#${right.index+1} repeat a near-template camera recipe`);}}
});

test('cinematic renderer varies framing, light, haze, and foreground motion over real plates',()=>{
  const source=read(cinematicPath),shotMap=read(shotMapPath);assert.match(source,/backgroundColor:\s*['"]#090c12['"]/);assert.match(shotMap,/radial-gradient/);assert.match(source,/objectPosition:take\.position/);assert.match(source,/transform:`translate3d/);assert.match(source,/take\.light/);assert.match(source,/take\.haze/);assert.match(source,/take\.foreground/);assert.match(source,/ForegroundOccluder/);assert.match(source,/clipPath/);assert.match(source,/take\.occluderOpacity/);assert.match(source,/take\.lightOpacity/);assert.doesNotMatch(source,/\(ordinal - 1\) % takes\.length/);
});
