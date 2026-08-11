import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';

const C={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const font='Arial, Helvetica, sans-serif';
const mix=(p,a,b)=>interpolate(p,[0,1],[a,b],clamp);
const Line=({x1,y1,x2,y2,stroke,width=8,opacity=1,dash})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity} strokeDasharray={dash}/>;
const Label=({x,y,children,fill,size=34,anchor='middle',opacity=1})=><text x={x} y={y} textAnchor={anchor} fill={fill} opacity={opacity} fontFamily={font} fontSize={size} fontWeight="800" letterSpacing="1.2">{children}</text>;

function Shell({children,palette=C,glow='50% 40%'}){
  return <AbsoluteFill style={{backgroundColor:palette.background,overflow:'hidden'}}>
    <AbsoluteFill style={{background:`radial-gradient(65% 85% at ${glow},rgba(255,179,64,.12),transparent 62%),linear-gradient(180deg,#0e131c 0%,#080b11 100%)`}}/>
    <AbsoluteFill style={{opacity:.018,backgroundImage:'radial-gradient(circle,rgba(234,231,225,.8) .8px,transparent 1px)',backgroundSize:'18px 18px'}}/>
    {children}
    <AbsoluteFill style={{boxShadow:'inset 0 0 190px rgba(0,0,0,.66)',pointerEvents:'none'}}/>
  </AbsoluteFill>;
}

function AuroraOpening({p,palette}){
  const a=palette.accent,fg=palette.foreground; const sweep=mix(p,-180,160);
  return <Shell palette={palette} glow="72% 22%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <defs><linearGradient id="aur6" x1="0" x2="1"><stop offset="0" stopColor={a} stopOpacity=".06"/><stop offset=".35" stopColor={a} stopOpacity=".92"/><stop offset="1" stopColor={fg} stopOpacity=".08"/></linearGradient></defs>
    <path d={`M-150 ${260+sweep*.08} C250 35 590 380 930 170 C1210 0 1490 310 2080 70`} fill="none" stroke="url(#aur6)" strokeWidth="115" strokeLinecap="round"/>
    <path d={`M-120 ${390-sweep*.05} C310 175 620 470 980 285 C1320 115 1580 430 2050 240`} fill="none" stroke={a} strokeWidth="30" opacity=".42"/>
    <path d="M0 865 Q380 710 760 835 T1500 820 T2050 850 L2050 1080 L0 1080 Z" fill="#111721"/>
    {[0,1,2,3,4,5,6,7].map(i=><g key={i}><rect x={60+i*250} y={850-(170+(i%4)*80)} width={170} height={170+(i%4)*80} rx="8" fill="#0a0e15" stroke={fg} strokeWidth="5" opacity=".58"/><rect x={95+i*250} y={760-(i%4)*70} width={16} height={16} fill={a} opacity={.35+(i%3)*.18}/></g>)}
    <g transform={`translate(${560+60*p} 875)`}><circle cx="0" cy="-112" r="35" fill="none" stroke={fg} strokeWidth="7"/><Line x1={0} y1={-76} x2={0} y2={35} stroke={fg}/><Line x1={0} y1={-32} x2={58} y2={-68} stroke={fg}/><rect x="52" y="-107" width="38" height="64" rx="6" fill="none" stroke={a} strokeWidth="6"/><Line x1={0} y1={35} x2={-36} y2={120} stroke={fg}/><Line x1={0} y1={35} x2={36} y2={120} stroke={fg}/></g>
  </svg></Shell>;
}

function FlareVsCme({p,palette}){
  const a=palette.accent,fg=palette.foreground; const fast=mix(p,470,1500); const slow=mix(p,540,1210);
  return <Shell palette={palette} glow="22% 48%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <circle cx="300" cy="540" r="180" fill="rgba(255,179,64,.08)" stroke={a} strokeWidth="16"/>
    {Array.from({length:14}).map((_,i)=>{const q=i*Math.PI/7;return <Line key={i} x1={300+210*Math.cos(q)} y1={540+210*Math.sin(q)} x2={300+265*Math.cos(q)} y2={540+265*Math.sin(q)} stroke={a} width={7} opacity={.55}/>})}
    <circle cx="1610" cy="540" r="145" fill="none" stroke={fg} strokeWidth="10"/>
    <path d={`M450 400 Q760 260 ${slow} 455 Q${slow+130} 550 ${slow-20} 655 Q760 755 450 600 Z`} fill="rgba(255,179,64,.08)" stroke={a} strokeWidth="10" opacity=".8"/>
    <Line x1={470} y1={370} x2={fast} y2={370} stroke={a} width={14}/><path d={`M${fast-38} 340 L${fast} 370 L${fast-38} 400`} fill="none" stroke={a} strokeWidth="12" strokeLinejoin="round"/>
    <Label x={930} y={295} fill={a} size={32}>FLARE — LIGHT SPEED</Label><Label x={930} y={805} fill={fg} size={31}>CME — MAGNETIZED PLASMA</Label>
  </svg></Shell>;
}

function Shield({p,palette}){
  const a=palette.accent,fg=palette.foreground; const squeeze=mix(p,0,95);
  return <Shell palette={palette} glow="64% 50%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <circle cx="1120" cy="560" r="185" fill="rgba(234,231,225,.025)" stroke={fg} strokeWidth="10"/>
    <path d={`M845 ${250+squeeze} C610 330 560 465 570 560 C575 690 665 785 850 ${870-squeeze}`} fill="none" stroke={a} strokeWidth="13" opacity=".78"/>
    <path d={`M1390 ${245-squeeze*.25} C1710 335 1785 455 1810 560 C1780 690 1695 790 1390 ${875+squeeze*.25}`} fill="none" stroke={a} strokeWidth="10" opacity=".26"/>
    {[250,330,410,490,570,650,730].map((y,i)=><g key={y}><Line x1={80} y1={y} x2={520} y2={y+(i-3)*11} stroke={a} width={7} opacity={.78}/><path d={`M495 ${y+(i-3)*11-16} L520 ${y+(i-3)*11} L494 ${y+(i-3)*11+16}`} fill="none" stroke={a} strokeWidth="7"/></g>)}
    <path d="M970 560 C1010 465 1085 420 1170 435 C1255 452 1320 515 1325 595" fill="none" stroke={fg} strokeWidth="6" opacity=".35"/>
    <Label x={1120} y={900} fill={fg} size={34}>EARTH'S MAGNETIC SHIELD</Label>
  </svg></Shell>;
}

function Satellite({p,palette}){
  const a=palette.accent,fg=palette.foreground; const x=mix(p,560,1320), y=470+Math.sin(p*Math.PI)*120;
  return <Shell palette={palette} glow="60% 34%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <path d="M-50 1030 Q960 500 1980 1030" fill="#10151e" stroke={fg} strokeWidth="9"/>
    <path d="M-50 900 Q960 480 1980 900" fill="none" stroke={a} strokeWidth="34" opacity=".14"/>
    <path d="M-30 825 Q960 455 1950 825" fill="none" stroke={a} strokeWidth="8" opacity=".45"/>
    <g transform={`translate(${x} ${y}) rotate(${mix(p,-12,8)})`}><rect x="-48" y="-34" width="96" height="68" rx="8" fill={a}/><rect x="-185" y="-52" width="110" height="104" fill="none" stroke={fg} strokeWidth="8"/><rect x="75" y="-52" width="110" height="104" fill="none" stroke={fg} strokeWidth="8"/></g>
    {[0,1,2,3].map(i=><path key={i} d={`M${x+180+i*55} ${y-90+i*20} q80 40 145 0`} fill="none" stroke={a} strokeWidth="7" opacity={.18+i*.13}/>) }
    <Label x={960} y={210} fill={a} size={36}>UPPER ATMOSPHERE EXPANDS</Label><Label x={960} y={955} fill={fg} size={29}>MORE DRAG • HARDER ORBIT PREDICTIONS</Label>
  </svg></Shell>;
}

function GPS({p,palette}){
  const a=palette.accent,fg=palette.foreground; const jitter=Math.sin(p*Math.PI*10)*28;
  return <Shell palette={palette} glow="48% 38%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <g transform="translate(350 265)"><rect x="-62" y="-42" width="124" height="84" fill={a}/><rect x="-180" y="-58" width="88" height="116" fill="none" stroke={fg} strokeWidth="7"/><rect x="92" y="-58" width="88" height="116" fill="none" stroke={fg} strokeWidth="7"/></g>
    <path d={`M410 315 C680 ${420+jitter} 850 ${235-jitter} 1120 500`} fill="none" stroke={a} strokeWidth="13" strokeDasharray="18 15"/>
    <path d={`M410 345 C720 ${515-jitter} 900 ${335+jitter} 1190 560`} fill="none" stroke={fg} strokeWidth="6" opacity=".24"/>
    <rect x="1170" y="390" width="400" height="430" rx="46" fill="#0b1018" stroke={fg} strokeWidth="9"/>
    <path d="M1230 705 C1300 595 1380 640 1430 510 C1475 400 1540 465 1560 440" fill="none" stroke={fg} strokeWidth="9" opacity=".44"/>
    <circle cx={1370+jitter*.8} cy={600-jitter*.4} r="28" fill={a}/><circle cx="1370" cy="600" r="75" fill="none" stroke={a} strokeWidth="6" opacity=".25"/>
    <Label x={1370} y={885} fill={a} size={32}>POSITION DRIFTS</Label>
  </svg></Shell>;
}

function GridInduction({p,palette}){
  const a=palette.accent,fg=palette.foreground; const dash=-mix(p,0,180);
  return <Shell palette={palette} glow="51% 62%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <path d={`M-50 ${260+Math.sin(p*Math.PI*2)*24} C360 70 620 380 1010 220 C1360 75 1630 360 2000 175`} fill="none" stroke={a} strokeWidth="30" opacity=".18"/>
    <Label x={960} y={195} fill={a} size={31}>CHANGING MAGNETIC FIELD</Label>
    <Line x1={90} y1={845} x2={1830} y2={845} stroke={fg} width={6} opacity={.18}/>
    {[280,620,960,1300,1640].map((x,i)=><g key={x}><Line x1={x} y1={520} x2={x} y2={845} stroke={fg} width={9}/><Line x1={x-96} y1={590} x2={x+96} y2={590} stroke={fg} width={8}/><Line x1={x-62} y1={590} x2={x-110} y2={690} stroke={fg} width={7}/><Line x1={x+62} y1={590} x2={x+110} y2={690} stroke={fg} width={7}/></g>)}
    <path d="M180 780 C480 650 700 875 960 755 C1210 640 1455 855 1740 720" fill="none" stroke={a} strokeWidth="16" strokeDasharray="24 18" strokeDashoffset={dash}/>
    {[310,970,1610].map(x=><circle key={x} cx={x} cy="820" r="28" fill="none" stroke={a} strokeWidth="8"/>)}
    <Label x={960} y={975} fill={fg} size={31}>THE GROUND + LONG CONDUCTORS BECOME THE CIRCUIT</Label>
  </svg></Shell>;
}

function Myth({p,palette}){
  const a=palette.accent,fg=palette.foreground; const reveal=mix(p,0,1);
  return <Shell palette={palette} glow="30% 48%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <rect x="270" y="285" width="350" height="510" rx="52" fill="#0a0f17" stroke={fg} strokeWidth="11"/><circle cx="445" cy="715" r="20" fill={fg} opacity=".45"/><rect x="322" y="360" width="246" height="270" rx="18" fill="rgba(234,231,225,.025)" stroke={fg} strokeWidth="5" opacity=".35"/>
    <path d="M760 535 H1110" stroke={fg} strokeWidth="7" opacity=".16"/><path d={`M800 435 L1030 665 M1030 435 L800 665`} stroke={a} strokeWidth="24" strokeLinecap="round" opacity={.72*reveal}/>
    <g transform="translate(1450 540)"><Line x1={0} y1={-190} x2={0} y2={190} stroke={fg} width={12}/><Line x1={-135} y1={-90} x2={135} y2={-90} stroke={fg} width={10}/><Line x1={-92} y1={-90} x2={-150} y2={38} stroke={fg} width={9}/><Line x1={92} y1={-90} x2={150} y2={38} stroke={fg} width={9}/><path d="M-260 120 C-120 35 70 205 270 88" fill="none" stroke={a} strokeWidth="16" strokeDasharray="24 16"/></g>
    <Label x={445} y={875} fill={fg} size={28}>PHONE</Label><Label x={1450} y={875} fill={a} size={28}>LONG GRID CONDUCTOR</Label>
  </svg></Shell>;
}

function Dependencies({p,palette}){
  const a=palette.accent,fg=palette.foreground; const nodes=[['POWER',320,300],['COMMS',850,235],['PAYMENTS',1390,320],['WATER',420,720],['LOGISTICS',970,730],['AIRPORTS',1510,690]];
  return <Shell palette={palette} glow="50% 52%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    {[[320,300,850,235],[320,300,420,720],[850,235,1390,320],[850,235,970,730],[1390,320,1510,690],[970,730,1510,690]].map((q,i)=><path key={i} d={`M${q[0]} ${q[1]} C${(q[0]+q[2])/2} ${q[1]} ${(q[0]+q[2])/2} ${q[3]} ${q[2]} ${q[3]}`} fill="none" stroke={i<Math.floor(p*7)?a:fg} strokeWidth="7" opacity={i<Math.floor(p*7)?.82:.18}/>) }
    {nodes.map(([name,x,y],i)=><g key={name}><rect x={x-130} y={y-58} width="260" height="116" rx="24" fill={i===0?'rgba(255,179,64,.12)':'#0c1119'} stroke={i===0?a:fg} strokeWidth="7"/><Label x={x} y={y+11} fill={i===0?a:fg} size={28}>{name}</Label></g>)}
  </svg></Shell>;
}

function UnevenMap({p,palette}){
  const a=palette.accent,fg=palette.foreground; const dots=[[420,360,'POWER'],[720,270,'COMMS'],[1110,390,'GPS'],[1460,310,'OK'],[520,690,'OK'],[900,720,'POWER'],[1320,700,'COMMS'],[1580,610,'OK']];
  return <Shell palette={palette} glow="50% 48%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <path d="M220 275 C510 155 740 245 950 210 C1210 165 1470 210 1690 330 C1600 505 1670 690 1460 815 C1180 930 905 860 685 895 C455 825 275 690 220 520 Z" fill="rgba(234,231,225,.025)" stroke={fg} strokeWidth="7" opacity=".62"/>
    {dots.map(([x,y,t],i)=>{const on=p>(i/dots.length)*.7;return <g key={i}><circle cx={x} cy={y} r="46" fill={t==='OK'?'rgba(234,231,225,.03)':'rgba(255,179,64,.08)'} stroke={t==='OK'?fg:a} strokeWidth="7" opacity={on?1:.25}/><Label x={x} y={y+8} fill={t==='OK'?fg:a} size={18}>{t}</Label></g>})}
    <Label x={960} y={980} fill={fg} size={34}>DISRUPTION IS UNEVEN</Label>
  </svg></Shell>;
}

function Monitoring({p,palette}){
  const a=palette.accent,fg=palette.foreground; const scan=mix(p,220,1570);
  return <Shell palette={palette} glow="26% 34%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <circle cx="360" cy="480" r="150" fill="none" stroke={a} strokeWidth="14"/><path d="M470 410 Q560 355 635 420" fill="none" stroke={a} strokeWidth="15"/>
    <Line x1={610} y1={480} x2={1570} y2={480} stroke={fg} width={5} opacity={.18}/><circle cx={scan} cy="480" r="18" fill={a}/>
    <rect x="1280" y="290" width="390" height="420" rx="24" fill="#0b1018" stroke={fg} strokeWidth="8"/>
    <path d="M1340 600 L1420 520 L1490 560 L1570 390 L1630 430" fill="none" stroke={a} strokeWidth="10"/><Line x1={1340} y1={640} x2={1620} y2={640} stroke={fg} width={5} opacity={.26}/>
    <Label x={1475} y={790} fill={fg} size={31}>WATCH • WARN • RECONFIGURE</Label>
  </svg></Shell>;
}

function Research({p,palette}){
  const a=palette.accent,fg=palette.foreground; const x=mix(p,380,1540); const y=760-(x-380)*.36;
  return <Shell palette={palette} glow="55% 42%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <Line x1={300} y1={820} x2={1640} y2={820} stroke={fg} width={6} opacity={.3}/><Line x1={300} y1={820} x2={300} y2={210} stroke={fg} width={6} opacity={.3}/>
    <path d="M350 760 C610 700 760 620 940 560 C1140 500 1350 390 1600 285" fill="none" stroke={a} strokeWidth="14"/>
    <path d="M350 760 C700 610 900 535 1110 470 C1320 420 1460 405 1600 395" fill="none" stroke={fg} strokeWidth="8" opacity=".24" strokeDasharray="18 16"/>
    <circle cx={x} cy={y} r="25" fill={a}/><Label x={965} y={935} fill={fg} size={31}>EXTREME-END RESPONSE MAY KEEP RISING</Label>
  </svg></Shell>;
}

function Payoff({p,palette}){
  const a=palette.accent,fg=palette.foreground; const flow=-mix(p,0,210);
  return <Shell palette={palette} glow="70% 25%"><svg viewBox="0 0 1920 1080" width="100%" height="100%">
    <defs><linearGradient id="pay6" x1="0" x2="1"><stop offset="0" stopColor={a} stopOpacity=".05"/><stop offset=".48" stopColor={a} stopOpacity=".88"/><stop offset="1" stopColor={fg} stopOpacity=".05"/></linearGradient></defs>
    <path d="M-100 245 C330 20 610 405 970 190 C1290 0 1550 330 2020 85" fill="none" stroke="url(#pay6)" strokeWidth="100" strokeLinecap="round"/>
    <path d="M0 900 Q410 730 780 840 T1450 820 T1980 890 L1980 1080 L0 1080 Z" fill="#10151e" stroke={fg} strokeWidth="6" opacity=".94"/>
    {[250,600,950,1300,1650].map((x,i)=><g key={x}><Line x1={x} y1={650} x2={x} y2={905} stroke={fg} width={8}/><Line x1={x-82} y1={705} x2={x+82} y2={705} stroke={fg} width={7}/></g>)}
    <path d="M100 835 C420 710 705 910 990 790 C1260 675 1470 875 1790 760" fill="none" stroke={a} strokeWidth="15" strokeDasharray="24 18" strokeDashoffset={flow}/>
    <Label x={960} y={1000} fill={fg} size={36}>BEAUTIFUL SKY. INVISIBLE STRESS TEST.</Label>
  </svg></Shell>;
}

function classify(beat){
  const t=`${beat?.text||''} ${beat?.sceneHeadline||''}`.toLowerCase();
  if(/beautiful|aurora|sky changes|phones come up/.test(t)) return 'aurora';
  if(/flare|speed of light|electromagnetic|first knock|cme is/.test(t)) return 'flarecme';
  if(/magnetic field|magnetosphere|shield|squeezes|couples with earth/.test(t)) return 'shield';
  if(/satellite|spacecraft|orbit|atmosphere heats|drag|starlink/.test(t)) return 'satellite';
  if(/gps|navigation|ionosphere|position|timing/.test(t)) return 'gps';
  if(/induced|geoelectric|transmission|transformer|power lines|grid operators|conductors/.test(t)) return 'grid';
  if(/phone|laptop|car|fries every|magic pulse|gadget/.test(t)) return 'myth';
  if(/backup power|data center|water|payments|warehouse|airline|dependencies|systems stacked/.test(t)) return 'dependencies';
  if(/one city|another might|uneven|map of disruption|rolling outage|fiber keeps/.test(t)) return 'map';
  if(/watch the sun|noaa|forecast|warning|operator|prepare spacecraft|engineering problem/.test(t)) return 'monitoring';
  if(/2026|nature|ceiling|researchers|measurements closer|relationship kept increasing/.test(t)) return 'research';
  if(/payoff|stress test|designed to bend|most beautiful thing/.test(t)) return 'payoff';
  return 'flarecme';
}

export const SolarStormExplainerScene=({beat,durationInFrames,palette=C})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const dur=Math.max(1,durationInFrames||90); const p=Math.max(0,Math.min(1,frame/(dur-1))); const intro=spring({fps,frame,config:{damping:19,stiffness:100,mass:.85}}); const q=Math.max(p,intro*.16); const kind=classify(beat);
  if(kind==='aurora') return <AuroraOpening p={q} palette={palette}/>;
  if(kind==='shield') return <Shield p={q} palette={palette}/>;
  if(kind==='satellite') return <Satellite p={q} palette={palette}/>;
  if(kind==='gps') return <GPS p={q} palette={palette}/>;
  if(kind==='grid') return <GridInduction p={q} palette={palette}/>;
  if(kind==='myth') return <Myth p={q} palette={palette}/>;
  if(kind==='dependencies') return <Dependencies p={q} palette={palette}/>;
  if(kind==='map') return <UnevenMap p={q} palette={palette}/>;
  if(kind==='monitoring') return <Monitoring p={q} palette={palette}/>;
  if(kind==='research') return <Research p={q} palette={palette}/>;
  if(kind==='payoff') return <Payoff p={q} palette={palette}/>;
  return <FlareVsCme p={q} palette={palette}/>;
};
