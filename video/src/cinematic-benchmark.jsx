import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {imageAssetsForScene} from './episode1-image-assets.mjs';

export const APPROVED_BENCHMARK_VOICE = 'af_heart';

export const WhatIfCinematicBenchmark = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const palette = {bg:'#090c12', fg:'#f0eee8', accent:'#ffb340'};
  const shots = [
    {start:0,end:4.4,source:imageAssetsForScene('scene-01')[0],from:1.14,to:1.26,x0:-1,x1:1},
    {start:4.4,end:10.2,source:imageAssetsForScene('scene-01')[1],from:1.28,to:1.16,x0:1,x1:-1},
    {start:10.2,end:17,source:imageAssetsForScene('scene-02')[0],from:1.16,to:1.29,x0:-1,x1:1},
    {start:17,end:24,source:imageAssetsForScene('scene-09')[0],from:1.27,to:1.17,x0:1,x1:-1},
  ];
  const t = frame / fps;
  const captions = [
    [0.05,2.5,'Tonight, you go to bed for the last time.'],
    [2.5,4.5,'Not because something is wrong.'],
    [4.5,9.7,'Tomorrow, sleep is unnecessary.'],
    [9.7,10.8,'No fatigue.'],
    [10.8,12.1,'No brain fog.'],
    [12.1,13.8,'No hidden health cost.'],
    [13.8,17.1,'You just gained roughly eight extra hours every day.'],
    [17.1,19.5,'That sounds like a superpower.'],
    [19.5,24,'But within a few years, those eight hours might stop belonging to you.'],
  ];
  const cue = captions.find(([start,end]) => t >= start && t < end);
  const calloutOpacity = interpolate(frame,[13.5*fps,13.9*fps,16.6*fps,17*fps],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill style={{backgroundColor:palette.bg,overflow:'hidden',fontFamily:'Arial, Helvetica, sans-serif'}}>
    {shots.map((shot) => {
      if (t < shot.start || t >= shot.end) return null;
      const local = (t - shot.start) / (shot.end - shot.start);
      const scale = interpolate(local,[0,1],[shot.from,shot.to]);
      const x = interpolate(local,[0,1],[shot.x0,shot.x1]);
      return <AbsoluteFill key={shot.source}>
        <Img src={staticFile(shot.source)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`translateX(${x}%) scale(${scale})`,filter:'saturate(.92) contrast(1.05) brightness(.93)'}}/>
      </AbsoluteFill>;
    })}
    <AbsoluteFill style={{background:'linear-gradient(180deg, rgba(5,8,14,.05) 45%, rgba(5,8,14,.60) 100%)'}}/>
    <AbsoluteFill style={{boxShadow:'inset 0 0 190px rgba(0,0,0,.46)'}}/>
    <div style={{position:'absolute',left:115,bottom:220,opacity:calloutOpacity,fontSize:88,fontWeight:800,letterSpacing:-3,color:palette.fg,textShadow:'0 8px 30px rgba(0,0,0,.55)'}}><span style={{color:palette.accent}}>+8</span> HOURS</div>
    {cue ? <div style={{position:'absolute',left:120,right:120,bottom:58,display:'flex',justifyContent:'center'}}>
      <div style={{maxWidth:1320,padding:'12px 20px',borderRadius:12,background:'rgba(5,8,14,.70)',fontSize:36,lineHeight:1.22,fontWeight:650,color:palette.fg,textAlign:'center',boxShadow:'0 10px 35px rgba(0,0,0,.25)'}}>{cue[2]}</div>
    </div> : null}
    <Audio src={staticFile('benchmark-narration.mp3')}/>
  </AbsoluteFill>;
};
