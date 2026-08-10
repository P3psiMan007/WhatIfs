import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySolarStormVisual} from './solar-storm-visual-classifier.mjs';

test('routes representative solar storm beats to distinct visual classes',()=>{
  const cases=[
    ['Green and red auroras spread across the sky','aurora-city'],
    ['The Sun throws out a coronal mass ejection, or CME','sun-earth'],
    ['Low Earth orbit satellites face atmospheric drag','satellite-orbit'],
    ['GPS positions drift as the ionosphere changes','gps-ionosphere'],
    ['Geomagnetically induced currents stress transformers','grid-current'],
    ['Your phone does not instantly explode','device-myth'],
    ['Data centers, water systems and card payments depend on power','dependency-stack'],
    ['NASA and NOAA watch the Sun and issue warnings','monitoring'],
    ['A Nature study challenged the apparent ceiling','research-graph'],
    ['The sky becomes a stress test for the world underneath it','aurora-grid-payoff'],
  ];
  for(const [text,expected] of cases) assert.equal(classifySolarStormVisual({text}),expected,text);
});

test('beat semantics override a broad aurora section heading',()=>{
  const heading='THE BEAUTIFUL WARNING';
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'Satellite operators start getting warnings.'}),'satellite-orbit');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'Power-grid control rooms see currents appearing in lines.'}),'grid-current');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'GPS positions begin to drift.'}),'gps-ionosphere');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'The problem left the Sun hours ago.'}),'sun-earth');
});

test('unknown solar-storm narration falls back to the Sun-Earth causal frame instead of a generic card',()=>{
  assert.equal(classifySolarStormVisual({text:'A consequence we have not classified yet'}),'sun-earth');
});
