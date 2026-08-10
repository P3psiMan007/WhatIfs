import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import {DoodleExplainerScene,classifyDoodleVisual} from './doodle-explainer.jsx';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const DEFAULT={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};

const classifyExtended=(beat={})=>{
  const t=`${beat.text||''} ${beat.sceneHeadline||''}`.toLowerCase();
  if (/(timeline|history|century|decade|before|after|first|then|finally|sequence|stage)/.test(t)) return 'timeline';
  if (/(map|country|countries|border|route|continent|region|across the world|global|location)/.test(t)) return 'map';
  return classifyDoodleVisual(beat);
};

const Timeline=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const reveal=interpolate(progress,[0,1],[0,1],clamp);
  const nodes=[360,760,1160,1560];
  const labels=['START','SHIFT','SCALE','PAYOFF'];
  return <g>
    <line x1={250} y1={560} x2={250+(1420*reveal)} y2={560} stroke={fg} strokeWidth={9} strokeLinecap="round"/>
    {nodes.map((x,i)=>{
      const on=Math.max(0,Math.min(1,(progress-i*.12)*1.9));
      return <g key={x} opacity={on} transform={`translate(0 ${18*(1-on)})`}>
        <circle cx={x} cy={560} r={24} fill={i===3?a:DEFAULT.background} stroke={i===3?a:fg} strokeWidth={8}/>
        <line x1={x} y1={520} x2={x} y2={420+(i%2)*50} stroke={fg} strokeWidth={6} strokeLinecap="round" opacity={.65}/>
        <text x={x} y={370+(i%2)*50} textAnchor="middle" fill={i===3?a:fg} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="34" letterSpacing="2">{labels[i]}</text>
      </g>;
    })}
  </g>;
};

const MapScene=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const dash=interpolate(progress,[0,1],[520,0],clamp);
  const pulse=1+Math.sin(progress*Math.PI*4)*.12;
  return <g>
    <path d="M360 470 C410 350 550 300 655 345 C735 380 738 462 670 500 C610 535 540 520 500 592 C452 675 352 625 338 555 C330 520 337 493 360 470Z" fill="none" stroke={fg} strokeWidth={9}/>
    <path d="M860 340 C970 270 1120 300 1182 370 C1245 442 1190 505 1120 510 C1062 515 1038 570 1078 630 C1118 690 1055 748 965 710 C890 678 868 605 900 552 C932 500 842 462 820 414 C805 382 820 360 860 340Z" fill="none" stroke={fg} strokeWidth={9}/>
    <path d="M1320 470 C1410 410 1540 448 1570 540 C1592 610 1530 665 1462 648 C1405 635 1388 575 1328 565 C1285 558 1276 500 1320 470Z" fill="none" stroke={fg} strokeWidth={9}/>
    <path d="M515 520 C760 420 1030 402 1450 550" fill="none" stroke={a} strokeWidth={10} strokeLinecap="round" strokeDasharray="18 16" strokeDashoffset={dash}/>
    {[{x:515,y:520},{x:1450,y:550}].map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y}) scale(${i===1?pulse:1})`}><circle r={25} fill={a}/><circle r={52} fill="none" stroke={a} strokeWidth={6} opacity={.28}/></g>)}
  </g>;
};

const ExtendedScene=({beat,durationInFrames,palette=DEFAULT,kind})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  const frames=Math.max(1,durationInFrames||Math.round(3*fps));
  const p=Math.max(0,Math.min(1,frame/Math.max(1,frames-1)));
  const enter=spring({fps,frame,config:{damping:18,stiffness:105,mass:.8}});
  const drift=interpolate(p,[0,1],[-10,12],clamp);
  return <AbsoluteFill data-visual-owner="doodle-explainer-v1" style={{backgroundColor:palette.background,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(75% 70% at 50% 48%,rgba(255,255,255,.026),transparent 72%)'}}/>
    <AbsoluteFill style={{opacity:.035,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.85) .7px, transparent .9px)',backgroundSize:'14px 14px'}}/>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{transform:`translateX(${drift}px) scale(1.035)`,transformOrigin:'50% 50%'}}>
      {kind==='timeline'?<Timeline palette={palette} progress={enter}/>:<MapScene palette={palette} progress={enter}/>} 
    </svg>
    {beat.callout?<div style={{position:'absolute',left:90,top:72,fontFamily:'Arial, Helvetica, sans-serif',fontSize:30,fontWeight:900,letterSpacing:4,color:palette.accent,textTransform:'uppercase'}}>{beat.callout}</div>:null}
  </AbsoluteFill>;
};

export const DoodleExplainerScenePlus=({beat,durationInFrames,palette=DEFAULT})=>{
  const kind=beat.visualType||classifyExtended(beat);
  if(kind==='timeline'||kind==='map') return <ExtendedScene beat={beat} durationInFrames={durationInFrames} palette={palette} kind={kind}/>;
  return <DoodleExplainerScene beat={{...beat,visualType:kind}} durationInFrames={durationInFrames} palette={palette}/>;
};

export {classifyExtended as classifyDoodleVisualPlus};
