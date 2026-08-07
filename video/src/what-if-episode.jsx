import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio} from '@remotion/media';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

const Icon = ({kind, accent, foreground, progress}) => {
  const common = {fill:'none', stroke:foreground, strokeWidth:7, strokeLinecap:'round', strokeLinejoin:'round'};
  const glow = {filter:'drop-shadow(0 0 16px rgba(255,179,64,0.35))'};
  if (kind === 'clock') return (
    <svg viewBox="0 0 360 360" width="360" height="360" style={glow}>
      <circle cx="180" cy="180" r="134" {...common}/>
      <line x1="180" y1="180" x2="180" y2="94" {...common}/>
      <line x1="180" y1="180" x2={230 + progress * 34} y2={205 - progress * 20} stroke={accent} strokeWidth="10" strokeLinecap="round"/>
      <circle cx="180" cy="180" r="12" fill={accent}/>
      {[0,90,180,270].map((d) => {
        const r = d * Math.PI / 180;
        const x1 = 180 + Math.cos(r) * 112; const y1 = 180 + Math.sin(r) * 112;
        const x2 = 180 + Math.cos(r) * 126; const y2 = 180 + Math.sin(r) * 126;
        return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth="8" strokeLinecap="round"/>;
      })}
    </svg>
  );
  if (kind === 'brain') return (
    <svg viewBox="0 0 360 360" width="360" height="360" style={glow}>
      <path d="M110 245 C72 220 76 170 104 151 C93 111 128 77 164 91 C184 58 238 67 245 105 C286 105 307 143 288 176 C314 211 286 258 247 256 C223 286 177 282 158 253 C139 260 123 255 110 245Z" {...common}/>
      {[[132,155],[184,126],[231,151],[151,205],[213,214]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="10" fill={i===2?accent:foreground}/>) }
      <path d="M132 155 L184 126 L231 151 M132 155 L151 205 L213 214 L231 151 M184 126 L213 214" stroke={accent} strokeWidth="5" fill="none" opacity="0.8"/>
    </svg>
  );
  if (kind === 'city') return (
    <svg viewBox="0 0 420 360" width="420" height="360" style={glow}>
      {[40,112,202,292,350].map((x,i)=>{
        const h=[170,235,205,275,145][i]; const y=320-h;
        return <g key={x}><rect x={x} y={y} width="58" height={h} rx="4" {...common}/>{Array.from({length:5}).map((_,j)=><rect key={j} x={x+14+(j%2)*24} y={y+28+Math.floor(j/2)*48} width="10" height="15" rx="2" fill={accent} opacity={0.45+0.45*((i+j)%2)}/>)}</g>
      })}
      <line x1="18" y1="320" x2="402" y2="320" {...common}/>
    </svg>
  );
  if (kind === 'grid') return (
    <svg viewBox="0 0 420 360" width="420" height="360" style={glow}>
      {Array.from({length:6}).map((_,i)=><line key={'h'+i} x1="38" y1={62+i*48} x2="382" y2={62+i*48} stroke={foreground} strokeWidth="2" opacity="0.22"/>)}
      {Array.from({length:8}).map((_,i)=><line key={'v'+i} x1={46+i*46} y1="48" x2={46+i*46} y2="316" stroke={foreground} strokeWidth="2" opacity="0.18"/>)}
      <polyline points={`40,250 95,232 145,260 200,170 258,190 312,104 382,${105-progress*32}`} fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="312" cy="104" r="11" fill={accent}/>
    </svg>
  );
  if (kind === 'split') return (
    <svg viewBox="0 0 420 360" width="420" height="360" style={glow}>
      <circle cx="120" cy="150" r="64" {...common}/><circle cx="300" cy="150" r="64" {...common}/>
      <circle cx="99" cy="139" r="6" fill={foreground}/><circle cx="141" cy="139" r="6" fill={foreground}/>
      <circle cx="279" cy="139" r="6" fill={foreground}/><circle cx="321" cy="139" r="6" fill={foreground}/>
      <path d="M94 178 Q120 196 146 178 M274 178 Q300 196 326 178" {...common}/>
      <line x1="210" y1="62" x2="210" y2="300" stroke={accent} strokeWidth="8" strokeDasharray="18 18"/>
      <path d="M78 282 Q120 250 162 282 M258 282 Q300 250 342 282" {...common}/>
    </svg>
  );
  if (kind === 'sunmoon') return (
    <svg viewBox="0 0 420 360" width="420" height="360" style={glow}>
      <circle cx="128" cy="168" r="58" stroke={accent} strokeWidth="9" fill="none"/>
      {Array.from({length:8}).map((_,i)=>{const a=i*Math.PI/4; return <line key={i} x1={128+Math.cos(a)*78} y1={168+Math.sin(a)*78} x2={128+Math.cos(a)*101} y2={168+Math.sin(a)*101} stroke={accent} strokeWidth="8" strokeLinecap="round"/>})}
      <path d="M304 106 C250 118 244 207 302 228 C265 251 216 227 207 181 C198 135 236 96 280 95 C289 95 297 99 304 106Z" {...common}/>
      <path d="M56 302 C118 266 169 328 222 286 C266 250 319 298 372 262" stroke={foreground} strokeWidth="5" fill="none" opacity="0.42"/>
    </svg>
  );
  if (kind === 'scale') return (
    <svg viewBox="0 0 420 360" width="420" height="360" style={glow}>
      <line x1="210" y1="72" x2="210" y2="292" {...common}/><line x1="120" y1="292" x2="300" y2="292" {...common}/>
      <line x1="102" y1={122-progress*16} x2="318" y2={122+progress*16} stroke={accent} strokeWidth="10" strokeLinecap="round"/>
      <path d="M102 122 L62 228 H142 Z M318 122 L278 228 H358 Z" {...common}/>
    </svg>
  );
  if (kind === 'hourglass') return (
    <svg viewBox="0 0 360 360" width="360" height="360" style={glow}>
      <path d="M96 54 H264 M96 306 H264 M116 58 C116 130 160 142 180 180 C201 143 244 130 244 58 M116 302 C116 232 159 219 180 180 C201 218 244 232 244 302" {...common}/>
      <path d={`M145 103 H215 L180 ${165+progress*18} Z`} fill={accent} opacity="0.9"/>
      <path d="M145 267 H215 L180 212 Z" fill={accent} opacity="0.75"/>
    </svg>
  );
  if (kind === 'work') return (
    <svg viewBox="0 0 420 360" width="420" height="360" style={glow}>
      <rect x="70" y="122" width="280" height="174" rx="20" {...common}/><path d="M154 122 V89 H266 V122" {...common}/>
      <line x1="70" y1="191" x2="350" y2="191" stroke={accent} strokeWidth="9"/><rect x="184" y="178" width="52" height="32" rx="8" fill={accent}/>
      <circle cx="329" cy="72" r="46" fill="#0b0d12" stroke={foreground} strokeWidth="7"/><line x1="329" y1="72" x2="329" y2="45" stroke={accent} strokeWidth="7"/><line x1="329" y1="72" x2="349" y2="84" stroke={accent} strokeWidth="7"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 360 360" width="360" height="360" style={glow}>
      <circle cx="180" cy="180" r={112 + progress*12} {...common}/>
      <circle cx="180" cy="180" r="54" stroke={accent} strokeWidth="10" fill="none"/>
      <line x1="180" y1="58" x2="180" y2="302" stroke={accent} strokeWidth="4" opacity="0.45"/>
      <line x1="58" y1="180" x2="302" y2="180" stroke={accent} strokeWidth="4" opacity="0.45"/>
    </svg>
  );
};

const Scene = ({scene, palette}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = interpolate(frame, [0, 0.7*fps], [0, 1], {...clamp, easing:Easing.bezier(0.16,1,0.3,1)});
  const exit = interpolate(frame, [Math.max(0, scene.duration*fps-0.55*fps), Math.max(1, scene.duration*fps)], [1, 0], clamp);
  const opacity = Math.min(reveal, exit);
  const float = interpolate(frame, [0, Math.max(1, scene.duration*fps)], [-10, 12], clamp);
  const accent = palette.accent; const foreground = palette.foreground;
  return (
    <AbsoluteFill style={{opacity, padding:'92px 118px 160px', display:'flex', flexDirection:'row', alignItems:'center', gap:110}}>
      <div style={{width:520, height:520, display:'flex', alignItems:'center', justifyContent:'center', translate:`0 ${float}px`, scale:interpolate(frame,[0,0.8*fps],[0.88,1],{...clamp,easing:Easing.bezier(0.16,1,0.3,1)})}}>
        <Icon kind={scene.visual} accent={accent} foreground={foreground} progress={interpolate(frame,[0,Math.max(1,scene.duration*fps)],[0,1],clamp)}/>
      </div>
      <div style={{flex:1, maxWidth:940}}>
        <div style={{fontFamily:'Arial, Helvetica, sans-serif', fontSize:28, fontWeight:700, letterSpacing:7, color:accent, marginBottom:28}}>WHAT IF EXPLAINS</div>
        <div style={{fontFamily:'Arial, Helvetica, sans-serif', fontSize:112, lineHeight:0.92, letterSpacing:-5, fontWeight:800, color:foreground, maxWidth:900}}>{scene.headline}</div>
        {scene.subhead ? <div style={{fontFamily:'Arial, Helvetica, sans-serif', fontSize:38, lineHeight:1.25, marginTop:34, color:foreground, opacity:0.68, maxWidth:820}}>{scene.subhead}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

const Captions = ({captions, palette}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = (captions || []).find((c) => t >= Number(c.start) && t < Number(c.end));
  if (!cue) return null;
  const cueFrame = Math.max(0, frame - Math.floor(cue.start * fps));
  return (
    <div style={{position:'absolute', left:250, right:250, bottom:72, display:'flex', justifyContent:'center', opacity:interpolate(cueFrame,[0,5],[0,1],clamp)}}>
      <div style={{fontFamily:'Arial, Helvetica, sans-serif', fontSize:42, lineHeight:1.25, fontWeight:700, color:palette.foreground, textAlign:'center', background:'rgba(11,13,18,0.78)', border:'1px solid rgba(234,231,225,0.16)', borderRadius:24, padding:'16px 26px', boxShadow:'0 16px 60px rgba(0,0,0,0.34)'}}>{cue.text}</div>
    </div>
  );
};

export const WhatIfEpisode = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const palette = props.palette || {background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
  return (
    <AbsoluteFill style={{backgroundColor:palette.background, overflow:'hidden'}}>
      <div style={{position:'absolute', inset:-200, background:`radial-gradient(circle at ${22+Math.sin(frame/90)*6}% 36%, rgba(255,179,64,0.13), transparent 30%), radial-gradient(circle at 78% 72%, rgba(255,179,64,0.06), transparent 28%)`}}/>
      <div style={{position:'absolute', inset:0, opacity:0.14, backgroundImage:'linear-gradient(rgba(234,231,225,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(234,231,225,.12) 1px, transparent 1px)', backgroundSize:'90px 90px', translate:`${-frame%90}px ${-(frame*0.35)%90}px`}}/>
      {(props.scenes || []).map((scene) => {
        const from = Math.max(0, Math.floor(Number(scene.start || 0) * fps));
        const durationInFrames = Math.max(1, Math.ceil(Number(scene.duration || 1) * fps));
        return <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}><Scene scene={scene} palette={palette}/></Sequence>;
      })}
      {props.audio ? <Audio src={staticFile(props.audio)}/> : null}
      <Captions captions={props.captions || []} palette={palette}/>
      <div style={{position:'absolute', top:52, right:72, fontFamily:'Arial, Helvetica, sans-serif', fontSize:22, fontWeight:700, letterSpacing:4, color:palette.foreground, opacity:0.36}}>{props.episodeId}</div>
    </AbsoluteFill>
  );
};
