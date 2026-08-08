import test from 'node:test';
import assert from 'node:assert/strict';
import {getSleepThumbnailArtPlacement} from './thumbnail-layout.mjs';

test('sleep thumbnail focal clock stays fully inside the 1280x720 canvas and on the right side',()=>{
  const p=getSleepThumbnailArtPlacement();
  const clock={left:1100,top:230,right:1720,bottom:850};
  const box={
    left:p.x+clock.left*p.scale,
    top:p.y+clock.top*p.scale,
    right:p.x+clock.right*p.scale,
    bottom:p.y+clock.bottom*p.scale,
  };
  assert.ok(box.left>=760,`clock intrudes too far into headline: ${box.left}`);
  assert.ok(box.right<=1280,`clock clipped on right: ${box.right}`);
  assert.ok(box.top>=0,`clock clipped on top: ${box.top}`);
  assert.ok(box.bottom<=720,`clock clipped on bottom: ${box.bottom}`);
});
