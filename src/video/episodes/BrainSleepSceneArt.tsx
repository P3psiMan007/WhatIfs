import React from "react";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import type {SceneManifestEntry} from "../types/scene";
import {Arrow, Bed, Bird, Brain, BS, Clock, Dolphin, Human, Label, Mouse, Switch, Wave} from "./BrainSleepPrimitives";
import {getBrainSleepSceneFamily} from "./brainSleepArtPlan";

export interface BrainSleepSceneArtProps {
  scene: SceneManifestEntry;
  cameraProgress: number;
  revealProgress: number;
}

const ground = (y=845) => <line x1={70} y1={y} x2={1850} y2={y} stroke={BS.faint} strokeWidth={6} strokeLinecap="round"/>;
const stars = () => <>{Array.from({length:18},(_,i)=><circle key={i} cx={90+(i*109)%1750} cy={70+(i*73)%430} r={i%3===0?4:2.5} fill={BS.cream} opacity={0.25+(i%4)*0.08}/>)}</>;
const brainCity = (x:number,y:number,scale=1,dimIndex=-1) => <g transform={`translate(${x} ${y}) scale(${scale})`}>
  <path d="M -300 10 C -320 -170 -130 -280 -5 -205 C 130 -285 326 -172 296 13 C 347 138 213 248 90 205 C 25 270 -105 255 -151 197 C -266 217 -347 111 -300 10 Z" fill={BS.bg2} stroke={BS.cream} strokeWidth={9}/>
  {Array.from({length:6},(_,i)=>{const col=i%3,row=Math.floor(i/3); const xx=-220+col*220, yy=-105+row*160; const dim=i===dimIndex; return <g key={i} opacity={dim?0.45:1}><rect x={xx} y={yy} width={130} height={90} rx={16} fill={dim?BS.blue:BS.bg} stroke={dim?BS.blue:BS.cream} strokeWidth={6}/><circle cx={xx+32} cy={yy+30} r={8} fill={dim?BS.blue:BS.amber}/><path d={`M ${xx+18} ${yy+63} L ${xx+110} ${yy+63}`} stroke={dim?BS.blue:BS.cream} strokeWidth={5} strokeLinecap="round"/></g>})}
</g>;
const stadium = (lights:number) => <g transform="translate(960 560)">
  <ellipse cx={0} cy={110} rx={650} ry={260} fill={BS.bg2} stroke={BS.cream} strokeWidth={9}/>
  <ellipse cx={0} cy={110} rx={420} ry={130} fill={BS.bg} stroke={BS.faint} strokeWidth={7}/>
  {Array.from({length:32},(_,i)=>{const a=(i/32)*Math.PI*2; const rx=535,ry=195; const on=i<lights; return <circle key={i} cx={Math.cos(a)*rx} cy={110+Math.sin(a)*ry} r={11} fill={on?BS.amber:BS.faint} opacity={on?0.9:0.5}/>})}
</g>;
const mouseLanes = (progress:number) => <g>
  {[0,1,2].map((i)=>{const y=350+i*190; const performance=i===1?0.62:0.92; const x=360+performance*1050*progress; return <g key={i}><line x1={300} y1={y} x2={1550} y2={y} stroke={BS.faint} strokeWidth={5}/><Mouse x={x} y={y-10} scale={0.42}/><Label x={250} y={y+18} text={i===0?"RESTED":i===1?"DEPRIVED":"+ RHYTHM"} anchor="end" size={34} color={i===2?BS.blue:BS.cream}/></g>})}
  <line x1={1550} y1={275} x2={1550} y2={820} stroke={BS.amber} strokeWidth={8} strokeDasharray="18 14"/>
</g>;
const eyeBrainPath = () => <g><Dolphin x={780} y={580} scale={0.9} eyeOpen/><Brain x={1330} y={490} scale={0.72} leftColor={BS.blue} rightColor={BS.amber}/><path d="M 915 535 C 1070 430 1140 435 1262 465" fill="none" stroke={BS.amber} strokeWidth={7} strokeDasharray="14 12"/><path d="M 914 552 C 1075 650 1155 620 1262 520" fill="none" stroke={BS.blue} strokeWidth={7} strokeDasharray="14 12"/></g>;

export const BrainSleepSceneArt: React.FC<BrainSleepSceneArtProps> = ({scene,cameraProgress,revealProgress}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const n=Number(scene.sceneId.slice(1));
  const family=getBrainSleepSceneFamily(scene.sceneId);
  const bob=Math.sin(frame/(fps*0.75))*8;
  const pulse=0.5+0.5*Math.sin(frame/(fps*0.45));
  const enter=interpolate(revealProgress,[0,0.42,1],[0,1,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp",easing:Easing.bezier(0.16,1,0.3,1)});
  const scale=scene.cameraIntent==="push-in"?1+cameraProgress*0.045:scene.cameraIntent==="pull-out"?1.045-cameraProgress*0.045:1;
  const panX=scene.cameraIntent==="pan-right"?-35+cameraProgress*70:scene.cameraIntent==="pan-left"?35-cameraProgress*70:scene.cameraIntent==="parallax-drift"?Math.sin(cameraProgress*Math.PI*2)*18:0;
  const panY=scene.cameraIntent==="parallax-drift"?Math.cos(cameraProgress*Math.PI*2)*9:0;

  const renderSwitch = () => {
    if(n===1) return <><Human x={480} y={690} scale={1.35} pose="think"/><Switch x={1325} y={470} scale={1.35} progress={0.2+0.08*pulse}/><Label x={1325} y={720} text="AWAKE  /  ASLEEP" size={38} color={BS.faint}/></>;
    if(n===2) return <>{ground(835)}<Human x={520+cameraProgress*280} y={675} scale={1.08} pose={cameraProgress<0.55?"work":"sleep"} eyeMode={cameraProgress<0.55?"open":"closed"}/><Bed x={1390} y={745} scale={1.2}/><Clock x={960} y={330} scale={0.62}/><Switch x={960} y={605} scale={0.72} progress={cameraProgress}/></>;
    return <><Brain x={960} y={520} scale={1.45}/><Switch x={960} y={520} scale={0.8} progress={0.5} broken/><g opacity={enter}>{[-2,-1,0,1,2].map((i)=><circle key={i} cx={960+i*135} cy={760+Math.abs(i)*34} r={24} fill={i%2?BS.blue:BS.amber} opacity={0.75}/>)}</g></>;
  };

  const renderMouseLocal=()=>{
    if(n===4) return <><Mouse x={450} y={715+bob} scale={1.15} brainPatch/><Brain x={1280} y={480} scale={1.42} patch patchColor={BS.blue}/><Wave x={1035} y={485} width={400} amp={28} phase={frame/(fps*0.3)} color={BS.blue}/><Label x={1280} y={770} text="LOCAL SLEEP-LIKE RHYTHM" size={42} color={BS.blue}/></>;
    if(n===5) return <><Clock x={500} y={500} scale={1.25} value="30 MIN"/><mouseLanes/><g transform="translate(0 160) scale(.88)">{mouseLanes(enter)}</g></>;
    return <><Human x={960} y={760} scale={0.95} pose="stand"/><Brain x={960} y={380} scale={1.3} leftColor={BS.blue} rightColor={BS.amber}/><Label x={960} y={655} text="WHAT DOES “AWAKE” MEAN?" size={48}/></>;
  };

  const renderStadiumLocal=()=>{
    if(n===7) return <>{stadium(Math.round(30*enter))}<Label x={960} y={190} text="BILLIONS OF NEURONS" size={50} color={BS.amber}/></>;
    if(n===8) return <>{stadium(Math.max(0,32-Math.round(cameraProgress*32)))}<Label x={960} y={190} text="THE OLD MODEL: EVERYTHING SHUTS DOWN" size={42}/></>;
    if(n===9) return <>{brainCity(960,520,1.2,4)}<Wave x={1090} y={615} width={250} amp={24} color={BS.blue} opacity={0.9}/><Label x={960} y={900} text="DIFFERENT REGIONS. DIFFERENT SLEEP PRESSURE." size={42}/></>;
    return <><Brain x={960} y={500} scale={1.55} patch patchColor={BS.blue}/><Wave x={735} y={470} width={250} amp={28} color={BS.blue}/><Label x={960} y={835} text="LOCAL SLEEP" size={72} color={BS.blue}/></>;
  };

  const renderFatigueHuman=()=>{
    if(n===11) return <>{ground()}<Human x={1230} y={695} scale={1.25} pose="work"/><Brain x={585} y={425} scale={1.1} patch/><rect x={920} y={500} width={360} height={215} rx={20} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/><Label x={1100} y={610} text="still working…" size={38} color={BS.faint}/></>;
    if(n===12) return <>{ground()}<Human x={430} y={700} scale={1.1} pose="work"/><rect x={820} y={310} width={720} height={430} rx={32} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/><Label x={1180} y={470} text="7 + 5 = 17" size={70} color={BS.red}/><Brain x={530} y={340} scale={0.65} patch/><Label x={1180} y={620} text="technically awake" size={38} color={BS.faint}/></>;
    return <><Wave x={250} y={520} width={620} amp={90} color={BS.red} phase={frame/(fps*0.2)}/><Arrow x1={900} y1={520} x2={1100} y2={520}/><Wave x={1120} y={520} width={550} amp={35} color={BS.blue}/><Label x={530} y={750} text="CHAOTIC" size={44} color={BS.red}/><Label x={1400} y={750} text="CONTROLLED" size={44} color={BS.blue}/></>;
  };

  const renderMouseExperiment=()=>{
    if(n===14) return <><Brain x={960} y={510} scale={1.55}/>{[-1,0,1].map((r)=><g key={r} opacity={0.45+0.5*pulse}><circle cx={840+r*110} cy={430+r*30} r={18} fill={BS.amber}/><circle cx={1080+r*110} cy={590-r*25} r={18} fill={BS.blue}/></g>)}<Label x={960} y={850} text="ON  ·  OFF  ·  ON  ·  OFF" size={58}/></>;
    if(n===15) return <><Label x={500} y={220} text="JUST QUIETER" size={38} color={BS.faint}/><line x1={260} y1={535} x2={770} y2={535} stroke={BS.faint} strokeWidth={12} strokeLinecap="round"/><Label x={1390} y={220} text="RIGHT RHYTHM" size={38} color={BS.blue}/><Wave x={1080} y={535} width={620} amp={60} color={BS.blue}/><Label x={960} y={870} text="THE TIMING MATTERED" size={54} color={BS.amber}/></>;
    if(n===16) return <><Wave x={360} y={490} width={1200} amp={65} color={BS.blue}/><Wave x={360+Math.max(0,1-enter)*160} y={490} width={1200} amp={65} color={BS.amber} opacity={0.75}/><Label x={960} y={765} text="INDUCED RHYTHM ≈ SLEEP RHYTHM" size={48}/></>;
    if(n===17) return <><Brain x={700} y={500} scale={1.3} patch/><rect x={1220} y={355} width={240} height={420} rx={34} fill={BS.bg2} stroke={BS.cream} strokeWidth={8}/><rect x={1262} y={390+(1-enter)*280} width={156} height={335-(1-enter)*280} rx={18} fill={BS.blue} opacity={0.7}/><Label x={1340} y={835} text="LOCAL DEBT ↓" size={40} color={BS.blue}/></>;
    if(n===18) return <><Mouse x={640+cameraProgress*240} y={650} scale={0.9}/><rect x={1020} y={490} width={270} height={250} fill={BS.bg2} stroke={BS.cream} strokeWidth={7}/><path d="M 1040 545 L 1270 545 M 1040 615 L 1270 615 M 1040 685 L 1270 685" stroke={BS.faint} strokeWidth={8}/><Label x={1155} y={420} text="TACTILE MEMORY" size={42}/></>;
    if(n===19) return <>{mouseLanes(enter)}<Label x={960} y={905} text="RESTED ≈ DEPRIVED + RHYTHM" size={48} color={BS.amber}/></>;
    if(n===20) return <><Mouse x={960} y={675+bob} scale={1.35} brainPatch/><Label x={960} y={300} text="A LOCAL PIECE OF REST" size={52} color={BS.blue}/></>;
    return <><Mouse x={520} y={610} scale={0.9} brainPatch/><line x1={930} y1={160} x2={930} y2={900} stroke={BS.red} strokeWidth={12}/><Human x={1370} y={675} scale={1.15} pose="sleep" eyeMode="closed"/><Bed x={1370} y={755} scale={1.05}/><Label x={930} y={980} text="MOUSE RESULT ≠ HUMAN SLEEP REPLACEMENT" size={40} color={BS.red}/></>;
  };

  const renderDolphin=()=>{
    if(n===22) return <><Mouse x={600-cameraProgress*220} y={600} scale={0.9} opacity={1-cameraProgress}/><Dolphin x={1220+cameraProgress*100} y={570} scale={1.02} opacity={cameraProgress}/><Label x={960} y={200} text="NATURE WENT FURTHER" size={52} color={BS.amber}/></>;
    if(n===23) return <><path d="M 0 250 Q 960 180 1920 250" fill="none" stroke={BS.blue} strokeWidth={10}/><Dolphin x={930+cameraProgress*190} y={635+bob} scale={1.05}/><Arrow x1={1190} y1={565} x2={1370} y2={280} color={BS.amber}/><Label x={1470} y={245} text="BREATHE" size={44} color={BS.amber}/></>;
    if(n===24) return <><Dolphin x={960} y={580} scale={1.12} split={pulse>0.5?"left":"right"}/><Label x={960} y={235} text="ONE HEMISPHERE AT A TIME" size={50}/><Wave x={475} y={825} width={430} amp={35} color={pulse>0.5?BS.blue:BS.amber}/><Wave x={1015} y={825} width={430} amp={35} color={pulse>0.5?BS.amber:BS.blue}/></>;
    return <>{eyeBrainPath()}<Label x={960} y={865} text="ONE EYE CAN STAY OPEN" size={52} color={BS.amber}/></>;
  };

  const renderBird=()=>{
    if(n===26) return <><Dolphin x={560-cameraProgress*260} y={660} scale={0.78} opacity={1-cameraProgress}/><Bird x={1300+cameraProgress*120} y={470} scale={1.0} opacity={cameraProgress}/><path d="M 0 820 Q 960 735 1920 820" fill="none" stroke={BS.blue} strokeWidth={7}/></>;
    if(n===27) return <>{stars()}<path d="M 0 870 Q 960 800 1920 870" fill="none" stroke={BS.blue} strokeWidth={8}/><Bird x={1040+Math.sin(frame/(fps*2))*100} y={470+bob} scale={1.2} recorder/><Wave x={680} y={720} width={700} amp={28} color={BS.blue}/><Label x={960} y={210} text="SLEEPING WHILE FLYING" size={54}/></>;
    if(n===28) return <><Clock x={960} y={470} scale={1.4} value="0.69 HOURS / DAY"/><Bird x={1410} y={350+bob} scale={0.55}/><Label x={960} y={850} text="IN THE AIR" size={42} color={BS.faint}/></>;
    return <>{stars()}<Bird x={450+cameraProgress*900} y={470+bob} scale={0.8}/>{[0,1,2,3].map((i)=><g key={i} opacity={0.35+0.55*Math.max(0,1-Math.abs(cameraProgress-(i+1)/5)*5)}><circle cx={650+i*300} cy={510} r={75} fill={BS.blue} opacity={0.18}/><text x={650+i*300} y={528} textAnchor="middle" fill={BS.blue} fontSize={54}>z</text></g>)}<Label x={960} y={830} text="TINY PACKETS OF SLEEP" size={48}/></>;
  };

  const renderHumanFirstNight=()=>{
    if(n===30) return <><Dolphin x={400} y={540} scale={0.5} opacity={0.55}/><Human x={960} y={720} scale={1.25} pose="think"/><Brain x={1480} y={470} scale={0.85} leftColor={BS.blue} rightColor={BS.amber}/><Label x={960} y={230} text="COULD HUMANS DO IT?" size={58}/></>;
    if(n===31) return <><Brain x={540} y={500} scale={1.05} leftColor={BS.blue} rightColor={BS.amber}/><Label x={540} y={790} text="DOLPHIN" size={38}/><Brain x={1380} y={500} scale={1.05} patch patchColor={BS.blue}/><Label x={1380} y={790} text="HUMAN" size={38}/><Label x={960} y={200} text="NOT THE SAME TRICK" size={48} color={BS.red}/></>;
    if(n===32) return <>{ground(835)}<Bed x={1300} y={730} scale={1.08}/><Human x={1270} y={655} scale={0.78} pose="sleep" eyeMode="closed"/><Brain x={660} y={460} scale={1.1} leftColor={BS.blue} rightColor={BS.cream}/>{[0,1,2].map((i)=><path key={i} d={`M ${160+i*45} ${410+i*35} Q 340 ${350+i*70} 500 ${430+i*20}`} fill="none" stroke={BS.amber} strokeWidth={6} opacity={0.45+0.18*i}/>)}<Label x={660} y={760} text="NIGHT WATCH?" size={50} color={BS.blue}/></>;
    if(n===33) return <>{[0,1,2].map((i)=><g key={i} transform={`translate(${430+i*560} 610) scale(.72)`}><Bed x={0} y={0}/><Brain x={0} y={-250} scale={0.55} leftColor={i===0?BS.blue:BS.cream} rightColor={BS.cream} opacity={i===0?1:0.55}/><Label x={0} y={165} text={`NIGHT ${i+1}`} size={42}/></g>)}</>;
    return <><Brain x={960} y={500} scale={1.55} leftColor={BS.blue} rightColor={BS.amber}/><line x1={960} y1={320} x2={960} y2={675} stroke={BS.red} strokeWidth={10} opacity={1-enter}/>{[0,1,2,3].map((i)=><circle key={i} cx={720+i*165} cy={430+(i%2)*140} r={48} fill={i%2?BS.blue:BS.amber} opacity={0.15+enter*0.35}/>) }<Label x={960} y={850} text="HUMANS ARE MESSIER" size={56}/></>;
  };

  const renderDistributed=()=>{
    if(n===35) return <><defs><linearGradient id="land" x1="0" x2="1"><stop offset="0" stopColor={BS.amber}/><stop offset=".52" stopColor={BS.faint}/><stop offset="1" stopColor={BS.blue}/></linearGradient></defs><path d="M 260 640 C 370 380 635 260 870 365 C 1050 205 1390 325 1630 610 C 1440 785 1160 850 900 775 C 610 880 390 790 260 640 Z" fill="url(#land)" opacity={0.52} stroke={BS.cream} strokeWidth={9}/><Label x={960} y={205} text="THE BORDER IS BLURRY" size={58}/></>;
    if(n===36) return <>{brainCity(960,520,1.2,Math.floor((frame/(fps*1.4))%6))}<Label x={960} y={900} text="MANY CIRCUITS. MANY STATES." size={52}/></>;
    return <>{[0,1,2,3].map((i)=><g key={i} transform={`translate(${270+i*455} ${540+(i%2)*40}) scale(.55)`}>{i===0?<Brain x={0} y={0} patch/>:i===1?<Human x={0} y={100} scale={1.1} pose="work"/>:i===2?<Dolphin x={0} y={0} scale={0.85} split="left"/>:<Mouse x={0} y={0} scale={1.1} brainPatch/>}</g>)}<path d="M 280 790 C 620 710 1280 875 1640 760" fill="none" stroke={BS.amber} strokeWidth={8} strokeDasharray="20 14"/><Label x={960} y={925} text="ONE STORY, FOUR CLUES" size={46}/></>;
  };

  const renderFuture=()=>{
    if(n===38) return <>{ground()}<Human x={960} y={700} scale={1.25} pose="work"/><path d="M 905 512 Q 960 475 1015 512" fill="none" stroke={BS.amber} strokeWidth={12}/><Brain x={1350} y={430} scale={0.78} patch/><Label x={960} y={225} text="REST WHILE AWAKE?" size={58}/><Label x={960} y={900} text="FUTURE QUESTION — NOT CURRENT TECH" size={34} color={BS.faint}/></>;
    if(n===39) return <><Mouse x={460} y={580} scale={0.85} brainPatch/><Arrow x1={720} y1={530} x2={1210} y2={530} dashed opacity={enter}/><Human x={1480} y={680} scale={1.05} pose="stand"/><Label x={960} y={280} text="FROM MICE → HUMAN RESEARCH?" size={50}/></>;
    return <><Brain x={360} y={430} scale={0.62} patch/><Label x={360} y={670} text="LOCAL" size={36} color={BS.blue}/><Arrow x1={560} y1={460} x2={810} y2={460} color={BS.red}/><Human x={1250} y={720} scale={1.1} pose="sleep" eyeMode="closed"/><Bed x={1250} y={790} scale={1.08}/>{[0,1,2,3,4].map((i)=><circle key={i} cx={1010+i*130} cy={300+(i%2)*70} r={38} fill={[BS.amber,BS.blue,BS.green,BS.red,BS.cream][i]} opacity={0.45}/>)}<Label x={1250} y={915} text="FULL-BODY SLEEP" size={42}/><Label x={960} y={180} text="LOCAL REST ≠ REPLACING SLEEP" size={54} color={BS.red}/></>;
  };

  const renderFinale=()=>{
    if(n===41) return <><Brain x={960} y={525} scale={1.12} leftColor={BS.blue} rightColor={BS.amber}/><Dolphin x={420} y={640+bob} scale={0.55} split="left"/><Bird x={1500} y={330-bob} scale={0.58}/><Mouse x={530} y={300} scale={0.58} brainPatch/><Human x={1430} y={720} scale={0.72} pose="sleep" eyeMode="closed"/><Label x={960} y={900} text="THE BRAIN COLLECTS ITS DEBT" size={52} color={BS.amber}/></>;
    return <><defs><linearGradient id="twilight" x1="0" x2="1"><stop offset="0" stopColor="#b67843"/><stop offset=".45" stopColor="#3b3e55"/><stop offset="1" stopColor="#314b72"/></linearGradient></defs><Bed x={540} y={790} scale={0.9}/><Human x={530} y={720} scale={0.68} pose="sleep" eyeMode="closed"/><path d="M 650 675 C 790 325 1140 180 1510 370 C 1700 470 1730 700 1600 800 C 1320 920 890 900 650 675 Z" fill="url(#twilight)" opacity={0.48} stroke={BS.cream} strokeWidth={9}/>{[0,1,2,3,4].map((i)=><circle key={i} cx={850+i*160} cy={510+(i%2)*110} r={35+(i%3)*10} fill={i<Math.floor(cameraProgress*6)?BS.blue:BS.amber} opacity={0.5}/>)}<Label x={1230} y={260} text="A LANDSCAPE, NOT A LINE" size={58}/></>;
  };

  const art=family==="switch-paradox"?renderSwitch():family==="mouse-local"?renderMouseLocal():family==="stadium-local"?renderStadiumLocal():family==="fatigue-human"?renderFatigueHuman():family==="mouse-experiment"?renderMouseExperiment():family==="dolphin"?renderDolphin():family==="frigatebird"?renderBird():family==="human-first-night"?renderHumanFirstNight():family==="distributed-brain"?renderDistributed():family==="future-caveat"?renderFuture():family==="evolution-finale"?renderFinale():null;

  return <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:"absolute",inset:0,background:BS.bg}}>
    <defs>
      <radialGradient id="vignette"><stop offset="0" stopColor={BS.bg2}/><stop offset="1" stopColor={BS.bg}/></radialGradient>
      <filter id="softGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1920" height="1080" fill="url(#vignette)"/>
    <g transform={`translate(${960+panX} ${540+panY}) scale(${scale}) translate(-960 -540)`}>{art}</g>
    <circle cx={95} cy={95} r={8} fill={family==="fallback"?BS.red:BS.amber} opacity={0.45}/>
  </svg>;
};
