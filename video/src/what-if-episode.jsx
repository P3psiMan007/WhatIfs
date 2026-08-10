import React from 'react';
import {AbsoluteFill,Sequence,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {SleepThumbnailArt} from './sleep-scenes.jsx';
import {CinematicEpisodeScene} from './cinematic-full-episode.jsx';
import {DoodleExplainerScenePlus} from './doodle-explainer-plus.jsx';
import {getSleepThumbnailArtPlacement} from './thumbnail-layout.mjs';
import {buildContinuousBeatFrames} from './visual-timeline.mjs';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const font='Arial, Helvetica, sans-serif';

const Captions=({captions,palette})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const t=frame/fps;
  const cue=(captions||[]).find((c)=>t>=Number(c.start)&&t<Number(c.end));
  if(!cue)return null;
  const cueFrame=Math.max(0,frame-Math.floor(Number(cue.start)*fps));
  const opacity=interpolate(cueFrame,[0,4],[0,1],clamp);
  return <div style={{position:'absolute',left:150,right:150,bottom:38,display:'flex',justifyContent:'center',pointerEvents:'none',opacity,zIndex:50}}>
    <div style={{maxWidth:1320,fontFamily:font,fontSize:34,lineHeight:1.2,fontWeight:700,color:palette.foreground,textAlign:'center',background:'rgba(5,8,14,.70)',borderRadius:12,padding:'11px 20px 12px',boxShadow:'0 10px 35px rgba(0,0,0,.30)',textShadow:'0 3px 12px rgba(0,0,0,.7)'}}>{cue.text}</div>
  </div>;
};

function withLocalBeatOrdinals(beats){
  const counts={};
  return (beats||[]).map((beat)=>{
    const sceneId=beat?.sceneId||'unknown';
    counts[sceneId]=(counts[sceneId]||0)+1;
    return {...beat,localBeatOrdinal:counts[sceneId]};
  });
}

const EpisodeLayers=({props,palette,beats,useDoodle,fps})=><>
  <AbsoluteFill style={{background:'radial-gradient(90% 75% at 50% 42%,#10151e 0%,#090c12 76%)'}}/>
  {beats.map((beat)=>{
    const from=beat.from;
    const durationInFrames=beat.durationInFrames;
    return <Sequence key={beat.id} from={from} durationInFrames={durationInFrames} premountFor={Math.min(durationInFrames,Math.round(.6*fps))}>
      {useDoodle
        ? <DoodleExplainerScenePlus beat={beat} durationInFrames={durationInFrames} palette={palette}/>
        : <CinematicEpisodeScene beat={beat} beatOrdinal={beat.localBeatOrdinal} durationInFrames={durationInFrames} palette={palette}/>
      }
    </Sequence>;
  })}
  {props.audio?<Audio src={staticFile(props.audio)}/>:null}
  <Captions captions={props.captions||[]} palette={palette}/>
</>;

export const WhatIfEpisode=(props)=>{
  const {fps}=useVideoConfig();
  const palette=props.palette||{background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
  const visualSystem=props.visualSystem||'cinematic-image-first-v5';
  const useDoodle=visualSystem==='doodle-explainer-v1'||visualSystem==='doodle-explainer-v2';
  const beats=withLocalBeatOrdinals(buildContinuousBeatFrames(props.beats||[],fps,props.durationSeconds||0));
  if(useDoodle){
    return <AbsoluteFill data-visual-owner="doodle-explainer-v1" style={{backgroundColor:'#090c12',overflow:'hidden'}}>
      <EpisodeLayers props={props} palette={palette} beats={beats} useDoodle={true} fps={fps}/>
    </AbsoluteFill>;
  }
  return <AbsoluteFill data-visual-owner="cinematic-single" style={{backgroundColor:'#090c12',overflow:'hidden'}}>
    <EpisodeLayers props={props} palette={palette} beats={beats} useDoodle={false} fps={fps}/>
  </AbsoluteFill>;
};

export const WhatIfThumbnail=(props)=>{
  const palette=props.palette||{background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
  const placement=getSleepThumbnailArtPlacement();
  return <AbsoluteFill style={{backgroundColor:palette.background,overflow:'hidden',fontFamily:font}}>
    <div style={{position:'absolute',inset:-100,background:'radial-gradient(circle at 77% 48%, rgba(255,179,64,.20), transparent 34%), radial-gradient(circle at 30% 68%, rgba(234,231,225,.055), transparent 31%)'}}/>
    <div style={{position:'absolute',inset:0,opacity:.055,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.9) .7px, transparent .9px)',backgroundSize:'12px 12px'}}/>
    <div style={{position:'absolute',left:56,top:46,fontSize:18,fontWeight:900,letterSpacing:5,color:palette.accent}}>WHAT IF EXPLAINS</div>
    <div style={{position:'absolute',left:58,top:142,width:650,fontSize:108,lineHeight:.86,letterSpacing:-5,fontWeight:900,color:palette.foreground,textTransform:'uppercase',zIndex:3}}>8 HOURS<br/><span style={{color:palette.accent}}>BACK</span></div>
    <div style={{position:'absolute',left:62,bottom:62,width:510,height:8,borderRadius:99,background:palette.accent,zIndex:3}}/>
    <div style={{position:'absolute',left:0,top:0,width:1920,height:1080,transform:`translate(${placement.x}px, ${placement.y}px) scale(${placement.scale})`,transformOrigin:'top left'}}><SleepThumbnailArt palette={palette}/></div>
  </AbsoluteFill>;
};
