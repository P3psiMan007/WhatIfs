import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import {DoodleExplainerScenePlus,classifyDoodleVisualPlus} from './doodle-explainer-plus.jsx';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const DEFAULT={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
const Line=({x1,y1,x2,y2,color,width=8,opacity=1,dash})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} strokeDasharray={dash}/>;

const Person=({x,y,look='right',palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent; const flip=look==='left'?-1:1; const bob=Math.sin(progress*Math.PI*2)*3;
  return <g transform={`translate(${x} ${y})`}>
    <circle cx={0} cy={-145+bob} r={43} fill="none" stroke={fg} strokeWidth={8}/>
    <circle cx={16*flip} cy={-153+bob} r={5} fill={a}/>
    <Line x1={0} y1={-98+bob} x2={0} y2={42} color={fg}/>
    <Line x1={0} y1={-52} x2={78*flip} y2={-20} color={fg}/>
    <Line x1={0} y1={-52} x2={-52*flip} y2={-15} color={fg}/>
    <Line x1={0} y1={42} x2={-40} y2={145} color={fg}/><Line x1={0} y1={42} x2={40} y2={145} color={fg}/>
  </g>;
};

const PeopleScene=({beat,durationInFrames,palette=DEFAULT})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const frames=Math.max(1,durationInFrames||90);
  const p=Math.max(0,Math.min(1,frame/Math.max(1,frames-1))); const enter=spring({fps,frame,config:{damping:18,stiffness:105,mass:.8}});
  const handoff=interpolate(p,[.15,.8],[0,1],clamp); const objectX=760+400*handoff;
  return <AbsoluteFill data-visual-owner="doodle-explainer-v1" style={{backgroundColor:palette.background,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(80% 72% at 50% 48%,rgba(255,255,255,.032),transparent 72%)'}}/>
    <AbsoluteFill style={{opacity:.03,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.8) .7px, transparent .9px)',backgroundSize:'14px 14px'}}/>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <Line x1={220} y1={820} x2={1700} y2={820} color={palette.foreground} width={6} opacity={.24}/>
      <Person x={610} y={650} look="right" palette={palette} progress={enter}/>
      <Person x={1310} y={650} look="left" palette={palette} progress={enter}/>
      <rect x={objectX-42} y={490} width={84} height={84} rx={18} fill={palette.accent} opacity={enter}/>
      <path d="M760 430 C900 330 1040 330 1180 430" fill="none" stroke={palette.foreground} strokeWidth={7} strokeLinecap="round" strokeDasharray="14 15" opacity={.35}/>
      <circle cx={960} cy={365} r={48} fill="none" stroke={palette.accent} strokeWidth={8} opacity={.75}/>
      <path d="M940 365 L955 382 L984 346" fill="none" stroke={palette.accent} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {beat.callout?<div style={{position:'absolute',left:90,top:72,fontFamily:'Arial, Helvetica, sans-serif',fontSize:28,fontWeight:900,letterSpacing:4,color:palette.accent,textTransform:'uppercase'}}>{beat.callout}</div>:null}
  </AbsoluteFill>;
};

const classifyPro=(beat={})=>{
  const t=`${beat.text||''} ${beat.sceneHeadline||''}`.toLowerCase();
  if (/(together|conversation|talk|team|handoff|share|two people|between people|meet)/.test(t)) return 'people';
  return classifyDoodleVisualPlus(beat);
};

export const DoodleExplainerScenePro=({beat,durationInFrames,palette=DEFAULT})=>{
  const kind=beat.visualType||classifyPro(beat);
  if(kind==='people') return <PeopleScene beat={beat} durationInFrames={durationInFrames} palette={palette}/>;
  return <DoodleExplainerScenePlus beat={{...beat,visualType:kind}} durationInFrames={durationInFrames} palette={palette}/>;
};

export {classifyPro as classifyDoodleVisualPro};
