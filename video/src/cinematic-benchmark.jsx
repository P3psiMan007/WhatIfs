import React from 'react';
import {AbsoluteFill,Img,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

export const APPROVED_BENCHMARK_VOICE='en-US-BrianNeural';
export const WhatIfCinematicBenchmark=()=>{
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const palette={bg:'#090c12',fg:'#f0eee8',accent:'#ffb340'};
  const shots=[
    {start:0,end:5.7,url:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:c07e6450-2b34-49ec-aec7-9499bd2094be',from:1.03,to:1.09,x0:-12,x1:10},
    {start:5.2,end:12.4,url:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:63246ed7-bf56-46ce-931b-48c800b3a661',from:1.02,to:1.08,x0:8,x1:-10},
    {start:11.9,end:19.4,url:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:722cf062-0d56-4e4c-ab85-43e13e4a6cd5',from:1.025,to:1.105,x0:-8,x1:8},
    {start:18.9,end:26,url:'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:87d19717-40f8-42e7-8feb-aa1baf7242cb',from:1.02,to:1.075,x0:6,x1:-6},
  ];
  const t=frame/fps;
  const captions=[
    [0,4.2,'Tonight, you go to bed for the last time.'],
    [4.2,7.3,'Not because something is wrong.'],
    [7.3,13.8,'Tomorrow, every human wakes up and discovers that sleep is simply unnecessary.'],
    [13.8,16.0,'No fatigue.'],
    [16.0,18.0,'No brain fog.'],
    [18.0,20.8,'No hidden health cost.'],
    [20.8,26,'You just gained roughly eight extra hours every day.'],
  ];
  const cue=captions.find(([s,e])=>t>=s&&t<e);
  const calloutOpacity=interpolate(frame,[14.7*fps,15.1*fps,20.2*fps,20.7*fps],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill style={{backgroundColor:palette.bg,overflow:'hidden',fontFamily:'Arial, Helvetica, sans-serif'}}>
    {shots.map((shot,index)=>{
      if(t<shot.start||t>=shot.end)return null;
      const local=(t-shot.start)/(shot.end-shot.start);
      const fadeIn=index===0?1:interpolate(local,[0,.10],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      const fadeOut=index===shots.length-1?1:interpolate(local,[.90,1],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      const scale=interpolate(local,[0,1],[shot.from,shot.to]);
      const x=interpolate(local,[0,1],[shot.x0,shot.x1]);
      return <AbsoluteFill key={shot.url} style={{opacity:Math.min(fadeIn,fadeOut)}}>
        <Img src={shot.url} style={{width:'100%',height:'100%',objectFit:'cover',transform:`translateX(${x}px) scale(${scale})`,filter:'saturate(.92) contrast(1.04)'}}/>
      </AbsoluteFill>;
    })}
    <AbsoluteFill style={{background:'linear-gradient(180deg, rgba(5,8,14,.05) 45%, rgba(5,8,14,.60) 100%)'}}/>
    <AbsoluteFill style={{boxShadow:'inset 0 0 190px rgba(0,0,0,.46)'}}/>
    <div style={{position:'absolute',left:115,bottom:220,opacity:calloutOpacity,fontSize:88,fontWeight:800,letterSpacing:-3,color:palette.fg,textShadow:'0 8px 30px rgba(0,0,0,.55)'}}><span style={{color:palette.accent}}>+8</span> HOURS</div>
    {cue?<div style={{position:'absolute',left:120,right:120,bottom:58,display:'flex',justifyContent:'center'}}>
      <div style={{maxWidth:1320,padding:'12px 20px',borderRadius:12,background:'rgba(5,8,14,.70)',fontSize:36,lineHeight:1.22,fontWeight:650,color:palette.fg,textAlign:'center',boxShadow:'0 10px 35px rgba(0,0,0,.25)'}}>{cue[2]}</div>
    </div>:null}
    <Audio src={staticFile('benchmark-narration.mp3')}/>
  </AbsoluteFill>;
};
