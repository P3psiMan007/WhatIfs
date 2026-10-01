import React from 'react';
import {AbsoluteFill,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

const DURATION_SECONDS = 520;
const PAL = {
  paper: '#f4ead5',
  ink: '#181818',
  red: '#d94136',
  blue: '#1869ff',
  yellow: '#f2b92b',
  navy: '#07111f',
  soft: '#eadfca',
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const font = 'Arial, Helvetica, sans-serif';

const sections = [
  {key:'cold', start:0, end:30, title:'1% should mean almost dead.', tag:'COLD OPEN', mode:'paper'},
  {key:'sensor', start:30, end:70, title:'There is no tiny fuel gauge.', tag:'PROMISE', mode:'paper'},
  {key:'bottle', start:70, end:115, title:'A battery is not a water bottle.', tag:'MISCONCEPTION', mode:'paper'},
  {key:'voltage', start:115, end:165, title:'Voltage is useful… and annoying.', tag:'MECHANISM 1', mode:'xray'},
  {key:'current', start:165, end:215, title:'Then it starts bookkeeping.', tag:'MECHANISM 2', mode:'paper'},
  {key:'model', start:215, end:260, title:'The percentage is a model.', tag:'RE-HOOK', mode:'paper'},
  {key:'coldtemp', start:260, end:310, title:'Cold makes the guess wobble.', tag:'REAL LIFE FAIL', mode:'xray'},
  {key:'age', start:310, end:350, title:'Old batteries change the tank.', tag:'AGE', mode:'paper'},
  {key:'onepct', start:350, end:400, title:'One percent is the weirdest number.', tag:'PAYOFF BUILD', mode:'paper'},
  {key:'eighty', start:400, end:445, title:'The top end is controlled too.', tag:'80% MYSTERY', mode:'xray'},
  {key:'useful', start:445, end:490, title:'What should you actually do?', tag:'USEFUL PART', mode:'paper'},
  {key:'payoff', start:490, end:520, title:'It is not a gauge. It is a prediction.', tag:'FINAL CALLBACK', mode:'paper'},
];

function getSection(t){return sections.find(s => t >= s.start && t < s.end) || sections[sections.length - 1];}
function secP(section, t){return Math.max(0, Math.min(1, (t - section.start) / Math.max(0.001, section.end - section.start)));}
function beat(p, count){return Math.max(0, Math.min(count - 1, Math.floor(p * count)));}

const PaperBackground = ({dark=false}) => <AbsoluteFill style={{background: dark ? PAL.navy : PAL.paper, overflow:'hidden'}}>
  {!dark && <>
    <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(24,24,24,.09) .8px, transparent 1px)',backgroundSize:'18px 18px',opacity:.42}}/>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(217,65,54,.08) 0 2px,transparent 2px 100%)',backgroundSize:'96px 96px',opacity:.35}}/>
  </>}
  {dark && <>
    <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 52% 42%,rgba(24,105,255,.22),transparent 42%), radial-gradient(circle at 80% 25%,rgba(242,185,43,.16),transparent 30%)'}}/>
    <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)',backgroundSize:'64px 64px',opacity:.35}}/>
  </>}
</AbsoluteFill>;

const InkText = ({children,x=90,y=80,size=48,color=PAL.ink,weight=900,width=900,rotate=0,align='left'}) => <div style={{position:'absolute',left:x,top:y,width,fontFamily:font,fontSize:size,lineHeight:.95,fontWeight:weight,color,textAlign:align,textTransform:'uppercase',letterSpacing:-1.8,transform:`rotate(${rotate}deg)`}}>{children}</div>;
const Tag = ({children,dark=false}) => <div style={{position:'absolute',left:86,top:54,fontFamily:font,fontWeight:900,fontSize:20,letterSpacing:4,color:dark ? PAL.yellow : PAL.red}}>{children}</div>;
const Mini = ({children,x=96,y=720,width=700,dark=false}) => <div style={{position:'absolute',left:x,top:y,width,fontFamily:font,fontSize:28,lineHeight:1.1,fontWeight:800,color:dark ? '#f4ead5' : PAL.ink}}>{children}</div>;

const Scribble = ({x,y,w=180,color=PAL.red,opacity=1}) => <svg style={{position:'absolute',left:x,top:y,width:w,height:44,opacity}} viewBox="0 0 180 44"><path d="M4 30 C30 12 47 40 72 21 C96 4 115 42 141 20 C154 10 166 11 176 18" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"/></svg>;
const Arrow = ({x1,y1,x2,y2,color=PAL.blue,dash=false}) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={dash?'18 16':undefined} markerEnd="url(#arrow)"/>;

const Phone = ({x=1100,y=270,scale=1,percent='1%',peel=0,dark=false}) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
  <rect x="0" y="0" width="300" height="520" rx="42" fill={dark ? '#091525' : '#fffaf0'} stroke={dark ? '#f4ead5' : PAL.ink} strokeWidth="10"/>
  <rect x="36" y="58" width="228" height="388" rx="20" fill={dark ? '#0b2239' : '#fdf6e8'} stroke={dark ? PAL.blue : PAL.ink} strokeWidth="5" opacity=".95"/>
  <rect x="102" y="26" width="96" height="12" rx="6" fill={dark ? '#f4ead5' : PAL.ink}/>
  <g transform={`translate(${112 + 44*peel} ${180 - 120*peel}) rotate(${-12*peel})`}>
    <rect x="0" y="0" width="110" height="62" rx="12" fill={peel>.05?PAL.yellow:'#fff'} stroke={PAL.ink} strokeWidth="6"/>
    <text x="55" y="43" fontFamily={font} fontSize="34" fontWeight="900" textAnchor="middle" fill={PAL.ink}>{percent}</text>
  </g>
  <circle cx="150" cy="482" r="12" fill={dark ? '#f4ead5' : PAL.ink}/>
</g>;

const Battery = ({x=740,y=350,scale=1,fill=.45,dark=false,open=false}) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
  <rect x="0" y="0" width="520" height="190" rx="28" fill={dark?'#081421':'#fffaf0'} stroke={dark?'#f4ead5':PAL.ink} strokeWidth="10"/>
  <rect x="520" y="62" width="34" height="66" rx="10" fill="none" stroke={dark?'#f4ead5':PAL.ink} strokeWidth="9"/>
  <rect x="28" y="30" width={Math.max(8,460*fill)} height="130" rx="18" fill={fill<.18?PAL.red:fill>.78?PAL.yellow:PAL.blue} opacity=".9"/>
  <path d="M44 96 L478 96" stroke={dark?'rgba(244,234,213,.28)':'rgba(24,24,24,.2)'} strokeWidth="6" strokeDasharray="16 14"/>
  {open && <g transform="translate(80 205)"><rect x="0" y="0" width="360" height="76" rx="14" fill={PAL.yellow} stroke={PAL.ink} strokeWidth="7"/><text x="180" y="50" fontFamily={font} fontSize="31" fontWeight="900" textAnchor="middle" fill={PAL.ink}>hidden safety margin</text></g>}
</g>;

const VoltageCurve = ({x=620,y=360,w=760,h=310,dark=true,progress=1}) => {
  const path = `M0 ${h-30} C150 ${h-82} 370 ${h-105} 545 ${h-115} C650 ${h-122} 705 ${h-188} ${w} 28`;
  return <g transform={`translate(${x} ${y})`}>
    <rect x="-34" y="-34" width={w+68} height={h+74} rx="28" fill={dark?'rgba(7,17,31,.92)':'#fffaf0'} stroke={dark?'#f4ead5':PAL.ink} strokeWidth="7"/>
    <path d={`M0 ${h} L0 0 M0 ${h} L${w} ${h}`} stroke={dark?'rgba(244,234,213,.7)':PAL.ink} strokeWidth="7" strokeLinecap="round"/>
    <path d={path} fill="none" stroke={PAL.yellow} strokeWidth="11" strokeLinecap="round" strokeDasharray="980" strokeDashoffset={980*(1-progress)}/>
    <text x="8" y="-8" fontFamily={font} fontSize="26" fontWeight="900" fill={dark?'#f4ead5':PAL.ink}>voltage curve</text>
    <text x={w-160} y={h-22} fontFamily={font} fontSize="24" fontWeight="900" fill={PAL.red}>steep ending</text>
  </g>;
};

const Calculator = ({x=1120,y=380,scale=1,mood='normal'}) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
  <rect x="0" y="0" width="230" height="280" rx="28" fill="#fffaf0" stroke={PAL.ink} strokeWidth="9"/>
  <rect x="28" y="28" width="174" height="58" rx="12" fill={mood==='panic'?PAL.red:PAL.yellow} stroke={PAL.ink} strokeWidth="6"/>
  <text x="115" y="69" fontFamily={font} fontSize="33" fontWeight="900" textAnchor="middle" fill={PAL.ink}>{mood==='panic'?'bro??':'37%'}</text>
  {[0,1,2,3,4,5].map((i)=><circle key={i} cx={58+(i%3)*58} cy={126+Math.floor(i/3)*58} r="18" fill={PAL.ink} opacity=".85"/>)}
  <circle cx="82" cy="-25" r="11" fill={PAL.ink}/><circle cx="154" cy="-25" r="11" fill={PAL.ink}/>
  {mood==='panic' && <path d="M80 -58 C110 -88 140 -88 168 -58" fill="none" stroke={PAL.red} strokeWidth="8" strokeLinecap="round"/>}
</g>;

const Thermo = ({x=760,y=350,cold=false}) => <g transform={`translate(${x} ${y})`}>
  <rect x="40" y="0" width="64" height="240" rx="32" fill="#fffaf0" stroke={PAL.ink} strokeWidth="8"/>
  <circle cx="72" cy="260" r="52" fill={cold?PAL.blue:PAL.red} stroke={PAL.ink} strokeWidth="8"/>
  <rect x="62" y={cold?155:50} width="20" height={cold?82:185} rx="10" fill={cold?PAL.blue:PAL.red}/>
  <text x="150" y="145" fontFamily={font} fontSize="48" fontWeight="900" fill={cold?PAL.blue:PAL.red}>{cold?'COLD':'HEAT'}</text>
</g>;

const Charger = ({x=720,y=335}) => <g transform={`translate(${x} ${y})`}>
  <rect x="0" y="0" width="220" height="190" rx="28" fill="#fffaf0" stroke={PAL.ink} strokeWidth="9"/>
  <line x1="54" y1="-38" x2="54" y2="0" stroke={PAL.ink} strokeWidth="13" strokeLinecap="round"/>
  <line x1="162" y1="-38" x2="162" y2="0" stroke={PAL.ink} strokeWidth="13" strokeLinecap="round"/>
  <path d="M122 40 L74 115 H117 L98 172 L162 91 H119 Z" fill={PAL.yellow} stroke={PAL.ink} strokeWidth="6" strokeLinejoin="round"/>
</g>;

const SceneArt = ({scene,p,t,dark}) => {
  const b = beat(p,4);
  const draw = interpolate(p,[0,.18,.9,1],[0,1,1,.85],clamp);
  const smallJitter = Math.sin(t*3)*4;
  if(scene.key==='cold') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill={PAL.blue}/></marker></defs><Phone x={1020} y={245} scale={1.25} percent={b<2?'1%':'20%'} peel={b===1?.45:0}/>{b>=2&&<g><Thermo x={390} y={330} cold/><Arrow x1="580" y1="470" x2="1000" y2="490" color={PAL.red}/><text x="390" y="680" fontFamily={font} fontSize="42" fontWeight="900" fill={PAL.red}>then it dies?</text></g>}</svg>;
  if(scene.key==='sensor') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill={PAL.blue}/></marker></defs><Phone x={1120} y={300} scale={1.0} percent="37%" peel={.8*draw}/><text x="440" y="430" fontFamily={font} fontSize="88" fontWeight="900" fill={PAL.red} transform="rotate(-4 440 430)">NO SENSOR</text><Arrow x1="820" y1="455" x2="1110" y2="450" color={PAL.red} dash/></svg>;
  if(scene.key==='bottle') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><rect x="440" y="300" width="220" height="390" rx="48" fill="#fffaf0" stroke={PAL.ink} strokeWidth="10"/><rect x="464" y="500" width="172" height="166" rx="24" fill={PAL.blue} opacity=".8"/><text x="406" y="760" fontFamily={font} fontSize="38" fontWeight="900" fill={PAL.ink}>bottle: easy</text><Battery x="990" y="400" scale=".95" fill={.48}/><text x="960" y="760" fontFamily={font} fontSize="38" fontWeight="900" fill={PAL.red}>battery: chemistry</text>{b>=2&&<text x="785" y="360" fontFamily={font} fontSize="48" fontWeight="900" fill={PAL.red}>not the same thing</text>}</svg>;
  if(scene.key==='voltage') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><VoltageCurve progress={draw}/>{b>=1&&<text x="360" y="780" fontFamily={font} fontSize="46" fontWeight="900" fill="#f4ead5">flat here...</text>}{b>=2&&<text x="1280" y="250" fontFamily={font} fontSize="46" fontWeight="900" fill={PAL.red}>then drop</text>}</svg>;
  if(scene.key==='current') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill={PAL.blue}/></marker></defs><Battery x="360" y="415" scale=".75" fill={.65}/><Arrow x1="890" y1="505" x2="1120" y2="505"/><Calculator x="1150" y="370" scale="1"/><text x="420" y="705" fontFamily={font} fontSize="44" fontWeight="900" fill={PAL.ink}>energy out</text><text x="1110" y="705" fontFamily={font} fontSize="44" fontWeight="900" fill={PAL.blue}>bookkeeping</text>{b>=2&&<text x="765" y="330" fontFamily={font} fontSize="44" fontWeight="900" fill={PAL.red}>small errors stack</text>}</svg>;
  if(scene.key==='model') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill={PAL.blue}/></marker></defs>{['voltage','current','heat','age'].map((label,i)=><g key={label} transform={`translate(${350+i*300} ${355+(i%2)*150})`}><rect x="0" y="0" width="210" height="90" rx="20" fill="#fffaf0" stroke={PAL.ink} strokeWidth="7"/><text x="105" y="58" fontFamily={font} fontSize="31" fontWeight="900" textAnchor="middle" fill={i===2?PAL.red:PAL.ink}>{label}</text><Arrow x1="210" y1="45" x2="300" y2="45" color={PAL.blue}/></g>)}<Calculator x="1510" y="405" mood={b>=2?'panic':'normal'} scale=".9"/></svg>;
  if(scene.key==='coldtemp') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><Thermo x={390} y={355} cold/><Battery x={850} y={410} scale={.9} fill={b<2?.42:.12} dark/><text x="880" y="710" fontFamily={font} fontSize="44" fontWeight="900" fill={b<2?'#f4ead5':PAL.red}>voltage sag</text><text x="410" y="760" fontFamily={font} fontSize="35" fontWeight="900" fill="#f4ead5">energy did not vanish</text></svg>;
  if(scene.key==='age') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><Battery x="330" y="380" scale=".8" fill={.5}/><Battery x="1040" y="405" scale=".62" fill={.5}/><text x="390" y="710" fontFamily={font} fontSize="46" fontWeight="900" fill={PAL.ink}>new 50%</text><text x="1070" y="710" fontFamily={font} fontSize="46" fontWeight="900" fill={PAL.red}>old 50%</text><path d="M830 530 C905 460 965 460 1025 520" fill="none" stroke={PAL.red} strokeWidth="9" strokeDasharray="18 15"/></svg>;
  if(scene.key==='onepct') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><Phone x={385} y={300} scale={1} percent="1%" peel={draw}/><Battery x="1000" y="390" scale=".8" fill={.08} open={b>=2}/>{b>=1&&<Calculator x="780" y="425" scale=".72" mood="panic"/>}<text x="1115" y="335" fontFamily={font} fontSize="42" fontWeight="900" fill={PAL.red}>shutdown cutoff</text></svg>;
  if(scene.key==='eighty') return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><Charger x="350" y="410"/><Battery x="790" y="410" scale=".9" fill={b<2?.8:.95} dark/><text x="820" y="710" fontFamily={font} fontSize="47" fontWeight="900" fill="#f4ead5">fast until ~80%</text>{b>=2&&<text x="820" y="780" fontFamily={font} fontSize="47" fontWeight="900" fill={PAL.yellow}>then slow landing</text>}</svg>;
  if(scene.key==='useful') return <svg viewBox="0 0 1920 1080" width="100%" height="100%">{['avoid extreme heat','cold + camera = risky','old battery = worse guess'].map((label,i)=><g key={label} transform={`translate(${360} ${300+i*160})`}><rect x="0" y="0" width="850" height="96" rx="24" fill="#fffaf0" stroke={PAL.ink} strokeWidth="7"/><circle cx="50" cy="48" r="22" fill={i===0?PAL.red:i===1?PAL.blue:PAL.yellow} stroke={PAL.ink} strokeWidth="5"/><text x="100" y="62" fontFamily={font} fontSize="38" fontWeight="900" fill={PAL.ink}>{label}</text></g>)}</svg>;
  return <svg viewBox="0 0 1920 1080" width="100%" height="100%"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill={PAL.blue}/></marker></defs><Phone x={360} y={310} scale={.92} percent="?"/><Arrow x1="700" y1="500" x2="955" y2="500"/><Calculator x="970" y="390" mood="normal"/><Arrow x1="1230" y1="500" x2="1450" y2="500"/><Battery x="1455" y="440" scale=".55" fill={.23}/><text x="590" y="745" fontFamily={font} fontSize="48" fontWeight="900" fill={PAL.ink}>not a gauge</text><text x="1010" y="745" fontFamily={font} fontSize="48" fontWeight="900" fill={PAL.blue}>a prediction</text></svg>;
};

const SectionHeader = ({section,dark}) => <>
  <Tag dark={dark}>{section.tag}</Tag>
  <InkText x={86} y={100} size={62} color={dark?'#f4ead5':PAL.ink} width={760}>{section.title}</InkText>
</>;

const Timeline = ({t}) => <div style={{position:'absolute',left:90,right:90,bottom:42,height:8,borderRadius:999,background:'rgba(24,24,24,.15)'}}>
  <div style={{width:`${Math.max(0,Math.min(1,t/DURATION_SECONDS))*100}%`,height:'100%',borderRadius:999,background:PAL.red}}/>
</div>;

const Notes = ({scene,b,dark}) => {
  const copy = {
    cold:['The hook pays off immediately: the video starts with the exact battery weirdness promised by the title.'],
    sensor:['No long intro. No logo. The first promise is answered in under 40 seconds.'],
    bottle:['The simple comparison prevents early confusion: bottle logic is wrong for batteries.'],
    voltage:['A top moment is pulled forward: the curve explains why percentages get weird.'],
    current:['Micro-payoff: the phone is not seeing charge, it is counting and correcting.'],
    model:['Re-hook: this is why two phones can feel different at the same percentage.'],
    coldtemp:['Pattern interrupt: dark x-ray mode shows why cold changes usable power.'],
    age:['Second re-hook: fifty percent changes when the tank itself shrinks.'],
    onepct:['Main payoff build: one percent is a UI number plus safety behavior.'],
    eighty:['Bridge to the next video: charging speed is part of the same protection system.'],
    useful:['Practical reward before the ending: what to do with the explanation.'],
    payoff:['Final callback closes the original one-percent mystery and opens the next click.'],
  };
  return <Mini dark={dark}>{copy[scene.key]?.[0] || ''}</Mini>;
};

export const BatteryLongformEpisode = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = frame / fps;
  const scene = getSection(t); const p = secP(scene,t); const b = beat(p,4); const dark = scene.mode === 'xray';
  const enter = interpolate(frame - scene.start*fps,[0,18],[0,1],clamp);
  return <AbsoluteFill style={{fontFamily:font,background:PAL.paper,overflow:'hidden'}}>
    <Audio src={staticFile('battery-longform/narration.wav')} />
    <PaperBackground dark={dark}/>
    <div style={{position:'absolute',inset:0,opacity:enter,transform:`translateY(${(1-enter)*18}px)`}}>
      <SectionHeader section={scene} dark={dark}/>
      <SceneArt scene={scene} p={p} t={t} dark={dark}/>
      <Notes scene={scene} b={b} dark={dark}/>
    </div>
    <Scribble x={85} y={190} w={scene.key==='payoff'?380:210} color={dark?PAL.yellow:PAL.red} opacity={.75}/>
    <Timeline t={t}/>
    <div style={{position:'absolute',right:84,bottom:34,fontFamily:font,fontSize:22,fontWeight:900,letterSpacing:3,color:dark?'#f4ead5':PAL.ink,opacity:.48}}>WHATIFS PILOT</div>
  </AbsoluteFill>;
};

export const BatteryLongformThumbnail = () => <AbsoluteFill style={{fontFamily:font,background:PAL.paper,overflow:'hidden'}}>
  <PaperBackground/>
  <InkText x={72} y={70} size={100} width={610}>YOUR BATTERY<br/><span style={{color:PAL.red}}>IS GUESSING</span></InkText>
  <Scribble x={80} y={288} w={410}/>
  <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{position:'absolute',inset:0}}>
    <Phone x={1110} y={210} scale={1.22} percent="1%" peel={.62}/>
    <Battery x="880" y="660" scale=".78" fill={.08} open/>
    <path d="M862 415 C720 390 720 625 895 685" fill="none" stroke={PAL.red} strokeWidth="14" strokeLinecap="round" strokeDasharray="24 20"/>
  </svg>
  <div style={{position:'absolute',left:86,bottom:76,fontSize:36,fontWeight:900,color:PAL.ink,letterSpacing:2}}>NOT A GAUGE. A PREDICTION.</div>
</AbsoluteFill>;

export const BATTERY_LONGFORM_DURATION_SECONDS = DURATION_SECONDS;
