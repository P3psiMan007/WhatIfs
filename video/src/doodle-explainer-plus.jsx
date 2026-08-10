import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import {DoodleExplainerScene,classifyDoodleVisual} from './doodle-explainer.jsx';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const DEFAULT={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
const Line=({x1,y1,x2,y2,color,width=8,opacity=1,dash})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} strokeDasharray={dash}/>;

const classifyExtended=(beat={})=>{
  const t=`${beat.text||''} ${beat.sceneHeadline||''}`.toLowerCase();
  if (/(timeline|history|century|decade|before|after|first|then|finally|sequence|stage)/.test(t)) return 'timeline';
  if (/(map|country|countries|border|route|continent|region|across the world|global|location)/.test(t)) return 'map';
  return classifyDoodleVisual(beat);
};

const Person=({x,y,scale=1,palette=DEFAULT,pose='stand',look='right',progress=1})=>{
  const fg=palette.foreground; const a=palette.accent; const flip=look==='left'?-1:1;
  const bob=Math.sin(progress*Math.PI*2)*4;
  const armX=pose==='point'?105*flip:pose==='reach'?85*flip:65*flip;
  const armY=pose==='point'?-65:pose==='reach'?-5:-25;
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle cx={0} cy={-150+bob} r={45} fill="none" stroke={fg} strokeWidth={8}/>
    <circle cx={16*flip} cy={-158+bob} r={5} fill={a}/>
    <Line x1={0} y1={-100+bob} x2={0} y2={45} color={fg}/>
    <Line x1={0} y1={-54} x2={armX} y2={armY} color={fg}/>
    <Line x1={0} y1={-54} x2={-58*flip} y2={-18} color={fg}/>
    <Line x1={0} y1={45} x2={-42} y2={150} color={fg}/>
    <Line x1={0} y1={45} x2={42} y2={150} color={fg}/>
  </g>;
};

const BodyStory=({palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent;
  const travel=interpolate(progress,[0,1],[0,90],clamp);
  const pulse=34+16*Math.sin(progress*Math.PI*4);
  return <g>
    <Line x1={250} y1={820} x2={1670} y2={820} color={fg} opacity={.28} width={6}/>
    <Person x={520+travel} y={645} scale={1.05} pose="reach" palette={palette} progress={progress}/>
    <circle cx={520+travel} cy={490} r={pulse} fill="none" stroke={a} strokeWidth={8} opacity={.55}/>
    <path d="M800 575 C960 470 1140 470 1300 565" fill="none" stroke={a} strokeWidth={9} strokeLinecap="round" strokeDasharray="20 18"/>
    <rect x={1300} y={395} width={250} height={330} rx={26} fill="none" stroke={fg} strokeWidth={9}/>
    <rect x={1355} y={465} width={140} height={190} rx={18} fill="none" stroke={a} strokeWidth={8}/>
  </g>;
};

const CompareStory=({palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent;
  const grow=interpolate(progress,[0,1],[.25,1],clamp);
  return <g>
    <Line x1={960} y1={250} x2={960} y2={835} color={fg} opacity={.22} width={5}/>
    <Person x={520} y={650} scale={.92} palette={palette} progress={progress}/>
    <Person x={1390} y={620} scale={1.13} pose="point" look="left" palette={palette} progress={progress}/>
    <rect x={295} y={810} width={450} height={18} rx={9} fill={fg} opacity={.38}/>
    <rect x={1160} y={810} width={450*grow} height={18} rx={9} fill={a}/>
    <g opacity={.72}><Line x1={310} y1={370} x2={690} y2={370} color={fg} width={5}/><Line x1={1180} y1={330} x2={1580} y2={330} color={a} width={7}/></g>
    <text x={500} y={325} textAnchor="middle" fill={fg} fontFamily="Arial, Helvetica, sans-serif" fontSize="28" fontWeight="900" letterSpacing="3">BEFORE</text>
    <text x={1380} y={285} textAnchor="middle" fill={a} fontFamily="Arial, Helvetica, sans-serif" fontSize="28" fontWeight="900" letterSpacing="3">AFTER</text>
  </g>;
};

const WorkStory=({palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent;
  const shown=Math.min(7,Math.floor(progress*8));
  return <g>
    <Line x1={180} y1={840} x2={1740} y2={840} color={fg} width={6} opacity={.24}/>
    <Person x={420} y={650} scale={.96} pose="point" palette={palette} progress={progress}/>
    <rect x={760} y={335} width={570} height={330} rx={24} fill="none" stroke={fg} strokeWidth={9}/>
    <rect x={860} y={430} width={370} height={135} rx={14} fill="none" stroke={fg} strokeWidth={7}/>
    <path d="M640 520 C700 480 720 465 770 465" fill="none" stroke={a} strokeWidth={9} strokeLinecap="round" strokeDasharray="18 16"/>
    {Array.from({length:7}).map((_,i)=><rect key={i} x={785+i*120} y={735} width={78} height={78} rx={13} fill={i<shown?a:'none'} stroke={i<shown?a:fg} strokeWidth={6}/>)}
    <path d="M1325 500 C1435 500 1485 575 1535 650" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round"/>
    <path d="M1510 615 L1540 655 L1490 650" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"/>
  </g>;
};

const CityStory=({palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent; const rise=interpolate(progress,[0,1],[90,0],clamp);
  const buildings=[{x:240,w:220,h:360},{x:500,w:290,h:500},{x:830,w:210,h:315},{x:1080,w:300,h:570},{x:1420,w:230,h:420}];
  return <g transform={`translate(0 ${rise})`}>
    <Line x1={150} y1={810} x2={1770} y2={810} color={fg} width={7}/>
    <Line x1={190} y1={900} x2={1730} y2={900} color={fg} width={5} opacity={.25}/>
    {buildings.map((b,i)=><g key={i}><rect x={b.x} y={810-b.h} width={b.w} height={b.h} rx={12} fill="none" stroke={fg} strokeWidth={8}/>{Array.from({length:6}).map((_,j)=><rect key={j} x={b.x+35+(j%2)*80} y={810-b.h+55+Math.floor(j/2)*95} width={36} height={46} rx={5} fill={(i+j)%4===0?a:'none'} stroke={(i+j)%4===0?a:fg} strokeWidth={5}/>)}</g>)}
    {[0,1,2].map(i=><circle key={i} cx={450+i*430+interpolate(progress,[0,1],[-120,130],clamp)} cy={862} r={12} fill={i===1?a:fg} opacity={.8}/>) }
  </g>;
};

const BrainProcess=({palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent;
  const shift=interpolate(progress,[0,1],[0,1],clamp);
  return <g>
    <g transform="translate(620 530)">
      <path d="M-210 0 C-245-115-130-215-18-170 C58-230 188-180 190-70 C275-15 220 120 128 128 C80 215-58 215-98 140 C-202 155-265 76-210 0Z" fill="none" stroke={fg} strokeWidth={10}/>
      <path d="M-55-165 C-8-112-45-70-3-23 C28 14 4 58 34 122 M73-170 C35-124 72-92 50-54 M-145-92 C-78-90-102-28-50 2" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round"/>
    </g>
    <path d="M890 530 C1020 530 1080 530 1180 530" fill="none" stroke={a} strokeWidth={10} strokeLinecap="round" strokeDasharray="18 15" strokeDashoffset={interpolate(progress,[0,1],[220,0],clamp)}/>
    <path d="M1140 490 L1190 530 L1140 570" fill="none" stroke={a} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"/>
    <g transform={`translate(${1320+30*(1-shift)} 530) scale(${.82+.18*shift})`}>
      <circle r={120} fill="none" stroke={fg} strokeWidth={9}/>
      <path d="M-45 5 L-8 45 L58-45" fill="none" stroke={a} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </g>;
};

const Timeline=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent; const reveal=interpolate(progress,[0,1],[0,1],clamp);
  const nodes=[340,760,1160,1580]; const labels=['START','SHIFT','SCALE','PAYOFF'];
  return <g>
    <line x1={220} y1={585} x2={220+(1480*reveal)} y2={585} stroke={fg} strokeWidth={9} strokeLinecap="round"/>
    {nodes.map((x,i)=>{const on=Math.max(0,Math.min(1,(progress-i*.12)*1.9));return <g key={x} opacity={on} transform={`translate(0 ${18*(1-on)})`}>
      <circle cx={x} cy={585} r={24} fill={i===3?a:DEFAULT.background} stroke={i===3?a:fg} strokeWidth={8}/>
      <line x1={x} y1={545} x2={x} y2={420+(i%2)*50} stroke={fg} strokeWidth={6} strokeLinecap="round" opacity={.65}/>
      <text x={x} y={370+(i%2)*50} textAnchor="middle" fill={i===3?a:fg} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="34" letterSpacing="2">{labels[i]}</text>
    </g>})}
  </g>;
};

const MapScene=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent; const dash=interpolate(progress,[0,1],[520,0],clamp); const pulse=1+Math.sin(progress*Math.PI*4)*.12;
  return <g>
    <path d="M330 485 C380 360 540 300 655 350 C735 386 738 470 668 508 C605 542 536 525 492 598 C445 680 340 632 325 558 C318 522 325 500 330 485Z" fill="none" stroke={fg} strokeWidth={9}/>
    <path d="M840 350 C960 270 1125 300 1190 378 C1250 448 1190 512 1120 515 C1058 520 1038 578 1080 638 C1120 696 1050 752 958 712 C882 680 860 608 895 552 C925 503 832 462 810 415 C798 385 810 367 840 350Z" fill="none" stroke={fg} strokeWidth={9}/>
    <path d="M1320 480 C1412 412 1550 452 1580 545 C1600 615 1530 670 1460 650 C1400 635 1384 578 1322 568 C1275 558 1272 510 1320 480Z" fill="none" stroke={fg} strokeWidth={9}/>
    <path d="M505 528 C760 425 1040 410 1450 558" fill="none" stroke={a} strokeWidth={10} strokeLinecap="round" strokeDasharray="18 16" strokeDashoffset={dash}/>
    {[{x:505,y:528},{x:1450,y:558}].map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y}) scale(${i===1?pulse:1})`}><circle r={25} fill={a}/><circle r={52} fill="none" stroke={a} strokeWidth={6} opacity={.28}/></g>)}
  </g>;
};

const StatStory=({beat,palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent; const text=String(beat.callout||'47%').trim();
  return <g>
    <text x={520} y={560} textAnchor="middle" fill={a} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="180" letterSpacing="-5">{text}</text>
    <Line x1={260} y1={635} x2={780} y2={635} color={fg} width={7} opacity={.25}/>
    {Array.from({length:10}).map((_,i)=>{const on=Math.max(0,Math.min(1,(progress-i*.05)*1.8));const x=1030+(i%5)*125;const y=400+Math.floor(i/5)*180;return <g key={i} opacity={on}><circle cx={x} cy={y-42} r={28} fill="none" stroke={i<5?a:fg} strokeWidth={7}/><Line x1={x} y1={y-10} x2={x} y2={65+y} color={i<5?a:fg} width={7}/></g>})}
  </g>;
};

const TransformStory=({palette,progress})=>{
  const fg=palette.foreground; const a=palette.accent; const spread=interpolate(progress,[0,1],[0,1],clamp);
  return <g>
    <rect x={315} y={455} width={150} height={150} rx={24} fill={a} stroke={a} strokeWidth={7}/>
    <path d="M500 530 C650 430 760 420 900 500" fill="none" stroke={a} strokeWidth={9} strokeLinecap="round" strokeDasharray="18 16"/>
    {[0,1,2,3,4,5].map((i)=>{const x=1020+(i%3)*200*spread;const y=390+Math.floor(i/3)*220*spread;return <rect key={i} x={x} y={y} width={140} height={140} rx={22} fill={i===0?a:'none'} stroke={i===0?a:fg} strokeWidth={8}/>})}
    <path d="M910 500 L955 505 L930 545" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"/>
  </g>;
};

const customKinds=new Set(['body','compare','work','city','brain','timeline','map','stat','metaphor']);

const CustomVisual=({kind,beat,palette,progress})=>{
  if(kind==='body') return <BodyStory palette={palette} progress={progress}/>;
  if(kind==='compare') return <CompareStory palette={palette} progress={progress}/>;
  if(kind==='work') return <WorkStory palette={palette} progress={progress}/>;
  if(kind==='city') return <CityStory palette={palette} progress={progress}/>;
  if(kind==='brain') return <BrainProcess palette={palette} progress={progress}/>;
  if(kind==='timeline') return <Timeline palette={palette} progress={progress}/>;
  if(kind==='map') return <MapScene palette={palette} progress={progress}/>;
  if(kind==='stat') return <StatStory beat={beat} palette={palette} progress={progress}/>;
  return <TransformStory palette={palette} progress={progress}/>;
};

const ExtendedScene=({beat,durationInFrames,palette=DEFAULT,kind})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  const frames=Math.max(1,durationInFrames||Math.round(3*fps));
  const p=Math.max(0,Math.min(1,frame/Math.max(1,frames-1)));
  const enter=spring({fps,frame,config:{damping:18,stiffness:105,mass:.8}});
  const drift=interpolate(p,[0,1],[-8,12],clamp); const zoom=interpolate(p,[0,1],[1.015,1.045],clamp);
  return <AbsoluteFill data-visual-owner="doodle-explainer-v1" style={{backgroundColor:palette.background,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(80% 72% at 50% 48%,rgba(255,255,255,.032),transparent 72%)'}}/>
    <AbsoluteFill style={{opacity:.03,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.8) .7px, transparent .9px)',backgroundSize:'14px 14px'}}/>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{transform:`translateX(${drift}px) scale(${zoom})`,transformOrigin:'50% 50%'}}>
      <CustomVisual kind={kind} beat={beat} palette={palette} progress={enter}/>
    </svg>
    {beat.callout?<div style={{position:'absolute',left:90,top:72,fontFamily:'Arial, Helvetica, sans-serif',fontSize:28,fontWeight:900,letterSpacing:4,color:palette.accent,textTransform:'uppercase'}}>{beat.callout}</div>:null}
  </AbsoluteFill>;
};

export const DoodleExplainerScenePlus=({beat,durationInFrames,palette=DEFAULT})=>{
  const kind=beat.visualType||classifyExtended(beat);
  if(customKinds.has(kind)) return <ExtendedScene beat={beat} durationInFrames={durationInFrames} palette={palette} kind={kind}/>;
  return <DoodleExplainerScene beat={{...beat,visualType:kind}} durationInFrames={durationInFrames} palette={palette}/>;
};

export {classifyExtended as classifyDoodleVisualPlus};
