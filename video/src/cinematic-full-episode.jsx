import React from 'react';
import {AbsoluteFill,Img,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';

const CLAMP={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const BG='#090c12';
const FG='#f0eee8';
const AMBER='#ffb340';
const BLUE='#7fa9d8';
const PHOTOS=[
  'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:c07e6450-2b34-49ec-aec7-9499bd2094be',
  'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:63246ed7-bf56-46ce-931b-48c800b3a661',
  'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:722cf062-0d56-4e4c-ab85-43e13e4a6cd5',
  'https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:87d19717-40f8-42e7-8feb-aa1baf7242cb',
];

const seed=(n)=>{let x=(n*9301+49297)%233280;return()=>{x=(x*9301+49297)%233280;return x/233280;};};
const localProgress=(frame,duration)=>Math.max(0,Math.min(1,frame/Math.max(1,duration-1)));

const FilmBase=({warm=false,children})=><AbsoluteFill style={{backgroundColor:BG,overflow:'hidden',fontFamily:'Arial, Helvetica, sans-serif',color:FG}}>
  <AbsoluteFill style={{background:warm?'radial-gradient(85% 80% at 70% 42%, rgba(255,179,64,.15), transparent 58%), linear-gradient(145deg,#10141d,#090c12 72%)':'radial-gradient(90% 75% at 42% 38%, rgba(83,126,176,.16), transparent 62%), linear-gradient(145deg,#10151e,#090c12 74%)'}}/>
  {children}
  <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(3,5,9,.03) 42%,rgba(3,5,9,.55) 100%)',pointerEvents:'none'}}/>
  <AbsoluteFill style={{boxShadow:'inset 0 0 200px rgba(0,0,0,.5)',pointerEvents:'none'}}/>
  <AbsoluteFill style={{opacity:.035,backgroundImage:'radial-gradient(circle,rgba(255,255,255,.8) .7px,transparent .8px)',backgroundSize:'11px 11px',pointerEvents:'none'}}/>
</AbsoluteFill>;

export const CinematicPhoto=({index=0,durationInFrames=150,align='center',dark=.22})=>{
  const frame=useCurrentFrame();
  const p=localProgress(frame,durationInFrames);
  const scale=interpolate(p,[0,1],[1.025,1.09],CLAMP);
  const x=interpolate(p,[0,1],[index%2===0?-16:14,index%2===0?12:-12],CLAMP);
  const y=interpolate(p,[0,1],[6,-5],CLAMP);
  return <AbsoluteFill>
    <Img src={PHOTOS[index%PHOTOS.length]} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:align,transform:`translate(${x}px,${y}px) scale(${scale})`,filter:'saturate(.9) contrast(1.05) brightness(.92)'}}/>
    <AbsoluteFill style={{background:`linear-gradient(180deg,rgba(5,8,14,${dark*.25}) 15%,rgba(5,8,14,${dark}) 100%)`}}/>
  </AbsoluteFill>;
};

const CaptionSafeGlow=({x='70%',y='38%',color='255,179,64',opacity=.22})=><div style={{position:'absolute',left:x,top:y,width:650,height:650,transform:'translate(-50%,-50%)',borderRadius:'50%',background:`radial-gradient(circle,rgba(${color},${opacity}) 0%,rgba(${color},0) 68%)`,filter:'blur(20px)'}}/>;

const ClockFace=({size=500,left=1100,top=205,spin=0})=>{
  const marks=Array.from({length:24},(_,i)=>i);
  return <div style={{position:'absolute',left,top,width:size,height:size,borderRadius:'50%',border:'2px solid rgba(240,238,232,.32)',boxShadow:'0 0 70px rgba(255,179,64,.09), inset 0 0 50px rgba(255,255,255,.025)'}}>
    {marks.map(i=><div key={i} style={{position:'absolute',left:'50%',top:'50%',width:i%6===0?3:1,height:i%6===0?18:10,background:i%6===0?AMBER:'rgba(240,238,232,.36)',transformOrigin:`50% ${-size*.44}px`,transform:`translate(-50%,${size*.44}px) rotate(${i*15}deg)`}}/>)}
    <div style={{position:'absolute',left:'50%',top:'50%',width:5,height:size*.27,background:FG,borderRadius:6,transformOrigin:'50% 100%',transform:`translate(-50%,-100%) rotate(${spin}deg)`}}/>
    <div style={{position:'absolute',left:'50%',top:'50%',width:7,height:size*.19,background:AMBER,borderRadius:6,transformOrigin:'50% 100%',transform:`translate(-50%,-100%) rotate(${spin*.18+65}deg)`}}/>
    <div style={{position:'absolute',left:'50%',top:'50%',width:18,height:18,borderRadius:'50%',background:AMBER,transform:'translate(-50%,-50%)'}}/>
  </div>;
};

const HookScene=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame();
  const p=localProgress(frame,durationInFrames);
  if(beatOrdinal<=4)return <FilmBase><CinematicPhoto index={(beatOrdinal-1)%4} durationInFrames={durationInFrames}/>{beatOrdinal===3?<ClockFace spin={interpolate(p,[0,1],[20,190],CLAMP)}/>:null}</FilmBase>;
  return <FilmBase warm><CinematicPhoto index={3} durationInFrames={durationInFrames} dark={.34}/><CaptionSafeGlow/><ClockFace left={1080} top={190} size={520} spin={interpolate(p,[0,1],[190,430],CLAMP)}/></FilmBase>;
};

const TimeLifeScene=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames);
  if(beatOrdinal%3===1)return <FilmBase warm><CinematicPhoto index={2} durationInFrames={durationInFrames} align='52% center'/><div style={{position:'absolute',left:120,top:130,fontSize:250,fontWeight:800,letterSpacing:-14,color:AMBER,textShadow:'0 12px 45px rgba(0,0,0,.65)'}}>+8</div><div style={{position:'absolute',left:150,top:390,fontSize:62,fontWeight:750,letterSpacing:5}}>HOURS / DAY</div></FilmBase>;
  const rings=Array.from({length:8},(_,i)=>i);
  return <FilmBase><CaptionSafeGlow x='46%' y='45%' color='127,169,216' opacity={.18}/>{rings.map(i=><div key={i} style={{position:'absolute',left:960,top:505,width:210+i*90,height:210+i*90,borderRadius:'50%',border:`${i===0?3:1}px solid ${i%2?`rgba(127,169,216,${.34-i*.025})`:`rgba(255,179,64,${.30-i*.025})`}`,transform:`translate(-50%,-50%) scale(${interpolate(p,[0,1],[.96,1.04],CLAMP)}) rotate(${(i%2?-1:1)*p*14}deg)`}}/>)}<div style={{position:'absolute',left:140,bottom:220,width:760,fontSize:76,lineHeight:1.02,fontWeight:760,letterSpacing:-3}}>{beatOrdinal%2?'A SECOND LIFE':'TIME COMES BACK'}</div></FilmBase>;
};

export const NeuralField=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames); const rnd=seed(301+beatOrdinal);
  const nodes=Array.from({length:34},()=>({x:180+rnd()*1560,y:140+rnd()*720,r:2+rnd()*5}));
  const links=nodes.slice(0,28).map((n,i)=>({a:n,b:nodes[(i*7+5)%nodes.length]}));
  return <FilmBase><CaptionSafeGlow x='52%' y='45%' color='80,132,210' opacity={.22}/><svg width='1920' height='1080' style={{position:'absolute',inset:0,transform:`scale(${1+p*.025}) translateY(${-p*8}px)`}}>{links.map((l,i)=><line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke='rgba(127,169,216,.13)' strokeWidth='1.5'/>) }{nodes.map((n,i)=><g key={i}><circle cx={n.x} cy={n.y} r={n.r*4} fill='rgba(82,137,205,.04)'/><circle cx={n.x} cy={n.y} r={n.r} fill={i%5===0?AMBER:'rgba(196,218,245,.75)'} opacity={.65+.3*Math.sin(frame/17+i)}/></g>)}</svg><div style={{position:'absolute',left:140,top:145,fontSize:24,letterSpacing:6,color:'rgba(240,238,232,.58)'}}>BIOLOGY / CONTINUOUS MAINTENANCE</div><div style={{position:'absolute',left:138,bottom:205,fontSize:70,fontWeight:740,maxWidth:820,lineHeight:1.03}}>{beatOrdinal%3===0?'REPAIR WHILE AWAKE':beatOrdinal%3===1?'MEMORY NEVER CLOCKS OUT':'NO SLEEP DEBT'}</div></FilmBase>;
};

export const CircadianHorizon=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames); const sunX=interpolate(p,[0,1],[310,1590],CLAMP); const sunY=520-260*Math.sin(p*Math.PI);
  return <FilmBase><AbsoluteFill style={{background:'linear-gradient(180deg,#07101e 0%,#182b43 46%,#b9683f 74%,#10141d 100%)'}}/><CaptionSafeGlow x={`${sunX/19.2}%`} y={`${sunY/10.8}%`} opacity={.3}/><div style={{position:'absolute',left:sunX-48,top:sunY-48,width:96,height:96,borderRadius:'50%',background:AMBER,boxShadow:'0 0 90px rgba(255,179,64,.55)'}}/><div style={{position:'absolute',left:0,right:0,top:660,height:3,background:'rgba(240,238,232,.18)'}}/><div style={{position:'absolute',left:105,top:112,fontSize:24,letterSpacing:6}}>CIRCADIAN TIME ≠ SLEEP</div>{Array.from({length:7},(_,i)=><div key={i} style={{position:'absolute',left:110+i*270,top:700+(i%2)*28,width:210,height:170,background:i%2?'#07101b':'#0a1624',borderTop:'2px solid rgba(127,169,216,.16)'}}/>)}<div style={{position:'absolute',left:120,bottom:150,fontSize:62,fontWeight:760}}>{beatOrdinal%2?'ONE PLANET. MANY SCHEDULES.':'NIGHT STILL EXISTS INSIDE YOU.'}</div></FilmBase>;
};

export const CityGrid=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames); const rnd=seed(710+beatOrdinal); const buildings=Array.from({length:34},(_,i)=>({x:(i%17)*120-40,y:470+Math.floor(i/17)*250,w:75+rnd()*60,h:110+rnd()*260,lit:rnd()}));
  return <FilmBase warm><AbsoluteFill style={{transform:`translateY(${interpolate(p,[0,1],[14,-10],CLAMP)}) scale(${interpolate(p,[0,1],[1.02,1.055],CLAMP)})`}}><svg width='1920' height='1080' style={{position:'absolute',inset:0}}>{buildings.map((b,i)=><g key={i}><rect x={b.x} y={b.y-b.h} width={b.w} height={b.h} fill={i%3===0?'#121b28':'#0d1623'} stroke='rgba(127,169,216,.08)'/><g fill={i%5===0?AMBER:'rgba(205,220,237,.6)'} opacity={.42+.35*b.lit}>{Array.from({length:6},(_,w)=><rect key={w} x={b.x+12+(w%3)*22} y={b.y-b.h+22+Math.floor(w/3)*35} width='8' height='12' rx='1'/>)}</g></g>)}</svg></AbsoluteFill><div style={{position:'absolute',left:115,top:110,fontSize:25,letterSpacing:7,color:'rgba(240,238,232,.62)'}}>THE 24-HOUR ECONOMY</div><div style={{position:'absolute',left:115,bottom:185,fontSize:74,lineHeight:1,fontWeight:760,maxWidth:980}}>{beatOrdinal%4===0?'WHO OWNS THE EXTRA HOURS?':beatOrdinal%3===0?'MIDNIGHT BECOMES NORMAL':beatOrdinal%2?'THE CITY NEVER REALLY CLOSES':'EVERY UNUSED HOUR IS TEMPTING'}</div></FilmBase>;
};

export const BoundaryScene=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames); const notifications=Array.from({length:5},(_,i)=>i);
  return <FilmBase><CaptionSafeGlow x='68%' y='42%' color='127,169,216' opacity={.15}/><div style={{position:'absolute',right:255,top:135,width:460,height:780,borderRadius:66,border:'7px solid rgba(240,238,232,.46)',background:'linear-gradient(180deg,#111923,#080d14)',boxShadow:'0 40px 100px rgba(0,0,0,.55),0 0 70px rgba(127,169,216,.08)'}}><div style={{position:'absolute',top:36,left:'50%',width:110,height:18,borderRadius:20,background:'#020406',transform:'translateX(-50%)'}}/>{notifications.map((n)=><div key={n} style={{position:'absolute',left:35,right:35,top:130+n*102,height:76,borderRadius:18,background:'rgba(240,238,232,.075)',border:'1px solid rgba(240,238,232,.07)',transform:`translateX(${interpolate(p,[0,.25+n*.05,1],[70,0,-8],CLAMP)}px)`,opacity:interpolate(p,[0,.18+n*.05,.5+n*.05],[0,0,1],CLAMP)}}><div style={{margin:17,width:35,height:35,borderRadius:10,background:n%2?AMBER:BLUE}}/><div style={{position:'absolute',left:68,top:18,width:230,height:10,borderRadius:8,background:'rgba(240,238,232,.35)'}}/><div style={{position:'absolute',left:68,top:40,width:170,height:8,borderRadius:8,background:'rgba(240,238,232,.16)'}}/></div>)}</div><div style={{position:'absolute',left:130,top:170,fontSize:28,letterSpacing:7,color:'rgba(240,238,232,.58)'}}>03:00 / ALWAYS AWAKE</div><div style={{position:'absolute',left:126,bottom:205,width:800,fontSize:80,lineHeight:.98,fontWeight:760}}>{beatOrdinal%2?'WE WOULD NEED TO INVENT OFFLINE HOURS.':'SLEEP USED TO BE A BOUNDARY.'}</div></FilmBase>;
};

export const HomeScene=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames);
  return <FilmBase warm><CinematicPhoto index={1} durationInFrames={durationInFrames} dark={.48}/><div style={{position:'absolute',left:0,top:0,bottom:0,width:'50%',borderRight:'1px solid rgba(240,238,232,.22)',background:'linear-gradient(90deg,rgba(8,11,17,.35),rgba(8,11,17,.06))'}}/><div style={{position:'absolute',left:'50%',top:0,bottom:0,width:'50%',background:'linear-gradient(90deg,rgba(255,179,64,.05),rgba(255,179,64,.16))'}}/><div style={{position:'absolute',left:130,top:135,fontSize:26,letterSpacing:6}}>ONE HOME / TWO CLOCKS</div><ClockFace left={240} top={300} size={300} spin={interpolate(p,[0,1],[0,180],CLAMP)}/><ClockFace left={1320} top={300} size={300} spin={interpolate(p,[0,1],[180,400],CLAMP)}/><div style={{position:'absolute',left:130,bottom:180,fontSize:68,fontWeight:760,maxWidth:1150,lineHeight:1}}>{beatOrdinal%3===0?'NO BEDTIME. EVER.':beatOrdinal%2?'SHARED TIME BECOMES A CHOICE':'BEDROOMS BECOME SOMETHING ELSE'}</div></FilmBase>;
};

export const TimeStream=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames); const x=interpolate(p,[0,1],[-120,120],CLAMP);
  return <FilmBase><CaptionSafeGlow x='48%' y='52%' color='127,169,216' opacity={.2}/><div style={{position:'absolute',left:150,right:150,top:520,height:4,background:'linear-gradient(90deg,transparent,rgba(127,169,216,.6),rgba(255,179,64,.7),transparent)',transform:`translateX(${x}px)`}}/>{Array.from({length:11},(_,i)=><div key={i} style={{position:'absolute',left:190+i*150+x*.35,top:505,width:30,height:30,borderRadius:'50%',background:i===5?AMBER:'rgba(210,225,242,.7)',boxShadow:i===5?'0 0 40px rgba(255,179,64,.5)':'none'}}/>)}<div style={{position:'absolute',left:130,top:150,fontSize:24,letterSpacing:7}}>ONE CONTINUOUS STREAM</div><div style={{position:'absolute',left:130,bottom:170,maxWidth:1180,fontSize:74,fontWeight:760,lineHeight:1}}>{beatOrdinal%3===0?'WE WOULD INVENT A RESET.':beatOrdinal%2?'WHEN DOES A DAY ACTUALLY END?':'SLEEP USED TO DIVIDE LIFE INTO CHAPTERS.'}</div></FilmBase>;
};

export const PayoffScene=({beatOrdinal,durationInFrames})=>{
  const frame=useCurrentFrame(); const p=localProgress(frame,durationInFrames);
  if(beatOrdinal%3===1)return <FilmBase warm><CinematicPhoto index={3} durationInFrames={durationInFrames} dark={.46}/><div style={{position:'absolute',left:120,top:145,fontSize:27,letterSpacing:7}}>THE FINAL QUESTION</div><div style={{position:'absolute',left:118,bottom:190,fontSize:84,lineHeight:.95,fontWeight:780,maxWidth:1250}}>WHO GETS TO CLAIM<br/><span style={{color:AMBER}}>YOUR +8 HOURS?</span></div></FilmBase>;
  const labels=['WORK','FAMILY','ECONOMY','INTERNET','YOU'];
  return <FilmBase><CaptionSafeGlow x='50%' y='48%' opacity={.17}/><div style={{position:'absolute',left:160,top:190,right:160,display:'flex',gap:24,alignItems:'stretch'}}>{labels.map((label,i)=><div key={label} style={{flex:1,height:360,borderRadius:24,border:`1px solid ${label==='YOU'?'rgba(255,179,64,.65)':'rgba(240,238,232,.13)'}`,background:label==='YOU'?'rgba(255,179,64,.10)':'rgba(240,238,232,.035)',display:'flex',alignItems:'flex-end',padding:24,boxSizing:'border-box',transform:`translateY(${interpolate(p,[0,1],[55+i*8,0],CLAMP)}px)`,opacity:interpolate(p,[0,.18+i*.04,.55+i*.03],[0,0,1],CLAMP)}}><span style={{fontSize:25,fontWeight:800,letterSpacing:3,color:label==='YOU'?AMBER:FG}}>{label}</span></div>)}</div><div style={{position:'absolute',left:160,bottom:155,fontSize:64,fontWeight:740,maxWidth:1300,lineHeight:1.03}}>{beatOrdinal%2?'PROTECTING NOTHING MAY BECOME RADICAL.':'MORE WAKING TIME DOES NOT MEAN MORE OWNED TIME.'}</div></FilmBase>;
};

const SCENE_RENDERERS={
  'scene-01':HookScene,
  'scene-02':TimeLifeScene,
  'scene-03':NeuralField,
  'scene-04':CircadianHorizon,
  'scene-05':CityGrid,
  'scene-06':BoundaryScene,
  'scene-07':HomeScene,
  'scene-08':TimeStream,
  'scene-09':PayoffScene,
};

const MinimalCallout=({text})=>{
  if(!text||String(text).length>18)return null;
  return <div style={{position:'absolute',left:118,top:98,padding:'9px 14px',borderRadius:10,background:'rgba(5,8,14,.55)',border:'1px solid rgba(240,238,232,.12)',fontSize:24,fontWeight:800,letterSpacing:2,color:AMBER,textShadow:'0 4px 18px rgba(0,0,0,.45)'}}>{String(text).toUpperCase()}</div>;
};

export const CinematicEpisodeScene=({beat,beatOrdinal=1,palette,durationInFrames})=>{
  const Renderer=SCENE_RENDERERS[beat?.sceneId]||TimeStream;
  const showCallout=Boolean(beat?.callout)&&(beatOrdinal%3===0||/HOURS|DAYS|YEARS|ALWAYS AWAKE/.test(String(beat.callout)));
  return <AbsoluteFill data-visual-owner="cinematic-single" style={{backgroundColor:'#090c12'}}>
    <Renderer beat={beat} beatOrdinal={beatOrdinal} palette={palette} durationInFrames={durationInFrames}/>
    {showCallout?<MinimalCallout text={beat.callout}/>:null}
  </AbsoluteFill>;
};
