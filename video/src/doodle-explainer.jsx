import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const DEFAULT={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};

const classify=(beat={})=>{
  const t=`${beat.text||''} ${beat.sceneHeadline||''}`.toLowerCase();
  if (/(brain|memory|attention|learning|decision|neuron|mind|focus)/.test(t)) return 'brain';
  if (/(sleep|bed|dream|awake|insomnia|night|bedtime)/.test(t)) return 'sleep';
  if (/(clock|hour|minute|day|year|time|24\/7|schedule)/.test(t)) return 'time';
  if (/(work|boss|office|job|employer|email|company|productivity)/.test(t)) return 'work';
  if (/(city|hospital|airport|restaurant|university|street|business|economy)/.test(t)) return 'city';
  if (/(sun|moon|circadian|morning|evening|light|dark)/.test(t)) return 'sunmoon';
  if (/(heart|blood|body|muscle|health|human|people|person)/.test(t)) return 'body';
  if (/(planet|earth|mars|space|gravity|moon)/.test(t)) return 'planet';
  if (/(versus|compared|double|half|twice|instead|difference)/.test(t)) return 'compare';
  if (/(population|percent|million|billion|number|increase|decrease|rate)/.test(t)) return 'stat';
  return 'metaphor';
};

const Line=({x1,y1,x2,y2,color,width=8,opacity=1})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity}/>;
const Circle=({cx,cy,r,color,width=8,fill='none',opacity=1})=><circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={width} fill={fill} opacity={opacity}/>;

const Person=({x=960,y=575,scale=1,pose='stand',look='right',palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent; const flip=look==='left'?-1:1;
  const bob=Math.sin(progress*Math.PI*2)*4;
  const headY=y-150+bob;
  const armY=pose==='point'?-65:pose==='sleep'?10:-35;
  const legSpread=pose==='walk'?62:42;
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <Circle cx={0} cy={-150+bob} r={46} color={fg} width={8}/>
    <circle cx={16*flip} cy={-158+bob} r={5} fill={a}/>
    <Line x1={0} y1={-100+bob} x2={0} y2={45} color={fg}/>
    <Line x1={0} y1={-54} x2={pose==='point'?110*flip:-70} y2={armY} color={fg}/>
    <Line x1={0} y1={-54} x2={pose==='point'?-42*flip:70} y2={pose==='sleep'?20:-18} color={fg}/>
    <Line x1={0} y1={45} x2={-legSpread} y2={150} color={fg}/>
    <Line x1={0} y1={45} x2={legSpread} y2={150} color={fg}/>
  </g>;
};

const Bed=({x=960,y=680,palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const slide=interpolate(progress,[0,1],[140,0],clamp);
  return <g transform={`translate(${x+slide} ${y})`}>
    <rect x={-250} y={-70} width={500} height={120} rx={16} fill="none" stroke={fg} strokeWidth={8}/>
    <rect x={-220} y={-54} width={125} height={60} rx={22} fill="none" stroke={a} strokeWidth={7}/>
    <Line x1={-245} y1={50} x2={-245} y2={120} color={fg}/><Line x1={245} y1={50} x2={245} y2={120} color={fg}/>
  </g>;
};

const Clock=({x=960,y=510,r=190,palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const angle=interpolate(progress,[0,1],[-110,95],clamp)*Math.PI/180;
  return <g>
    <Circle cx={x} cy={y} r={r} color={fg} width={10}/>
    {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{const q=i*Math.PI/6;return <Line key={i} x1={x+Math.sin(q)*(r-26)} y1={y-Math.cos(q)*(r-26)} x2={x+Math.sin(q)*(r-7)} y2={y-Math.cos(q)*(r-7)} color={i%3===0?a:fg} width={i%3===0?8:5}/>})}
    <Line x1={x} y1={y} x2={x+Math.sin(angle)*r*.65} y2={y-Math.cos(angle)*r*.65} color={a} width={12}/>
    <Line x1={x} y1={y} x2={x-45} y2={y-82} color={fg} width={9}/>
    <circle cx={x} cy={y} r={12} fill={a}/>
  </g>;
};

const Brain=({x=960,y=520,palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const draw=interpolate(progress,[0,.8],[.15,1],clamp);
  return <g transform={`translate(${x} ${y}) scale(${.86+.14*draw})`}>
    <path d="M-215 0 C-250-120 -135-220 -20-172 C55-235 190-185 192-70 C280-18 225 120 130 130 C85 220-60 220-100 142 C-205 160-270 78-215 0Z" fill="none" stroke={fg} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M-55-168 C-10-115-45-72-4-25 C30 15 4 62 35 124 M75-175 C38-125 75-95 52-55 M-150-95 C-80-92-105-30-52 3 M145-92 C80-72 112-15 62 8 M-150 65 C-85 42-82 112-20 135" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" opacity={draw}/>
  </g>;
};

const City=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const rise=interpolate(progress,[0,1],[130,0],clamp);
  const buildings=[{x:210,w:210,h:380},{x:450,w:280,h:520},{x:760,w:190,h:330},{x:985,w:310,h:600},{x:1330,w:220,h:450},{x:1580,w:190,h:320}];
  return <g transform={`translate(0 ${rise})`}>
    <Line x1={140} y1={840} x2={1780} y2={840} color={fg} width={8}/>
    {buildings.map((b,i)=><g key={i}><rect x={b.x} y={840-b.h} width={b.w} height={b.h} rx={10} fill="none" stroke={fg} strokeWidth={8}/>{[0,1,2].map(r=>[0,1].map(c=><rect key={`${r}-${c}`} x={b.x+38+c*74} y={840-b.h+55+r*95} width={34} height={46} rx={5} fill={(i+r+c)%4===0?a:'none'} stroke={(i+r+c)%4===0?a:fg} strokeWidth={5}/>))}</g>)}
  </g>;
};

const SunMoon=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const travel=interpolate(progress,[0,1],[-130,130],clamp);
  return <g>
    <Circle cx={650+travel} cy={470} r={125} color={a} width={10}/>
    {[0,1,2,3,4,5,6,7].map(i=>{const q=i*Math.PI/4;return <Line key={i} x1={650+travel+Math.cos(q)*158} y1={470+Math.sin(q)*158} x2={650+travel+Math.cos(q)*195} y2={470+Math.sin(q)*195} color={a} width={7}/>})}
    <path d="M1285 345 C1190 395 1175 560 1285 620 C1370 665 1460 605 1485 535 C1400 565 1325 520 1300 450 C1288 416 1284 382 1285 345Z" fill="none" stroke={fg} strokeWidth={10}/>
    <Line x1={960} y1={265} x2={960} y2={760} color={fg} width={5} opacity={.22}/>
  </g>;
};

const Work=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const blocks=8; const shown=Math.max(0,Math.floor(interpolate(progress,[0,1],[0,blocks+.99],clamp)));
  return <g>
    <Person x={520} y={620} scale={.9} pose="point" palette={palette} progress={progress}/>
    <rect x={960} y={330} width={650} height={380} rx={22} fill="none" stroke={fg} strokeWidth={9}/>
    <rect x={1110} y={470} width={350} height={150} rx={12} fill="none" stroke={fg} strokeWidth={7}/>
    <Line x1={1060} y1={710} x2={1510} y2={710} color={fg}/>
    {Array.from({length:blocks}).map((_,i)=><rect key={i} x={930+i*86} y={810} width={62} height={62} rx={9} fill={i<shown?a:'none'} stroke={i<shown?a:fg} strokeWidth={5}/>)}
  </g>;
};

const Planet=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const s=interpolate(progress,[0,1],[.72,1],clamp);
  return <g transform={`translate(960 520) scale(${s})`}>
    <Circle cx={0} cy={0} r={245} color={fg} width={10}/>
    <path d="M-180-80 C-105-140-45-85 5-120 C70-165 125-110 170-55 M-170 70 C-80 20-10 95 70 58 C120 35 160 72 185 118" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round"/>
    <path d="M-330 30 C-140-35 155-30 330 28" fill="none" stroke={fg} strokeWidth={7} opacity={.35}/>
  </g>;
};

const Compare=({palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent; const split=interpolate(progress,[0,1],[0,1],clamp);
  return <g>
    <Line x1={960} y1={210} x2={960} y2={820} color={fg} width={6} opacity={.28}/>
    <Person x={570} y={610} scale={.9} palette={palette} progress={progress}/>
    <Person x={1350} y={610} scale={1.15} pose="point" look="left" palette={palette} progress={progress}/>
    <rect x={335} y={815} width={470} height={18} rx={9} fill={fg} opacity={.45}/>
    <rect x={1115} y={815} width={470*split} height={18} rx={9} fill={a}/>
  </g>;
};

const Stat=({beat,palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const raw=String(beat.callout||'').trim(); const text=raw&&raw.length<22?raw:'THE NUMBER CHANGES';
  const scale=interpolate(progress,[0,.65,1],[.55,1.08,1],clamp);
  return <g transform={`translate(960 535) scale(${scale})`}>
    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill={a} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="150" letterSpacing="-4">{text}</text>
    <Line x1={-370} y1={125} x2={370} y2={125} color={fg} width={7} opacity={.28}/>
  </g>;
};

const Metaphor=({beat,palette=DEFAULT,progress=1})=>{
  const fg=palette.foreground; const a=palette.accent;
  const count=6; const spread=interpolate(progress,[0,1],[0,1],clamp);
  return <g>
    <Person x={610} y={610} scale={.95} pose="point" palette={palette} progress={progress}/>
    {Array.from({length:count}).map((_,i)=>{const x=1030+(i%3)*165;const y=410+Math.floor(i/3)*170;const o=Math.max(0,Math.min(1,progress*2-i*.13));return <rect key={i} x={x} y={y} width={118} height={118} rx={18} fill={i===0?a:'none'} stroke={i===0?a:fg} strokeWidth={7} opacity={o} transform={`translate(${(1-spread)*120} 0)`}/>})}
    <path d="M805 570 C880 520 900 470 970 455" fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" strokeDasharray="18 16"/>
  </g>;
};

const Visual=({kind,beat,palette,progress})=>{
  if(kind==='sleep') return <><Bed x={1120} y={690} palette={palette} progress={progress}/><Person x={650} y={615} scale={.9} pose="sleep" palette={palette} progress={progress}/></>;
  if(kind==='time') return <Clock palette={palette} progress={progress}/>;
  if(kind==='brain') return <Brain palette={palette} progress={progress}/>;
  if(kind==='work') return <Work palette={palette} progress={progress}/>;
  if(kind==='city') return <City palette={palette} progress={progress}/>;
  if(kind==='sunmoon') return <SunMoon palette={palette} progress={progress}/>;
  if(kind==='body') return <><Person x={960} y={620} scale={1.25} pose="stand" palette={palette} progress={progress}/><Circle cx={960} cy={515} r={24+8*Math.sin(progress*Math.PI*4)} color={palette.accent} width={8}/></>;
  if(kind==='planet') return <Planet palette={palette} progress={progress}/>;
  if(kind==='compare') return <Compare palette={palette} progress={progress}/>;
  if(kind==='stat') return <Stat beat={beat} palette={palette} progress={progress}/>;
  return <Metaphor beat={beat} palette={palette} progress={progress}/>;
};

const Keyword=({beat,palette=DEFAULT,progress=1})=>{
  const callout=String(beat.callout||'').trim();
  if(!callout || callout.length>22) return null;
  const y=interpolate(progress,[0,.45],[40,0],clamp); const o=interpolate(progress,[0,.32],[0,1],clamp);
  return <div style={{position:'absolute',left:90,top:72,transform:`translateY(${y}px)`,opacity:o,fontFamily:'Arial, Helvetica, sans-serif',fontSize:30,fontWeight:900,letterSpacing:4,color:palette.accent,textTransform:'uppercase'}}>{callout}</div>;
};

export const DoodleExplainerScene=({beat,durationInFrames,palette=DEFAULT})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  const frames=Math.max(1,durationInFrames||Math.round(4*fps));
  const p=Math.max(0,Math.min(1,frame/Math.max(1,frames-1)));
  const enter=spring({fps,frame,config:{damping:18,stiffness:110,mass:.75}});
  const kind=beat.visualType||classify(beat);
  const layout=Number(beat.layout||0)%4;
  const dx=[-16,10,14,-10][layout]*p; const dy=[3,-4,6,-2][layout]*p;
  const zoom=interpolate(p,[0,1],[1.015,1.055],clamp);
  return <AbsoluteFill data-visual-owner="doodle-explainer-v1" style={{backgroundColor:palette.background,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(75% 70% at 50% 48%,rgba(255,255,255,.026),transparent 72%)'}}/>
    <AbsoluteFill style={{opacity:.035,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.85) .7px, transparent .9px)',backgroundSize:'14px 14px'}}/>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{transform:`translate(${dx}px,${dy}px) scale(${zoom})`,transformOrigin:'50% 50%'}}>
      <Visual kind={kind} beat={beat} palette={palette} progress={enter}/>
    </svg>
    <Keyword beat={beat} palette={palette} progress={enter}/>
  </AbsoluteFill>;
};

export {classify as classifyDoodleVisual};
