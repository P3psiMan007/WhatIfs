import React from "react";

export const BS = {
  bg: "#10131a",
  bg2: "#171b24",
  cream: "#efe8d8",
  amber: "#e0aa55",
  blue: "#7896bd",
  red: "#bd6258",
  green: "#769b83",
  faint: "#343a47",
};

export const stroke = {
  fill: "none",
  stroke: BS.cream,
  strokeWidth: 8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Wave: React.FC<{x: number; y: number; width?: number; amp?: number; color?: string; opacity?: number; phase?: number}> = ({x,y,width=360,amp=34,color=BS.blue,opacity=1,phase=0}) => {
  const pts = Array.from({length: 25}, (_, i) => {
    const px = x + (i / 24) * width;
    const py = y + Math.sin((i / 24) * Math.PI * 4 + phase) * amp;
    return `${px},${py}`;
  }).join(" ");
  return <polyline points={pts} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>;
};

export const Brain: React.FC<{x:number;y:number;scale?:number;leftColor?:string;rightColor?:string;patch?:boolean;patchColor?:string;opacity?:number}> = ({x,y,scale=1,leftColor=BS.cream,rightColor=BS.cream,patch=false,patchColor=BS.blue,opacity=1}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path d="M -12 -118 C -72 -154 -142 -112 -138 -48 C -184 -22 -176 58 -126 79 C -115 134 -45 151 0 112 C 45 151 115 134 126 79 C 176 58 184 -22 138 -48 C 142 -112 72 -154 12 -118" fill={BS.bg2} stroke={BS.cream} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M 0 -122 C -15 -80 15 -45 0 -7 C -18 32 14 68 0 111" fill="none" stroke={BS.faint} strokeWidth={6} strokeLinecap="round"/>
    <path d="M -16 -104 C -80 -118 -116 -80 -96 -34 M -116 -16 C -62 -18 -44 12 -62 51 M -101 69 C -58 55 -32 75 -22 111" fill="none" stroke={leftColor} strokeWidth={9} strokeLinecap="round" opacity={0.85}/>
    <path d="M 16 -104 C 80 -118 116 -80 96 -34 M 116 -16 C 62 -18 44 12 62 51 M 101 69 C 58 55 32 75 22 111" fill="none" stroke={rightColor} strokeWidth={9} strokeLinecap="round" opacity={0.85}/>
    {patch && <path d="M -96 -67 C -59 -97 -15 -78 -20 -39 C -22 -5 -67 4 -91 -18 C -111 -36 -112 -53 -96 -67 Z" fill={patchColor} opacity={0.55} stroke={patchColor} strokeWidth={5}/>} 
  </g>
);

export const Human: React.FC<{x:number;y:number;scale?:number;pose?:"stand"|"think"|"sit"|"sleep"|"work";eyeMode?:"open"|"closed"|"split";accent?:string;opacity?:number}> = ({x,y,scale=1,pose="stand",eyeMode="open",accent=BS.cream,opacity=1}) => {
  const headY = -150;
  const armLeft = pose === "think" ? "M -28 -45 Q -72 -85 -46 -136" : pose === "work" || pose === "sit" ? "M -28 -45 Q -80 -10 -120 5" : "M -28 -45 L -80 35";
  const armRight = pose === "work" || pose === "sit" ? "M 28 -45 Q 80 -10 120 5" : "M 28 -45 L 80 35";
  const legs = pose === "sit" ? <><path d="M -20 42 L -75 90 L -5 92" {...stroke}/><path d="M 20 42 L 75 90 L 145 92" {...stroke}/></> : pose === "sleep" ? <path d="M -20 42 L 75 58 L 145 45" {...stroke}/> : <><path d="M -20 42 L -48 145" {...stroke}/><path d="M 20 42 L 52 145" {...stroke}/></>;
  return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <circle cx={0} cy={headY} r={64} fill={BS.bg2} stroke={accent} strokeWidth={8}/>
    {eyeMode === "closed" ? <><path d="M -34 -158 Q -22 -146 -10 -158" {...stroke}/><path d="M 10 -158 Q 22 -146 34 -158" {...stroke}/></> : eyeMode === "split" ? <><circle cx={-23} cy={-158} r={6} fill={BS.amber}/><path d="M 10 -158 Q 22 -146 34 -158" {...stroke}/></> : <><circle cx={-23} cy={-158} r={6} fill={BS.cream}/><circle cx={23} cy={-158} r={6} fill={BS.cream}/></>}
    <path d="M -20 -126 Q 0 -116 20 -126" {...stroke} strokeWidth={6}/>
    <path d="M 0 -86 L 0 42" {...stroke}/>
    <path d={armLeft} {...stroke}/><path d={armRight} {...stroke}/>
    {legs}
  </g>;
};

export const Mouse: React.FC<{x:number;y:number;scale?:number;sleeping?:boolean;brainPatch?:boolean;opacity?:number}> = ({x,y,scale=1,sleeping=false,brainPatch=false,opacity=1}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <ellipse cx={0} cy={0} rx={118} ry={64} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/>
    <circle cx={100} cy={-42} r={46} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/>
    <circle cx={74} cy={-78} r={25} fill={BS.bg2} stroke={BS.cream} strokeWidth={7}/>
    <circle cx={116} cy={-82} r={25} fill={BS.bg2} stroke={BS.cream} strokeWidth={7}/>
    {sleeping ? <path d="M 95 -46 Q 105 -36 116 -46" {...stroke} strokeWidth={5}/> : <circle cx={111} cy={-47} r={6} fill={BS.amber}/>} 
    <circle cx={147} cy={-35} r={6} fill={BS.red}/>
    <path d="M -116 -4 Q -190 -30 -205 24 Q -213 54 -185 58" {...stroke} strokeWidth={7}/>
    <path d="M -55 50 L -70 76 M 48 50 L 63 76" {...stroke} strokeWidth={7}/>
    {brainPatch && <><path d="M 63 -67 C 88 -92 125 -83 130 -58 C 134 -34 105 -21 80 -31 C 61 -39 52 -54 63 -67 Z" fill={BS.blue} opacity={0.5}/><Wave x={65} y={-55} width={62} amp={7} color={BS.blue}/></>}
  </g>
);

export const Dolphin: React.FC<{x:number;y:number;scale?:number;split?:"left"|"right"|"none";eyeOpen?:boolean;opacity?:number}> = ({x,y,scale=1,split="none",eyeOpen=true,opacity=1}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path d="M -250 18 C -140 -90 70 -102 210 -14 C 238 3 257 22 275 42 C 238 30 209 31 177 35 C 70 111 -103 110 -225 54 C -273 34 -293 16 -324 8 C -299 6 -278 8 -250 18 Z" fill={BS.bg2} stroke={BS.cream} strokeWidth={8} strokeLinejoin="round"/>
    <path d="M -28 -66 Q -5 -140 58 -154 Q 28 -91 76 -66" fill={BS.bg2} stroke={BS.cream} strokeWidth={8} strokeLinejoin="round"/>
    <path d="M -105 73 Q -62 139 7 129 Q -34 94 -1 75" fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/>
    <path d="M -300 4 L -375 -55 Q -338 1 -376 62 L -300 24" fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/>
    {eyeOpen ? <circle cx={190} cy={-27} r={7} fill={BS.amber}/> : <path d="M 174 -25 Q 190 -14 205 -27" {...stroke} strokeWidth={6}/>} 
    {split !== "none" && <g transform="translate(105 -25) scale(.52)"><Brain x={0} y={0} scale={0.72} leftColor={split === "left" ? BS.blue : BS.amber} rightColor={split === "right" ? BS.blue : BS.amber}/></g>}
  </g>
);

export const Bird: React.FC<{x:number;y:number;scale?:number;recorder?:boolean;sleepSide?:"left"|"right"|"both"|"none";opacity?:number}> = ({x,y,scale=1,recorder=false,sleepSide="none",opacity=1}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path d="M -260 20 Q -115 -150 0 -24 Q 115 -150 270 10 Q 128 -70 34 40 Q 8 64 0 85 Q -8 64 -34 40 Q -128 -70 -260 20 Z" fill={BS.bg2} stroke={BS.cream} strokeWidth={8} strokeLinejoin="round"/>
    <circle cx={10} cy={-18} r={32} fill={BS.bg2} stroke={BS.cream} strokeWidth={7}/>
    <path d="M 38 -18 L 86 -5 L 39 2" fill={BS.amber} stroke={BS.amber} strokeWidth={4}/>
    <circle cx={18} cy={-27} r={5} fill={sleepSide === "both" || sleepSide === "right" ? BS.blue : BS.amber}/>
    {recorder && <><rect x={-3} y={-68} width={30} height={21} rx={5} fill={BS.amber}/><path d="M 12 -67 Q -30 -104 -58 -86" fill="none" stroke={BS.amber} strokeWidth={5}/></>}
  </g>
);

export const Switch: React.FC<{x:number;y:number;scale?:number;progress?:number;broken?:boolean}> = ({x,y,scale=1,progress=0,broken=false}) => {
  const angle = -32 + progress * 64;
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-120} y={-80} width={240} height={160} rx={50} fill={BS.bg2} stroke={BS.cream} strokeWidth={9}/>
    <circle cx={-64} cy={0} r={38} fill={BS.blue} opacity={0.45}/><circle cx={64} cy={0} r={38} fill={BS.amber} opacity={0.45}/>
    <g transform={`rotate(${angle})`}><line x1={0} y1={0} x2={0} y2={-105} stroke={BS.cream} strokeWidth={18} strokeLinecap="round"/><circle cx={0} cy={0} r={20} fill={BS.cream}/></g>
    {broken && <path d="M -22 -78 L -3 -29 L -28 8 L 8 34 L -8 82" fill="none" stroke={BS.red} strokeWidth={8} strokeLinecap="round"/>}
  </g>;
};

export const Clock: React.FC<{x:number;y:number;scale?:number;value?:string}> = ({x,y,scale=1,value}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle cx={0} cy={0} r={105} fill={BS.bg2} stroke={BS.cream} strokeWidth={9}/>
    <line x1={0} y1={0} x2={-5} y2={-62} stroke={BS.amber} strokeWidth={9} strokeLinecap="round"/>
    <line x1={0} y1={0} x2={55} y2={22} stroke={BS.cream} strokeWidth={8} strokeLinecap="round"/>
    {value && <text x={0} y={165} textAnchor="middle" fill={BS.amber} fontSize={64} fontFamily="Inter, Arial" fontWeight={800}>{value}</text>}
  </g>
);

export const Bed: React.FC<{x:number;y:number;scale?:number}> = ({x,y,scale=1}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-175} y={-45} width={350} height={105} rx={22} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/>
    <rect x={-175} y={-115} width={80} height={75} rx={18} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/>
    <line x1={-172} y1={60} x2={-172} y2={115} {...stroke}/><line x1={172} y1={60} x2={172} y2={115} {...stroke}/>
  </g>
);

export const Label: React.FC<{x:number;y:number;text:string;color?:string;size?:number;anchor?:"start"|"middle"|"end";opacity?:number}> = ({x,y,text,color=BS.cream,size=58,anchor="middle",opacity=1}) => <text x={x} y={y} textAnchor={anchor} fill={color} fontFamily="Inter, Arial, sans-serif" fontSize={size} fontWeight={800} opacity={opacity}>{text}</text>;

export const Arrow: React.FC<{x1:number;y1:number;x2:number;y2:number;color?:string;opacity?:number;dashed?:boolean}> = ({x1,y1,x2,y2,color=BS.amber,opacity=1,dashed=false}) => {
  const angle = Math.atan2(y2-y1,x2-x1);
  const hx = x2 - Math.cos(angle)*26; const hy = y2 - Math.sin(angle)*26;
  return <g opacity={opacity}><line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={dashed?"20 18":undefined}/><path d={`M ${x2} ${y2} L ${hx + Math.cos(angle+2.4)*28} ${hy + Math.sin(angle+2.4)*28} L ${hx + Math.cos(angle-2.4)*28} ${hy + Math.sin(angle-2.4)*28} Z`} fill={color}/></g>;
};
