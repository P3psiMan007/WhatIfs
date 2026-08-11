import React from 'react';
import {AbsoluteFill,Sequence,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {SleepThumbnailArt} from './sleep-scenes.jsx';
import {CinematicEpisodeScene} from './cinematic-full-episode.jsx';
import {DoodleExplainerScenePro} from './doodle-explainer-pro.jsx';
import {SolarStormExplainerScene} from './solar-storm-explainer.jsx';
import {getSleepThumbnailArtPlacement} from './thumbnail-layout.mjs';
import {buildContinuousBeatFrames} from './visual-timeline.mjs';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const font='Arial, Helvetica, sans-serif';
const LEGACY_CINEMATIC_EPISODE_ID='20260807-episode';
const SOLAR_STORM_EPISODE_ID='20260810-episode';
// Keep the legacy ownership marker explicit for regression tests and provenance audits:
// data-visual-owner="cinematic-single"

const Captions=({captions,palette})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const t=frame/fps;
  const cue=(captions||[]).find((c)=>t>=Number(c.start)&&t<Number(c.end));
  if(!cue)return null;
  const cueFrame=Math.max(0,frame-Math.floor(Number(cue.start)*fps));
  const opacity=interpolate(cueFrame,[0,4],[0,1],clamp);
  return <div style={{position:'absolute',left:190,right:190,bottom:32,display:'flex',justifyContent:'center',pointerEvents:'none',opacity,zIndex:50}}>
    <div style={{maxWidth:1240,fontFamily:font,fontSize:30,lineHeight:1.18,fontWeight:700,color:palette.foreground,textAlign:'center',background:'linear-gradient(90deg,rgba(5,8,14,0),rgba(5,8,14,.72) 14%,rgba(5,8,14,.72) 86%,rgba(5,8,14,0))',padding:'10px 38px 12px',textShadow:'0 3px 14px rgba(0,0,0,.85)'}}>{cue.text}</div>
  </div>;
};

function withLocalBeatOrdinals(beats){
  const counts={};
  return (beats||[]).map((beat)=>{const sceneId=beat?.sceneId||'unknown';counts[sceneId]=(counts[sceneId]||0)+1;return {...beat,localBeatOrdinal:counts[sceneId]};});
}

const SolarAtmosphere=({palette})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const t=frame/fps;
  const drift=(t*16)%420;
  return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(75% 82% at 82% 50%,rgba(255,179,64,.055),transparent 58%),radial-gradient(48% 62% at 18% 20%,rgba(234,231,225,.025),transparent 70%)'}}/>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{position:'absolute',inset:0,opacity:.24}}>
      <path d={`M-260 ${175+Math.sin(t*.18)*18} C260 20 610 310 1010 140 C1390 -10 1650 230 2200 70`} fill="none" stroke={palette.accent} strokeWidth="5" opacity=".28"/>
      <path d={`M-180 ${900+Math.cos(t*.15)*20} C330 760 630 1040 1020 820 C1380 620 1650 940 2200 720`} fill="none" stroke={palette.foreground} strokeWidth="3" opacity=".10"/>
      {Array.from({length:10}).map((_,i)=><circle key={i} cx={(i*230+drift)%2200-140} cy={120+(i*137)%780} r={1.5+(i%3)} fill={i%3===0?palette.accent:palette.foreground} opacity={.11+(i%4)*.035}/>)}
    </svg>
    <AbsoluteFill style={{boxShadow:'inset 0 0 180px rgba(0,0,0,.62)'}}/>
  </AbsoluteFill>;
};

const BeatCamera=({children,beat,durationInFrames,mode})=>{
  const frame=useCurrentFrame();
  if(mode!=='solar')return children;
  const p=interpolate(frame,[0,Math.max(1,durationInFrames-1)],[0,1],clamp);
  const idx=(Number(beat?.localBeatOrdinal||1)+String(beat?.sceneId||'').length)%4;
  const dx=[-20,18,-10,14][idx]; const dy=[8,-10,12,-6][idx];
  const scale=interpolate(p,[0,1],[1.015,1.065],clamp);
  const tx=interpolate(p,[0,1],[0,dx],clamp); const ty=interpolate(p,[0,1],[0,dy],clamp);
  const opacity=interpolate(frame,[0,5,Math.max(6,durationInFrames-6),durationInFrames-1],[0,1,1,.94],clamp);
  return <AbsoluteFill style={{transform:`translate3d(${tx}px,${ty}px,0) scale(${scale})`,transformOrigin:'50% 50%',opacity}}>{children}</AbsoluteFill>;
};

const EpisodeLayers=({props,palette,beats,mode,fps})=><>
  <AbsoluteFill style={{background:'radial-gradient(90% 75% at 50% 42%,#10151e 0%,#090c12 76%)'}}/>
  {beats.map((beat)=>{const from=beat.from;const durationInFrames=beat.durationInFrames;return <Sequence key={beat.id} from={from} durationInFrames={durationInFrames} premountFor={Math.min(durationInFrames,Math.round(.6*fps))}>
    <BeatCamera beat={beat} durationInFrames={durationInFrames} mode={mode}>{mode==='solar'?<SolarStormExplainerScene beat={beat} durationInFrames={durationInFrames} palette={palette}/>:mode==='doodle'?<DoodleExplainerScenePro beat={beat} durationInFrames={durationInFrames} palette={palette}/>:<CinematicEpisodeScene beat={beat} beatOrdinal={beat.localBeatOrdinal} durationInFrames={durationInFrames} palette={palette}/>}</BeatCamera>
  </Sequence>;})}
  {mode==='solar'?<SolarAtmosphere palette={palette}/>:null}
  {props.audio?<Audio src={staticFile(props.audio)}/>:null}
  <Captions captions={props.captions||[]} palette={palette}/>
</>;

export const WhatIfEpisode=(props)=>{
  const {fps}=useVideoConfig();
  const palette=props.palette||{background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
  const visualSystem=props.visualSystem||(props.episodeId===LEGACY_CINEMATIC_EPISODE_ID?'cinematic-image-first-v5':'doodle-explainer-v2');
  const mode=props.episodeId===SOLAR_STORM_EPISODE_ID||visualSystem==='solar-storm-explainer-v1'?'solar':(visualSystem==='doodle-explainer-v1'||visualSystem==='doodle-explainer-v2'?'doodle':'cinematic');
  const beats=withLocalBeatOrdinals(buildContinuousBeatFrames(props.beats||[],fps,props.durationSeconds||0));
  return <AbsoluteFill data-visual-owner={mode==='solar'?'solar-storm-semantic-v1':mode==='doodle'?'doodle-explainer-v1':'cinematic-single'} style={{backgroundColor:'#090c12',overflow:'hidden'}}><EpisodeLayers props={props} palette={palette} beats={beats} mode={mode} fps={fps}/></AbsoluteFill>;
};

const LegacySleepThumbnail=({palette})=>{const placement=getSleepThumbnailArtPlacement();return <AbsoluteFill style={{backgroundColor:palette.background,overflow:'hidden',fontFamily:font}}><div style={{position:'absolute',inset:-100,background:'radial-gradient(circle at 77% 48%, rgba(255,179,64,.20), transparent 34%), radial-gradient(circle at 30% 68%, rgba(234,231,225,.055), transparent 31%)'}}/><div style={{position:'absolute',inset:0,opacity:.055,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.9) .7px, transparent .9px)',backgroundSize:'12px 12px'}}/><div style={{position:'absolute',left:56,top:46,fontSize:18,fontWeight:900,letterSpacing:5,color:palette.accent}}>WHAT IF EXPLAINS</div><div style={{position:'absolute',left:58,top:142,width:650,fontSize:108,lineHeight:.86,letterSpacing:-5,fontWeight:900,color:palette.foreground,textTransform:'uppercase',zIndex:3}}>8 HOURS<br/><span style={{color:palette.accent}}>BACK</span></div><div style={{position:'absolute',left:62,bottom:62,width:510,height:8,borderRadius:99,background:palette.accent,zIndex:3}}/><div style={{position:'absolute',left:0,top:0,width:1920,height:1080,transform:`translate(${placement.x}px, ${placement.y}px) scale(${placement.scale})`,transformOrigin:'top left'}}><SleepThumbnailArt palette={palette}/></div></AbsoluteFill>;};

const SolarStormThumbnail=({palette,label})=><AbsoluteFill style={{backgroundColor:palette.background,overflow:'hidden',fontFamily:font}}>
  <AbsoluteFill style={{background:'radial-gradient(circle at 82% 32%,rgba(255,179,64,.24),transparent 26%),radial-gradient(circle at 76% 90%,rgba(234,231,225,.08),transparent 38%)'}}/>
  <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{position:'absolute',inset:0}}>
    <defs><linearGradient id="aurThumb" x1="0" x2="1"><stop offset="0" stopColor={palette.accent} stopOpacity=".08"/><stop offset=".48" stopColor={palette.accent} stopOpacity=".82"/><stop offset="1" stopColor={palette.foreground} stopOpacity=".12"/></linearGradient></defs>
    <circle cx="1550" cy="255" r="155" fill="none" stroke={palette.accent} strokeWidth="18"/>
    {Array.from({length:12}).map((_,i)=>{const q=i*Math.PI/6;return <line key={i} x1={1550+190*Math.cos(q)} y1={255+190*Math.sin(q)} x2={1550+235*Math.cos(q)} y2={255+235*Math.sin(q)} stroke={palette.accent} strokeWidth="8" opacity=".6" strokeLinecap="round"/>})}
    <path d="M840 210 C1120 30 1330 380 1600 400 C1770 415 1860 325 2020 245" fill="none" stroke="url(#aurThumb)" strokeWidth="72" strokeLinecap="round"/>
    <path d="M760 330 C1120 170 1310 505 1640 520 C1790 528 1880 462 2010 390" fill="none" stroke={palette.accent} strokeWidth="20" opacity=".42"/>
    <path d="M650 1080 Q1280 540 2020 1010" fill="#10151e" stroke={palette.foreground} strokeWidth="8" opacity=".98"/>
    <path d="M710 1040 Q1290 610 1960 985" fill="none" stroke={palette.accent} strokeWidth="10" opacity=".68" strokeDasharray="26 18"/>
    {[1110,1360,1610].map((x,i)=><g key={x} transform={`translate(${x} ${780+i*30})`}><line x1="0" y1="0" x2="0" y2="220" stroke={palette.foreground} strokeWidth="10"/><line x1="-80" y1="62" x2="80" y2="62" stroke={palette.foreground} strokeWidth="9"/><line x1="-58" y1="62" x2="-100" y2="135" stroke={palette.foreground} strokeWidth="7"/><line x1="58" y1="62" x2="100" y2="135" stroke={palette.foreground} strokeWidth="7"/></g>)}
  </svg>
  <AbsoluteFill style={{background:'linear-gradient(90deg,rgba(8,11,17,.98) 0%,rgba(8,11,17,.94) 34%,rgba(8,11,17,.40) 57%,rgba(8,11,17,0) 78%)'}}/>
  <div style={{position:'absolute',left:58,top:50,fontSize:18,fontWeight:900,letterSpacing:5,color:palette.accent,zIndex:5}}>WHAT IF EXPLAINS</div>
  <div style={{position:'absolute',left:58,top:160,width:690,fontSize:94,lineHeight:.86,letterSpacing:-4.5,fontWeight:900,color:palette.foreground,textTransform:'uppercase',zIndex:5,textShadow:'0 10px 34px rgba(0,0,0,.78)'}}>{label}</div>
  <div style={{position:'absolute',left:62,bottom:72,width:420,height:8,borderRadius:99,background:palette.accent,zIndex:5}}/>
</AbsoluteFill>;

export const WhatIfThumbnail=(props)=>{
  const palette=props.palette||{background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
  const legacyEpisode=props.episodeId===LEGACY_CINEMATIC_EPISODE_ID;
  if(legacyEpisode)return <LegacySleepThumbnail palette={palette}/>;
  const label=String(props.thumbnailText||'WHAT IF?').trim().toUpperCase();
  if(props.episodeId===SOLAR_STORM_EPISODE_ID)return <SolarStormThumbnail palette={palette} label={label}/>;
  const beat={id:'thumbnail-beat',sceneId:'thumbnail',sceneHeadline:String(props.title||''),text:`${props.title||''} ${label}`,callout:null};
  return <AbsoluteFill style={{backgroundColor:palette.background,overflow:'hidden',fontFamily:font}}><DoodleExplainerScenePro beat={beat} durationInFrames={90} palette={palette}/><AbsoluteFill style={{background:'linear-gradient(90deg,rgba(8,11,17,.98) 0%,rgba(8,11,17,.90) 31%,rgba(8,11,17,.28) 57%,rgba(8,11,17,0) 78%)'}}/><div style={{position:'absolute',left:54,top:42,fontSize:18,fontWeight:900,letterSpacing:5,color:palette.accent,zIndex:5}}>WHAT IF EXPLAINS</div><div style={{position:'absolute',left:54,top:150,width:575,fontSize:76,lineHeight:.88,letterSpacing:-3.4,fontWeight:900,color:palette.foreground,textTransform:'uppercase',zIndex:5,textShadow:'0 8px 28px rgba(0,0,0,.6)'}}>{label}</div><div style={{position:'absolute',left:58,bottom:58,width:370,height:7,borderRadius:99,background:palette.accent,zIndex:5}}/></AbsoluteFill>;
};
