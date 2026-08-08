import React from 'react';

const roughStroke = (stroke, strokeWidth = 6, opacity = 1) => ({
  fill: 'none',
  stroke,
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  opacity,
});

export const RoughLine = ({x1,y1,x2,y2,stroke='#eae7e1',strokeWidth=6,opacity=1,dash}) => <g opacity={opacity}>
  <line x1={x1} y1={y1} x2={x2} y2={y2} {...roughStroke(stroke,strokeWidth)} strokeDasharray={dash}/>
  <line x1={x1+2} y1={y1-1} x2={x2+1} y2={y2+2} {...roughStroke(stroke,Math.max(2,strokeWidth*.42),.24)} strokeDasharray={dash}/>
</g>;

export const RoughPath = ({d,stroke='#eae7e1',strokeWidth=6,fill='none',opacity=1,dash}) => <g opacity={opacity}>
  <path d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash}/>
  {fill==='none'?<path d={d} fill="none" stroke={stroke} strokeWidth={Math.max(2,strokeWidth*.38)} opacity=".22" transform="translate(2 -1)" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash}/>:null}
</g>;

export const DoodlePerson = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',pose='neutral',opacity=1,fill='none'}) => {
  const arms = {
    neutral:[[0,72,-38,118],[0,72,38,118]],
    open:[[0,72,-60,62],[0,72,60,62]],
    celebrate:[[0,72,-48,20],[0,72,48,20]],
    reach:[[0,72,-25,112],[0,72,70,42]],
    tired:[[0,72,-48,104],[0,72,48,104]],
    point:[[0,72,-25,108],[0,72,78,74]],
  }[pose] || [[0,72,-38,118],[0,72,38,118]];
  const bodyD = pose==='tired' ? 'M0 48 Q10 92 4 150' : 'M0 48 Q-3 98 0 150';
  return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <circle cx="0" cy="0" r="34" fill={fill} stroke={stroke} strokeWidth="7"/>
    <circle cx="-11" cy="-5" r="3.5" fill={stroke}/><circle cx="11" cy="-5" r="3.5" fill={stroke}/>
    {pose==='tired'?<path d="M-12 15 Q0 7 12 15" {...roughStroke(stroke,4)}/>:<path d="M-12 13 Q0 22 12 13" {...roughStroke(accent,4)}/>}
    <RoughPath d={bodyD} stroke={stroke} strokeWidth={7}/>
    {arms.map(([a,b,c,d],i)=><RoughLine key={i} x1={a} y1={b} x2={c} y2={d} stroke={i===1&&pose==='point'?accent:stroke} strokeWidth={7}/>)}
    <RoughLine x1="0" y1="150" x2="-38" y2="220" stroke={stroke} strokeWidth={7}/>
    <RoughLine x1="0" y1="150" x2="40" y2="220" stroke={stroke} strokeWidth={7}/>
  </g>;
};

export const DoodleBed = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <rect x="0" y="50" width="260" height="92" rx="16" fill="rgba(234,231,225,.035)" stroke={stroke} strokeWidth="7"/>
  <path d="M0 50 V18 M260 50 V18 M0 142 V178 M260 142 V178" {...roughStroke(stroke,7)}/>
  <rect x="18" y="62" width="74" height="42" rx="18" fill="none" stroke={accent} strokeWidth="5"/>
  <path d="M104 70 Q178 50 248 76" {...roughStroke(stroke,4,.55)}/>
</g>;

export const DoodleClock = ({x=0,y=0,r=120,stroke='#eae7e1',accent='#ffb340',hour=10,minute=10,showTicks=true,opacity=1}) => {
  const aHour=(hour%12)/12*Math.PI*2-Math.PI/2; const aMin=minute/60*Math.PI*2-Math.PI/2;
  return <g transform={`translate(${x} ${y})`} opacity={opacity}>
    <circle cx="0" cy="0" r={r} fill="rgba(11,13,18,.55)" stroke={stroke} strokeWidth="7"/>
    {showTicks?Array.from({length:12}).map((_,i)=>{const a=i/12*Math.PI*2-Math.PI/2;return <line key={i} x1={Math.cos(a)*r*.78} y1={Math.sin(a)*r*.78} x2={Math.cos(a)*r*.91} y2={Math.sin(a)*r*.91} stroke={i%3===0?accent:stroke} strokeWidth={i%3===0?6:3} opacity={i%3===0?1:.45}/>;}):null}
    <line x1="0" y1="0" x2={Math.cos(aHour)*r*.48} y2={Math.sin(aHour)*r*.48} stroke={stroke} strokeWidth="8" strokeLinecap="round"/>
    <line x1="0" y1="0" x2={Math.cos(aMin)*r*.67} y2={Math.sin(aMin)*r*.67} stroke={accent} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="0" cy="0" r="9" fill={accent}/>
  </g>;
};

export const DoodlePhone = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',notifications=3,opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <rect x="0" y="0" width="170" height="292" rx="25" fill="#11151d" stroke={stroke} strokeWidth="7"/>
  <rect x="18" y="35" width="134" height="202" rx="14" fill="rgba(255,179,64,.035)" stroke={stroke} strokeWidth="3" opacity=".7"/>
  <circle cx="85" cy="263" r="12" fill="none" stroke={accent} strokeWidth="4"/>
  {Array.from({length:Math.min(4,notifications)}).map((_,i)=><g key={i} transform={`translate(${32+i*30} ${62+i*34})`}><circle r="15" fill={accent}/><text x="0" y="6" textAnchor="middle" fill="#0b0d12" fontFamily="Arial" fontSize="18" fontWeight="900">!</text></g>)}
</g>;

export const DoodleBuilding = ({x=0,y=0,w=150,h=240,stroke='#eae7e1',accent='#ffb340',lit=.5,label,opacity=1}) => <g transform={`translate(${x} ${y})`} opacity={opacity}>
  <rect x="0" y="0" width={w} height={h} rx="8" fill="rgba(234,231,225,.025)" stroke={stroke} strokeWidth="6"/>
  {Array.from({length:Math.max(2,Math.floor(h/65))}).map((_,row)=>Array.from({length:3}).map((__,col)=>{
    const on=((row*3+col)%10)/10<lit; return <rect key={`${row}-${col}`} x={18+col*(w-36)/3} y={25+row*58} width={(w-54)/3} height="23" rx="3" fill={on?accent:'rgba(234,231,225,.12)'}/>;
  }))}
  {label?<text x={w/2} y={h+34} textAnchor="middle" fill={stroke} opacity=".65" fontFamily="Arial" fontSize="21" fontWeight="800" letterSpacing="2">{label}</text>:null}
</g>;

export const DoodleArrow = ({x1,y1,x2,y2,stroke='#ffb340',strokeWidth=7,opacity=1}) => {
  const a=Math.atan2(y2-y1,x2-x1); const s=22;
  return <g opacity={opacity}><RoughLine x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth}/><path d={`M${x2} ${y2} L${x2-Math.cos(a-.6)*s} ${y2-Math.sin(a-.6)*s} M${x2} ${y2} L${x2-Math.cos(a+.6)*s} ${y2-Math.sin(a+.6)*s}`} {...roughStroke(stroke,strokeWidth)}/></g>;
};

export const PieClock = ({x=0,y=0,r=155,stroke='#eae7e1',accent='#ffb340',sliceStart=-Math.PI/2,sliceEnd=Math.PI/6,opacity=1}) => {
  const x1=Math.cos(sliceStart)*r, y1=Math.sin(sliceStart)*r, x2=Math.cos(sliceEnd)*r, y2=Math.sin(sliceEnd)*r;
  const large=(sliceEnd-sliceStart)%(Math.PI*2)>Math.PI?1:0;
  const d=`M0 0 L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  return <g transform={`translate(${x} ${y})`} opacity={opacity}>
    <circle r={r} fill="rgba(234,231,225,.025)" stroke={stroke} strokeWidth="7"/>
    <path d={d} fill={accent} opacity=".88" stroke={accent} strokeWidth="4"/>
    {Array.from({length:12}).map((_,i)=>{const a=i/12*Math.PI*2-Math.PI/2;return <line key={i} x1={Math.cos(a)*r*.84} y1={Math.sin(a)*r*.84} x2={Math.cos(a)*r*.95} y2={Math.sin(a)*r*.95} stroke={stroke} strokeWidth="3" opacity=".45"/>;})}
  </g>;
};

export const HandLabel = ({x=0,y=0,text,color='#eae7e1',size=28,anchor='start',opacity=1,weight=800,accentLine=false}) => <g opacity={opacity}>
  <text x={x} y={y} textAnchor={anchor} fill={color} fontFamily="Arial, Helvetica, sans-serif" fontSize={size} fontWeight={weight} letterSpacing={size*.035}>{text}</text>
  {accentLine?<path d={`M${anchor==='middle'?x-size*text.length*.2:x} ${y+10} q${size*text.length*.18} 8 ${size*text.length*.4} 0`} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" opacity=".7"/>:null}
</g>;

export const DoodleCard = ({x=0,y=0,w=300,h=160,stroke='#eae7e1',accent='#ffb340',title,value,opacity=1}) => <g transform={`translate(${x} ${y})`} opacity={opacity}>
  <rect x="0" y="0" width={w} height={h} rx="22" fill="rgba(11,13,18,.78)" stroke={stroke} strokeWidth="4" opacity=".96"/>
  <rect x="0" y="0" width="10" height={h} rx="5" fill={accent}/>
  {title?<text x="30" y="48" fill={stroke} opacity=".58" fontFamily="Arial" fontSize="22" fontWeight="800" letterSpacing="2">{title}</text>:null}
  {value?<text x="30" y="112" fill={accent} fontFamily="Arial" fontSize="52" fontWeight="900" letterSpacing="-1">{value}</text>:null}
</g>;

export const DoodleBrain = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',active=1,opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <path d="M-106 30 C-143 -18 -114 -82 -63 -84 C-40 -128 25 -126 48 -91 C97 -101 132 -54 113 -13 C150 26 118 83 72 82 C44 122 -20 114 -39 82 C-70 94 -108 70 -106 30Z" fill="rgba(234,231,225,.025)" stroke={stroke} strokeWidth="7" strokeLinejoin="round"/>
  {[[-62,-35],[-10,-60],[45,-36],[-48,28],[15,13],[65,30],[-8,67]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="8" fill={i<Math.ceil(active*7)?accent:stroke} opacity={i<Math.ceil(active*7)?1:.28}/>) }
  <path d="M-62 -35 L-10 -60 L45 -36 L15 13 L65 30 M-62 -35 L-48 28 L-8 67 L15 13 M-48 28 L15 13" fill="none" stroke={accent} strokeWidth="4" opacity={.35+.55*active}/>
</g>;

export const DoodleHeart = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <path d="M0 102 C-105 30 -98 -56 -40 -65 C-8 -70 0 -44 0 -44 C0 -44 8 -70 40 -65 C98 -56 105 30 0 102Z" fill="rgba(255,179,64,.08)" stroke={accent} strokeWidth="7"/>
  <path d="M-58 20 H-24 L-6 -18 L18 54 L36 17 H62" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
</g>;

export const DoodleShield = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <path d="M0 -92 C42 -66 74 -60 98 -58 V0 C98 66 56 111 0 139 C-56 111 -98 66 -98 0 V-58 C-74 -60 -42 -66 0 -92Z" fill="rgba(255,179,64,.06)" stroke={accent} strokeWidth="8"/>
  <path d="M-44 15 L-12 48 L55 -26" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
</g>;

export const DoodleBaby = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <circle r="48" fill="rgba(234,231,225,.02)" stroke={stroke} strokeWidth="7"/>
  <path d="M-24 -53 Q0 -78 22 -52" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"/>
  <circle cx="-15" cy="-5" r="4" fill={stroke}/><circle cx="15" cy="-5" r="4" fill={stroke}/>
  <path d="M-18 18 Q0 2 18 18" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round"/>
  <path d="M-45 55 Q0 95 45 55 M-35 72 L-63 105 M35 72 L63 105" fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round"/>
</g>;

export const DoodleBook = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <path d="M0 0 Q-74 -28 -142 -6 V118 Q-68 94 0 124 Q68 94 142 118 V-6 Q74 -28 0 0Z" fill="rgba(234,231,225,.025)" stroke={stroke} strokeWidth="6"/>
  <line x1="0" y1="0" x2="0" y2="124" stroke={accent} strokeWidth="5"/>
  <path d="M-116 28 H-30 M-116 55 H-44 M30 28 H116 M44 55 H116" {...roughStroke(stroke,3,.35)}/>
</g>;

export const DoodleChess = ({x=0,y=0,scale=1,stroke='#eae7e1',accent='#ffb340',opacity=1}) => <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
  <rect x="-112" y="-112" width="224" height="224" rx="10" fill="none" stroke={stroke} strokeWidth="6"/>
  {Array.from({length:8}).map((_,r)=>Array.from({length:8}).map((__,c)=>((r+c)%2===0?<rect key={`${r}-${c}`} x={-112+c*28} y={-112+r*28} width="28" height="28" fill={accent} opacity=".14"/>:null)))}
  <path d="M-34 64 H34 M-24 52 Q0 27 24 52 L16 -14 H-16Z M-12 -14 L-28 -58 H28 L12 -14" fill="rgba(255,179,64,.1)" stroke={accent} strokeWidth="5" strokeLinejoin="round"/>
</g>;
