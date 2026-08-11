import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySolarStormVisual} from './solar-storm-visual-classifier.mjs';

test('routes representative solar storm beats to distinct visual classes',()=>{
  const cases=[
    ['Green and red auroras spread across the sky','aurora-city'],
    ['A powerful solar flare releases electromagnetic radiation','flare-wave'],
    ['The Sun throws out a coronal mass ejection, or CME','cme-wave'],
    ['Earth meets the incoming cloud with its magnetic shield','magnetosphere-shield'],
    ['Low Earth orbit satellites face atmospheric drag','satellite-orbit'],
    ['GPS positions drift as the ionosphere changes','gps-ionosphere'],
    ['A changing magnetic field can induce an electric field','induction-circuit'],
    ['Power-grid control rooms see currents appearing in lines','grid-current'],
    ['The 1859 Carrington Event disrupted telegraph systems','history-grid'],
    ['Your phone does not instantly explode','device-myth'],
    ['Data centers, water systems and card payments depend on power','dependency-stack'],
    ['One city might have power while another has rolling outages','outage-map'],
    ['NASA and NOAA watch the Sun and issue warnings','monitoring'],
    ['Warning turns a surprise into an engineering problem','warning-timeline'],
    ['A Nature study challenged the apparent ceiling','research-graph'],
    ['The sky becomes a stress test for the world underneath it','aurora-grid-payoff'],
  ];
  for(const [text,expected] of cases) assert.equal(classifySolarStormVisual({text}),expected,text);
});

test('beat semantics override broad section headings',()=>{
  const heading='THE BEAUTIFUL WARNING';
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'Satellite operators start getting warnings.'}),'satellite-orbit');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'Power-grid control rooms see currents appearing in lines.'}),'grid-current');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'GPS positions begin to drift.'}),'gps-ionosphere');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'The problem left the Sun hours ago.'}),'sun-earth');
});

test('section headings provide useful varied fallbacks without generic cards',()=>{
  assert.equal(classifySolarStormVisual({sceneHeadline:'TWO DIFFERENT ATTACKS FROM THE SAME ERUPTION',text:'Now compare the two.'}),'flare-cme-split');
  assert.equal(classifySolarStormVisual({sceneHeadline:'THE EARTH BECOMES PART OF THE CIRCUIT',text:'Now the mechanism matters.'}),'grid-current');
  assert.equal(classifySolarStormVisual({sceneHeadline:'THE SECOND-ORDER FAILURES ARE THE REAL STORY',text:'The disruption is uneven.'}),'outage-map');
  assert.equal(classifySolarStormVisual({text:'A consequence we have not classified yet'}),'sun-earth');
});

test('payoff heading forces a visual snapback instead of ending on GPS or grid diagrams',()=>{
  const heading='THE PAYOFF';
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'A sky glowing in places that almost never see aurora.'}),'aurora-grid-payoff');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'Navigation systems could lose precision and grid operators would watch invisible currents.'}),'dependency-stack');
  assert.equal(classifySolarStormVisual({sceneHeadline:heading,text:'Sometimes the most beautiful thing in the sky is also a stress test for the world underneath it.'}),'aurora-grid-payoff');
});
