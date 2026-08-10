import React from 'react';
import {AbsoluteFill,Sequence,useVideoConfig} from 'remotion';
import {DoodleExplainerScenePlus} from './doodle-explainer-plus.jsx';

const palette={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};

const proofBeats=[
  {id:'single-character',visualType:'body',callout:'SINGLE ACTION',text:'One person reacts as the stakes become personal.'},
  {id:'two-character',visualType:'compare',callout:'TWO PEOPLE',text:'Two people face the same change differently.'},
  {id:'character-prop',visualType:'work',callout:'PERSON + PROP',text:'A worker points to a system filling up with tasks.'},
  {id:'environment',visualType:'city',callout:'WORLD SCENE',text:'The consequence spreads across an entire city.'},
  {id:'diagram',visualType:'brain',callout:'DIAGRAM',text:'A process inside the brain becomes the explanation.'},
  {id:'comparison',visualType:'compare',callout:'COMPARISON',text:'The old world and the new world split apart.'},
  {id:'timeline',visualType:'timeline',callout:'TIMELINE',text:'First this happens, then the system shifts, then it scales, then the payoff lands.'},
  {id:'map',visualType:'map',callout:'MAP / ROUTE',text:'The effect crosses countries and moves around the world.'},
  {id:'stat',visualType:'stat',callout:'47%',text:'A number becomes the visual focus without turning into a text slide.'},
  {id:'transformation',visualType:'metaphor',callout:'TRANSFORM',text:'One simple idea spreads into a larger system.'},
];

export const WhatIfDoodleRendererProof=()=>{
  const {fps}=useVideoConfig();
  const secondsPerBeat=3;
  const beatFrames=secondsPerBeat*fps;
  return <AbsoluteFill style={{backgroundColor:palette.background}}>
    {proofBeats.map((beat,index)=><Sequence key={beat.id} from={index*beatFrames} durationInFrames={beatFrames} premountFor={15}>
      <DoodleExplainerScenePlus beat={{...beat,layout:index}} durationInFrames={beatFrames} palette={palette}/>
    </Sequence>)}
  </AbsoluteFill>;
};

export const DOODLE_PROOF_BEATS=proofBeats;
