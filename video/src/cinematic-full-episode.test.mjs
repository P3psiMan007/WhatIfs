import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const episodePath='video/src/what-if-episode.jsx';
const cinematicPath='video/src/cinematic-full-episode.jsx';

function read(path){return fs.readFileSync(path,'utf8');}

test('full episode uses one cinematic visual owner instead of rejected SVG scene renderer',()=>{
  const episode=read(episodePath);
  assert.match(episode,/CinematicEpisodeScene/);
  assert.doesNotMatch(episode,/SleepAssetScene/);
  assert.match(episode,/data-visual-owner=["']cinematic-single["']/);
});

test('cinematic renderer has scene-specific visual families and approved benchmark photo language',()=>{
  assert.equal(fs.existsSync(cinematicPath),true,'cinematic full-episode renderer must exist');
  const source=read(cinematicPath);
  for(const id of ['scene-01','scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09']) assert.match(source,new RegExp(id));
  assert.match(source,/photoshop-api\.adobe\.io\/v2\/short-url/);
  assert.match(source,/CinematicPhoto/);
  assert.match(source,/NeuralField/);
  assert.match(source,/CircadianHorizon/);
  assert.match(source,/CityGrid/);
  assert.match(source,/BoundaryScene/);
  assert.match(source,/HomeScene/);
  assert.match(source,/TimeStream/);
  assert.match(source,/PayoffScene/);
});

test('cinematic renderer always paints a non-black base plate under every beat',()=>{
  const source=read(cinematicPath);
  assert.match(source,/backgroundColor:\s*['"]#090c12['"]/);
  assert.match(source,/radial-gradient/);
  assert.doesNotMatch(source,/visualAsset|\.svg/);
});
