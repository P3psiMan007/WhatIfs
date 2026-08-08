import React from 'react';
import {AbsoluteFill,Easing,Img,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {getSleepSceneSpec} from './sleep-visual-registry.mjs';
import {
  DoodleArrow,DoodleBaby,DoodleBed,DoodleBook,DoodleBrain,DoodleBuilding,DoodleCard,DoodleChess,
  DoodleClock,DoodleHeart,DoodlePerson,DoodlePhone,DoodleShield,HandLabel,PieClock,RoughLine,RoughPath,
} from './doodle-primitives.jsx';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const font='Arial, Helvetica, sans-serif';

const cameraPositions=[
  [-3,-2,1.06],[3,-1,1.09],[-2,2,1.11],[2,1,1.07],[0,-2,1.10],[-3,1,1.08],[3,2,1.12],[0,0,1.065],
];

const TitleChip=({text,accent,foreground})=><div style={{position:'absolute',left:72,top:58,fontFamily:font,fontSize:18,fontWeight:900,letterSpacing:5,color:accent,opacity:.9,textTransform:'uppercase'}}>{text}</div>;

const BigType=({children,x=120,y=150,size=86,color='#eae7e1',align='left',maxWidth=900,opacity=1})=><div style={{position:'absolute',left:align==='left'?x:undefined,right:align==='right'?x:undefined,top:y,width:maxWidth,fontFamily:font,fontSize:size,lineHeight:.92,fontWeight:900,letterSpacing:-3,color,textAlign:align==='right'?'right':'left',textTransform:'uppercase',opacity,textShadow:'0 14px 50px rgba(0,0,0,.45)'}}>{children}</div>;

const AccentRule=({x=120,y=280,w=220,accent='#ffb340',opacity=1})=><div style={{position:'absolute',left:x,top:y,width:w,height:8,borderRadius:99,background:accent,opacity}}/>;

const SceneShell=({sceneId,beatOrdinal,palette,children})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  const spec=getSleepSceneSpec(sceneId);
  const [cx,cy,baseScale]=cameraPositions[(Math.max(1,beatOrdinal)-1)%cameraPositions.length];
  const settle=interpolate(frame,[0,.55*fps],[0,1],{...clamp,easing:Easing.bezier(.16,1,.3,1)});
  const drift=interpolate(frame,[0,Math.max(1,5*fps)],[0,1],clamp);
  const plateScale=baseScale+.012*drift;
  return <AbsoluteFill style={{backgroundColor:palette.background,overflow:'hidden'}}>
    <div style={{position:'absolute',inset:-55,opacity:.76,translate:`${cx*14*(.35+.65*settle)}px ${cy*10*(.35+.65*settle)}px`,scale:plateScale}}>
      {spec?<Img src={staticFile(spec.asset)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
    </div>
    <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 46%, transparent 15%, rgba(11,13,18,.18) 68%, rgba(11,13,18,.62) 100%)'}}/>
    <div style={{position:'absolute',inset:0,opacity:.065,backgroundImage:'radial-gradient(circle, rgba(234,231,225,.8) 0.7px, transparent 0.9px)',backgroundSize:'13px 13px',translate:`${-(frame%13)}px 0px`}}/>
    <div style={{opacity:.76+.24*settle,translate:`0px ${interpolate(settle,[0,1],[18,0])}px`}}>{children}</div>
  </AbsoluteFill>;
};

const SvgStage=({children})=><svg viewBox="0 0 1920 1080" width="1920" height="1080" style={{position:'absolute',inset:0}}>{children}</svg>;

const HookScene=({phase,beat,palette,beatOrdinal})=>{
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const p=interpolate(frame,[0,.7*fps],[0,1],clamp);
  const fg=palette.foreground, a=palette.accent;
  return <SceneShell sceneId="scene-01" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="The last bedtime" accent={a} foreground={fg}/><SvgStage>
    {phase===0&&<><DoodleBed x={240} y={560} scale={1.35} stroke={fg} accent={a}/><DoodlePerson x={650} y={510} scale={1.05} stroke={fg} accent={a} pose="tired" opacity={p}/><DoodleClock x={1435} y={580} r={185} stroke={fg} accent={a} hour={11} minute={58}/><HandLabel x={250} y={390} text="TONIGHT: LAST SLEEP" color={a} size={48} opacity={p}/></>}
    {phase===1&&<><DoodlePerson x={920} y={370} scale={1.45} stroke={fg} accent={a} pose="celebrate"/><circle cx="1490" cy="350" r={115+20*p} fill={a} opacity=".14"/><HandLabel x={1490} y={365} text="AWAKE" color={a} size={46} anchor="middle"/><DoodleArrow x1={1300} y1={470} x2={1125} y2={540} stroke={a}/><HandLabel x={250} y={720} text="NO FATIGUE. NO FOG." color={fg} size={45}/></>}
    {phase===2&&<><PieClock x={960} y={560} r={260} stroke={fg} accent={a}/><HandLabel x={960} y={575} text="8 HOURS" color="#0b0d12" size={44} anchor="middle"/><HandLabel x={960} y={915} text="BACK. EVERY DAY." color={a} size={54} anchor="middle"/></>}
    {phase===3&&<><DoodleCard x={270} y={360} w={390} h={180} stroke={fg} accent={a} title="BODY" value="NO FATIGUE"/><DoodleCard x={765} y={360} w={390} h={180} stroke={fg} accent={a} title="MIND" value="NO BRAIN FOG"/><DoodleCard x={1260} y={360} w={390} h={180} stroke={fg} accent={a} title="COST" value="NONE"/><DoodlePerson x={960} y={680} scale={1.1} stroke={fg} accent={a} pose="open"/></>}
    {phase===4&&<><DoodleBrain x={670} y={530} scale={1.55} stroke={fg} accent={a} active={p}/><DoodleHeart x={1240} y={520} scale={1.3} stroke={fg} accent={a}/><DoodleArrow x1={850} y1={560} x2={1080} y2={560} stroke={a}/><HandLabel x={960} y={845} text="REPAIR WHILE AWAKE" color={a} size={52} anchor="middle"/></>}
    {phase===5&&<><PieClock x={630} y={545} r={235} stroke={fg} accent={a}/><DoodlePerson x={1170} y={500} scale={1.15} stroke={fg} accent={a} pose="reach"/><DoodleArrow x1={1460} y1={300} x2={1180} y2={460} stroke={a}/><DoodleArrow x1={1580} y1={560} x2={1250} y2={560} stroke={a}/><DoodleArrow x1={1480} y1={810} x2={1190} y2={650} stroke={a}/><HandLabel x={1510} y={260} text="WORK" color={fg} size={35}/><HandLabel x={1600} y={550} text="FAMILY" color={fg} size={35}/><HandLabel x={1490} y={870} text="INTERNET" color={fg} size={35}/></>}
    {phase===6&&<><DoodlePerson x={660} y={500} scale={1.25} stroke={fg} accent={a} pose="neutral"/><DoodlePerson x={1260} y={500} scale={1.25} stroke={fg} accent={a} pose="point"/><RoughLine x1={960} y1={250} x2={960} y2={850} stroke={a} strokeWidth={7} dash="18 18"/><HandLabel x={1260} y={350} text="YOU HAVE 8 MORE HOURS..." color={fg} size={40} anchor="middle"/></>}
    {phase===7&&<><PieClock x={960} y={560} r={285} stroke={fg} accent={a}/><HandLabel x={960} y={1030} text="WHO GETS THEM?" color={a} size={78} anchor="middle"/></>}
  </SvgStage>{beat.callout&&phase!==2?<BigType x={95} y={865} size={52} color={fg} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;
};

const SecondLifeScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-02" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="You gain a second life" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><DoodleCard x={530} y={360} w={860} h={300} stroke={fg} accent={a} title="RECOVERED EACH YEAR" value="2,920 HOURS"/><HandLabel x={960} y={790} text="MORE CONSCIOUS TIME" color={fg} size={46} anchor="middle"/></>}
  {phase===1&&<><DoodleClock x={650} y={540} r={230} stroke={fg} accent={a}/><DoodleArrow x1={920} y1={540} x2={1180} y2={540} stroke={a}/><DoodleCard x={1210} y={405} w={480} h={270} stroke={fg} accent={a} title="EQUIVALENT" value="122 DAYS"/></>}
  {phase===2&&<><DoodleBook x={600} y={510} scale={1.35} stroke={fg} accent={a}/><HandLabel x={600} y={820} text="LEARN A LANGUAGE" color={a} size={42} anchor="middle"/><DoodlePerson x={1320} y={440} scale={1.2} stroke={fg} accent={a} pose="open"/><HandLabel x={1320} y={820} text="BUILD SOMETHING" color={fg} size={42} anchor="middle"/></>}
  {phase===3&&<><DoodleChess x={620} y={535} scale={1.22} stroke={fg} accent={a}/><HandLabel x={620} y={845} text="1,000 MORE GAMES" color={a} size={40} anchor="middle"/><DoodleBuilding x={1190} y={370} w={330} h={410} stroke={fg} accent={a} lit={.8} label="YOUR COMPANY"/></>}
  {phase===4&&<><DoodlePerson x={640} y={460} scale={1.15} stroke={fg} accent={a} pose="open"/><DoodlePerson x={960} y={460} scale={1.15} stroke={fg} accent={a} pose="open"/><DoodlePerson x={1280} y={460} scale={1.15} stroke={fg} accent={a} pose="open"/><RoughPath d="M565 745 Q960 910 1355 745" stroke={a} strokeWidth={8}/><HandLabel x={960} y={930} text="OR JUST HAVE MORE LIFE" color={a} size={50} anchor="middle"/></>}
  {phase===5&&<><DoodleBuilding x={250} y={400} w={270} h={390} stroke={fg} accent={a} lit={.85} label="AIRPORT"/><DoodleBuilding x={650} y={350} w={270} h={440} stroke={fg} accent={a} lit={.9} label="HOSPITAL"/><DoodleBuilding x={1050} y={440} w={270} h={350} stroke={fg} accent={a} lit={.78} label="FOOD"/><DoodleBuilding x={1450} y={390} w={270} h={400} stroke={fg} accent={a} lit={.82} label="DELIVERY"/><HandLabel x={960} y={940} text="THE WORLD CAN STAY OPEN" color={a} size={48} anchor="middle"/></>}
  {phase===6&&<><DoodleClock x={620} y={545} r={215} stroke={fg} accent={a} hour={3} minute={0}/><DoodlePerson x={1240} y={480} scale={1.25} stroke={fg} accent={a} pose="neutral"/><DoodleArrow x1={850} y1={545} x2={1090} y2={545} stroke={a}/><HandLabel x={960} y={870} text="JET LAG CHANGES TOO" color={fg} size={46} anchor="middle"/></>}
  {phase===7&&<><DoodleBrain x={960} y={510} scale={1.6} stroke={fg} accent={a} active={1}/><HandLabel x={960} y={860} text="BUT THE BIOLOGY HAS TO CHANGE" color={a} size={50} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={880} size={48} maxWidth={720}>{beat.callout}</BigType>:null}</SceneShell>;};

const BiologyScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-03" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="Sleep is doing work" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><DoodleBrain x={960} y={500} scale={1.8} stroke={fg} accent={a} active={1}/><HandLabel x={960} y={860} text="SLEEP IS ACTIVE MAINTENANCE" color={a} size={52} anchor="middle"/></>}
  {phase===1&&<><DoodleBrain x={690} y={500} scale={1.35} stroke={fg} accent={a} active={1}/><DoodleCard x={1080} y={320} w={520} h={175} stroke={fg} accent={a} title="BRAIN" value="MEMORY"/><DoodleCard x={1080} y={545} w={520} h={175} stroke={fg} accent={a} title="BRAIN" value="ATTENTION"/></>}
  {phase===2&&<><DoodleHeart x={640} y={520} scale={1.55} stroke={fg} accent={a}/><DoodleShield x={1260} y={500} scale={1.2} stroke={fg} accent={a}/><HandLabel x={640} y={850} text="CARDIOVASCULAR" color={fg} size={38} anchor="middle"/><HandLabel x={1260} y={850} text="IMMUNE" color={fg} size={38} anchor="middle"/></>}
  {phase===3&&<><DoodlePerson x={550} y={480} scale={1.25} stroke={fg} accent={a} pose="tired"/><RoughLine x1={910} y1={260} x2={910} y2={860} stroke={a} strokeWidth={8}/><DoodlePerson x={1280} y={480} scale={1.25} stroke={fg} accent={a} pose="celebrate"/><HandLabel x={550} y={860} text="REAL SLEEP DEPRIVATION" color={fg} size={36} anchor="middle"/><HandLabel x={1280} y={860} text="OUR IMPOSSIBLE PREMISE" color={a} size={36} anchor="middle"/></>}
  {phase===4&&<><DoodleCard x={270} y={360} w={390} h={170} stroke={fg} accent={a} title="REAL HUMANS" value="SLOWER"/><DoodleCard x={765} y={360} w={390} h={170} stroke={fg} accent={a} title="REAL HUMANS" value="FOG"/><DoodleCard x={1260} y={360} w={390} h={170} stroke={fg} accent={a} title="REAL HUMANS" value="HARM"/><RoughPath d="M300 650 L1620 310" stroke={a} strokeWidth={14} opacity={.7}/><HandLabel x={960} y={840} text="THAT IS NOT THE SUPERPOWER" color={a} size={46} anchor="middle"/></>}
  {phase===5&&<><DoodleBrain x={620} y={500} scale={1.28} stroke={fg} accent={a}/><DoodleHeart x={960} y={500} scale={1.15} stroke={fg} accent={a}/><DoodleShield x={1320} y={500} scale={.95} stroke={fg} accent={a}/><RoughPath d="M400 800 Q960 925 1520 800" stroke={a} strokeWidth={7}/><HandLabel x={960} y={940} text="ALL MAINTENANCE WHILE CONSCIOUS" color={fg} size={44} anchor="middle"/></>}
  {phase===6&&<><DoodleCard x={520} y={390} w={880} h={270} stroke={fg} accent={a} title="ASSUMPTION" value="SOLVED PERFECTLY"/><HandLabel x={960} y={800} text="EVOLUTION? ENGINEERING? MAGIC SWITCH?" color={fg} size={35} anchor="middle"/></>}
  {phase===7&&<><DoodleClock x={960} y={545} r={270} stroke={fg} accent={a} hour={2} minute={0}/><HandLabel x={960} y={940} text="SLEEP CAN VANISH. YOUR CLOCK MAY NOT." color={a} size={48} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const CircadianScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-04" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="Night still exists inside you" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><DoodleClock x={960} y={530} r={285} stroke={fg} accent={a} hour={6} minute={0}/><RoughPath d="M675 530 A285 285 0 0 1 1245 530" stroke={a} strokeWidth={20} opacity={.45}/><HandLabel x={960} y={930} text="SLEEP ≠ CIRCADIAN RHYTHM" color={a} size={50} anchor="middle"/></>}
  {phase===1&&<><DoodleCard x={250} y={390} w={390} h={190} stroke={fg} accent={a} title="CYCLE" value="HORMONES"/><DoodleCard x={765} y={390} w={390} h={190} stroke={fg} accent={a} title="CYCLE" value="APPETITE"/><DoodleCard x={1280} y={390} w={390} h={190} stroke={fg} accent={a} title="CYCLE" value="TEMP"/></>}
  {phase===2&&<><DoodlePerson x={450} y={490} scale={1.1} stroke={fg} accent={a} pose="open"/><DoodlePerson x={960} y={490} scale={1.1} stroke={fg} accent={a} pose="neutral"/><DoodlePerson x={1470} y={490} scale={1.1} stroke={fg} accent={a} pose="celebrate"/><HandLabel x={450} y={830} text="MORNING" color={a} size={36} anchor="middle"/><HandLabel x={960} y={830} text="EVENING" color={fg} size={36} anchor="middle"/><HandLabel x={1470} y={830} text="NIGHT" color={a} size={36} anchor="middle"/></>}
  {phase===3&&<><DoodleBuilding x={320} y={390} w={390} h={420} stroke={fg} accent={a} lit={.25} label="DAY CITY"/><DoodleBuilding x={1210} y={390} w={390} h={420} stroke={fg} accent={a} lit={.92} label="NIGHT CITY"/><RoughLine x1={960} y1={260} x2={960} y2={900} stroke={a} strokeWidth={7} dash="20 18"/></>}
  {phase===4&&<><DoodleClock x={610} y={530} r={210} stroke={fg} accent={a} hour={2} minute={0}/><DoodlePerson x={1260} y={470} scale={1.3} stroke={fg} accent={a} pose="open"/><HandLabel x={610} y={840} text="2 A.M." color={a} size={58} anchor="middle"/><HandLabel x={1260} y={840} text="NORMAL TUESDAY" color={fg} size={44} anchor="middle"/></>}
  {phase===5&&<><RoughPath d="M240 620 Q610 320 960 620 T1680 620" stroke={fg} strokeWidth={9} opacity={.45}/><circle cx="480" cy="480" r="22" fill={a}/><circle cx="960" cy="620" r="22" fill={a}/><circle cx="1440" cy="480" r="22" fill={a}/><HandLabel x={960} y={870} text="OVERLAPPING TIME CULTURES" color={a} size={48} anchor="middle"/></>}
  {phase===6&&<><DoodleClock x={670} y={520} r={220} stroke={fg} accent={a}/><DoodleBed x={1120} y={500} scale={1.3} stroke={fg} accent={a}/><RoughPath d="M1040 250l250 600" stroke={a} strokeWidth={14}/><HandLabel x={960} y={930} text="DELETE SLEEP. NOT THE BODY CLOCK." color={fg} size={46} anchor="middle"/></>}
  {phase===7&&<><DoodleBuilding x={430} y={420} w={300} h={380} stroke={fg} accent={a} lit={.85}/><DoodleArrow x1={800} y1={610} x2={1120} y2={610} stroke={a}/><DoodleBuilding x={1190} y={360} w={330} h={440} stroke={fg} accent={a} lit={.95}/><HandLabel x={960} y={930} text="THE ECONOMY NOTICES FAST" color={a} size={48} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const EconomyScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-05" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="The 24-hour economy" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><DoodleBuilding x={280} y={370} w={300} h={430} stroke={fg} accent={a} lit={.9} label="OPEN"/><DoodleBuilding x={810} y={320} w={300} h={480} stroke={fg} accent={a} lit={.88} label="OPEN"/><DoodleBuilding x={1340} y={400} w={300} h={400} stroke={fg} accent={a} lit={.92} label="OPEN"/><HandLabel x={960} y={930} text="EVERY UNUSED HOUR IS TEMPTING" color={a} size={48} anchor="middle"/></>}
  {phase===1&&<><DoodleClock x={530} y={500} r={205} stroke={fg} accent={a} hour={3}/><DoodlePerson x={1220} y={460} scale={1.25} stroke={fg} accent={a} pose="celebrate"/><HandLabel x={530} y={820} text="3 A.M." color={a} size={56} anchor="middle"/><HandLabel x={1220} y={820} text="GYM" color={fg} size={56} anchor="middle"/></>}
  {phase===2&&<><DoodleBook x={660} y={510} scale={1.25} stroke={fg} accent={a}/><DoodleClock x={1290} y={520} r={200} stroke={fg} accent={a} hour={12}/><HandLabel x={960} y={865} text="MIDNIGHT CLASS" color={a} size={52} anchor="middle"/></>}
  {phase===3&&<><DoodleBuilding x={500} y={370} w={370} h={430} stroke={fg} accent={a} lit={.85} label="GOVERNMENT"/><DoodleBuilding x={1110} y={430} w={370} h={370} stroke={fg} accent={a} lit={.65} label="SERVICES"/><DoodleArrow x1={920} y1={590} x2={1060} y2={590} stroke={a}/></>}
  {phase===4&&<><RoughPath d="M300 750h1320M420 750l120-300h410l120 300M1160 750l160-240h220" stroke={fg} strokeWidth={9} opacity={.5}/><circle cx="1530" cy="300" r="105" fill={a} opacity=".12"/><HandLabel x={960} y={900} text="BUILD AROUND TRAFFIC, NOT BEDTIME" color={a} size={44} anchor="middle"/></>}
  {phase===5&&<><DoodlePerson x={560} y={470} scale={1.25} stroke={fg} accent={a} pose="neutral"/><DoodlePerson x={1320} y={470} scale={1.25} stroke={fg} accent={a} pose="point"/><HandLabel x={1320} y={360} text="BOSS" color={a} size={38} anchor="middle"/><DoodleArrow x1={1220} y1={560} x2={810} y2={560} stroke={a}/><HandLabel x={960} y={875} text="YOU HAVE MORE HOURS TOO..." color={fg} size={44} anchor="middle"/></>}
  {phase===6&&<><rect x="300" y="440" width="1320" height="120" rx="32" fill="rgba(234,231,225,.06)" stroke={fg} strokeWidth="6"/><rect x="300" y="440" width="440" height="120" rx="32" fill={a} opacity=".85"/><rect x="740" y="440" width="440" height="120" fill={a} opacity=".22"/><HandLabel x={520} y={515} text="8H WORK" color="#0b0d12" size={34} anchor="middle"/><HandLabel x={960} y={740} text="DOES THE WORKDAY EXPAND?" color={a} size={54} anchor="middle"/></>}
  {phase===7&&<><PieClock x={960} y={520} r={255} stroke={fg} accent={a}/><DoodleArrow x1={330} y1={520} x2={670} y2={520} stroke={a}/><DoodleArrow x1={1590} y1={520} x2={1250} y2={520} stroke={a}/><HandLabel x={960} y={925} text="HOW MUCH OF YOUR EXTRA LIFE IS WORK?" color={a} size={46} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const BoundaryScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-06" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="Sleep was a boundary" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><DoodlePhone x={430} y={310} scale={1.45} stroke={fg} accent={a} notifications={4}/><DoodleClock x={1260} y={510} r={220} stroke={fg} accent={a} hour={3}/><HandLabel x={1260} y={830} text="3 A.M." color={a} size={58} anchor="middle"/></>}
  {phase===1&&<><DoodlePerson x={620} y={470} scale={1.25} stroke={fg} accent={a} pose="neutral"/><DoodlePhone x={1210} y={350} scale={1.15} stroke={fg} accent={a} notifications={4}/><HandLabel x={960} y={860} text="WHY DIDN'T YOU ANSWER?" color={a} size={56} anchor="middle"/></>}
  {phase===2&&<><DoodleCard x={300} y={390} w={520} h={210} stroke={fg} accent={a} title="OLD DEFAULT" value="UNAVAILABLE"/><DoodleArrow x1={900} y1={495} x2={1110} y2={495} stroke={a}/><DoodleCard x={1160} y={390} w={520} h={210} stroke={fg} accent={a} title="NEW DEFAULT" value="AWAKE"/></>}
  {phase===3&&<><DoodleShield x={960} y={475} scale={1.45} stroke={fg} accent={a}/><HandLabel x={960} y={845} text="INVENT AN ARTIFICIAL NIGHT" color={a} size={50} anchor="middle"/></>}
  {phase===4&&<><DoodleClock x={510} y={510} r={195} stroke={fg} accent={a} hour={3}/><DoodlePhone x={1160} y={360} scale={1.05} stroke={fg} accent={a} notifications={0}/><RoughPath d="M1100 300 L1410 760" stroke={a} strokeWidth={13}/><HandLabel x={960} y={875} text="PROTECTED HOURS" color={fg} size={54} anchor="middle"/></>}
  {phase===5&&<><DoodleShield x={630} y={480} scale={1.1} stroke={fg} accent={a}/><DoodleCard x={1050} y={390} w={520} h={230} stroke={fg} accent={a} title="RULE" value="NO RESPONSE DUE"/><HandLabel x={960} y={860} text="A LEGAL + CULTURAL BOUNDARY" color={a} size={44} anchor="middle"/></>}
  {phase===6&&<><DoodleBrain x={650} y={500} scale={1.35} stroke={fg} accent={a}/><DoodleShield x={1280} y={490} scale={1.0} stroke={fg} accent={a}/><DoodleArrow x1={850} y1={520} x2={1090} y2={520} stroke={a}/><HandLabel x={960} y={855} text="NOT REST. ATTENTION." color={a} size={54} anchor="middle"/></>}
  {phase===7&&<><DoodlePerson x={960} y={440} scale={1.35} stroke={fg} accent={a} pose="open"/><circle cx="960" cy="570" r="300" fill={a} opacity=".06"/><HandLabel x={960} y={875} text="ALLOWED TO DISAPPEAR" color={fg} size={54} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const HomeScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-07" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="Homes and relationships change" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><DoodleBed x={650} y={430} scale={1.65} stroke={fg} accent={a}/><RoughPath d="M560 310 L1330 900" stroke={a} strokeWidth={14}/><HandLabel x={960} y={930} text="THE BED BECOMES OPTIONAL" color={a} size={48} anchor="middle"/></>}
  {phase===1&&<><DoodleCard x={250} y={360} w={400} h={220} stroke={fg} accent={a} title="BEDROOM →" value="STUDIO"/><DoodleCard x={760} y={360} w={400} h={220} stroke={fg} accent={a} title="BEDROOM →" value="GYM"/><DoodleCard x={1270} y={360} w={400} h={220} stroke={fg} accent={a} title="BEDROOM →" value="OFFICE"/></>}
  {phase===2&&<><DoodlePerson x={560} y={470} scale={1.2} stroke={fg} accent={a} pose="neutral"/><DoodlePerson x={1360} y={470} scale={1.2} stroke={fg} accent={a} pose="neutral"/><DoodleArrow x1={700} y1={580} x2={350} y2={580} stroke={a}/><DoodleArrow x1={1220} y1={580} x2={1570} y2={580} stroke={a}/><HandLabel x={960} y={860} text="SAME HOME. DIFFERENT DAYS." color={a} size={50} anchor="middle"/></>}
  {phase===3&&<><DoodlePerson x={560} y={480} scale={1.1} stroke={fg} accent={a} pose="open"/><DoodlePerson x={960} y={480} scale={1.1} stroke={fg} accent={a} pose="open"/><DoodlePerson x={1360} y={480} scale={1.1} stroke={fg} accent={a} pose="open"/><circle cx="960" cy="590" r="320" fill={a} opacity=".055"/><HandLabel x={960} y={870} text="DELIBERATE OVERLAP HOURS" color={a} size={48} anchor="middle"/></>}
  {phase===4&&<><DoodleCard x={470} y={360} w={980} h={230} stroke={fg} accent={a} title="FAMILY RULE" value="OFFLINE TOGETHER"/><HandLabel x={960} y={800} text="SYNCHRONY HAS TO BE DESIGNED" color={fg} size={42} anchor="middle"/></>}
  {phase===5&&<><DoodleBaby x={960} y={475} scale={1.85} stroke={fg} accent={a}/><DoodleClock x={1450} y={520} r={175} stroke={fg} accent={a} hour={2}/><HandLabel x={960} y={890} text="THE BABY DOESN'T SLEEP EITHER" color={a} size={52} anchor="middle"/></>}
  {phase===6&&<><DoodleBaby x={960} y={430} scale={1.6} stroke={fg} accent={a}/><BigType x={480} y={775} size={84} color={a} maxWidth={960}>NO BEDTIME. EVER.</BigType></>}
  {phase===7&&<><DoodleClock x={960} y={520} r={260} stroke={fg} accent={a} hour={12}/><HandLabel x={960} y={915} text="WHAT DOES A 'DAY' EVEN MEAN NOW?" color={a} size={48} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const MemoryScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-08" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="Memory and time" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><RoughPath d="M180 560 C430 350 650 780 900 560 S1370 340 1610 560 S1810 760 1770 560" stroke={fg} strokeWidth={10} opacity={.55}/><DoodleArrow x1={240} y1={560} x2={1680} y2={560} stroke={a}/><HandLabel x={960} y={850} text="ONE CONTINUOUS STREAM" color={a} size={56} anchor="middle"/></>}
  {phase===1&&<><DoodleCard x={280} y={370} w={520} h={240} stroke={fg} accent={a} title="TODAY" value="BAD DAY"/><DoodleArrow x1={870} y1={490} x2={1060} y2={490} stroke={a}/><DoodleCard x={1120} y={370} w={520} h={240} stroke={fg} accent={a} title="WITHOUT SLEEP" value="STILL GOING"/></>}
  {phase===2&&<><DoodleClock x={480} y={520} r={170} stroke={fg} accent={a}/><DoodleClock x={960} y={520} r={170} stroke={fg} accent={a}/><DoodleClock x={1440} y={520} r={170} stroke={fg} accent={a}/><RoughPath d="M300 760 Q960 880 1620 760" stroke={a} strokeWidth={8}/><HandLabel x={960} y={910} text="DAYS BLUR TOGETHER" color={fg} size={50} anchor="middle"/></>}
  {phase===3&&<><DoodleCard x={230} y={380} w={420} h={190} stroke={fg} accent={a} title="RESET" value="SHOWER"/><DoodleCard x={750} y={380} w={420} h={190} stroke={fg} accent={a} title="RESET" value="WALK"/><DoodleCard x={1270} y={380} w={420} h={190} stroke={fg} accent={a} title="RESET" value="MEDITATE"/></>}
  {phase===4&&<><DoodlePhone x={480} y={355} scale={1.2} stroke={fg} accent={a} notifications={0}/><RoughPath d="M420 300 L700 830" stroke={a} strokeWidth={13}/><DoodleClock x={1260} y={520} r={205} stroke={fg} accent={a}/><HandLabel x={960} y={880} text="AN HOUR WITH NO SCREENS" color={a} size={50} anchor="middle"/></>}
  {phase===5&&<><DoodlePerson x={520} y={470} scale={1.15} stroke={fg} accent={a} pose="tired"/><DoodlePerson x={960} y={470} scale={1.15} stroke={fg} accent={a} pose="tired"/><DoodlePerson x={1400} y={470} scale={1.15} stroke={fg} accent={a} pose="tired"/><HandLabel x={520} y={830} text="BOREDOM" color={fg} size={36} anchor="middle"/><HandLabel x={960} y={830} text="STRESS" color={fg} size={36} anchor="middle"/><HandLabel x={1400} y={830} text="GRIEF" color={fg} size={36} anchor="middle"/></>}
  {phase===6&&<><DoodleBrain x={690} y={500} scale={1.3} stroke={fg} accent={a}/><DoodleArrow x1={900} y1={520} x2={1110} y2={520} stroke={a}/><DoodleShield x={1320} y={500} scale={1.0} stroke={fg} accent={a}/><HandLabel x={960} y={860} text="CONSCIOUSNESS CAN NEED A BREAK" color={a} size={46} anchor="middle"/></>}
  {phase===7&&<><DoodlePerson x={960} y={420} scale={1.25} stroke={fg} accent={a} pose="neutral"/><rect x="520" y="280" width="880" height="560" rx="55" fill="rgba(234,231,225,.018)" stroke={fg} strokeWidth="5" opacity=".22"/><HandLabel x={960} y={915} text="DARK ROOM. NOTHING TO DO." color={a} size={52} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const PayoffScene=({phase,beat,palette,beatOrdinal})=>{const fg=palette.foreground,a=palette.accent; return <SceneShell sceneId="scene-09" beatOrdinal={beatOrdinal} palette={palette}><TitleChip text="Payoff" accent={a} foreground={fg}/><SvgStage>
  {phase===0&&<><PieClock x={960} y={520} r={275} stroke={fg} accent={a}/><HandLabel x={960} y={920} text="A THIRD OF EACH DAY BACK" color={a} size={54} anchor="middle"/></>}
  {phase===1&&<><PieClock x={680} y={520} r={230} stroke={fg} accent={a}/><DoodleCard x={1080} y={390} w={520} h={240} stroke={fg} accent={a} title="BIOLOGY" value="SUPERPOWER"/><HandLabel x={960} y={870} text="SOCIAL RESULT? LESS OBVIOUS." color={fg} size={46} anchor="middle"/></>}
  {phase===2&&<><PieClock x={960} y={520} r={235} stroke={fg} accent={a}/><DoodleArrow x1={240} y1={330} x2={700} y2={470} stroke={a}/><DoodleArrow x1={1680} y1={330} x2={1220} y2={470} stroke={a}/><DoodleArrow x1={240} y1={800} x2={700} y2={590} stroke={a}/><DoodleArrow x1={1680} y1={800} x2={1220} y2={590} stroke={a}/><HandLabel x={180} y={285} text="WORK" color={fg} size={36}/><HandLabel x={1740} y={285} text="FAMILY" color={fg} size={36}/><HandLabel x={120} y={875} text="INTERNET" color={fg} size={36}/><HandLabel x={1690} y={875} text="ECONOMY" color={fg} size={36}/></>}
  {phase===3&&<><PieClock x={960} y={520} r={250} stroke={fg} accent={a}/><DoodlePerson x={510} y={440} scale={1.0} stroke={fg} accent={a} pose="reach"/><DoodlePerson x={1410} y={440} scale={1.0} stroke={fg} accent={a} pose="reach"/><RoughLine x1={660} y1={560} x2={1260} y2={560} stroke={a} strokeWidth={11}/><HandLabel x={960} y={900} text="EVERYONE WANTS THE SLICE" color={a} size={52} anchor="middle"/></>}
  {phase===4&&<><DoodlePerson x={960} y={430} scale={1.4} stroke={fg} accent={a} pose="open"/><PieClock x={960} y={540} r={330} stroke={fg} accent={a} opacity={.22}/><HandLabel x={960} y={930} text="OR YOU KEEP IT" color={a} size={64} anchor="middle"/></>}
  {phase===5&&<><DoodleShield x={960} y={470} scale={1.42} stroke={fg} accent={a}/><HandLabel x={960} y={850} text="PROTECT YOUR TIME" color={a} size={60} anchor="middle"/></>}
  {phase===6&&<><DoodlePerson x={960} y={400} scale={1.28} stroke={fg} accent={a} pose="neutral"/><circle cx="960" cy="550" r="320" fill={a} opacity=".04"/><HandLabel x={960} y={865} text="8 HOURS OF DOING NOTHING" color={fg} size={56} anchor="middle"/></>}
  {phase===7&&<><PieClock x={960} y={470} r={220} stroke={fg} accent={a}/><HandLabel x={960} y={790} text="THE LAST PART OF THE DAY" color={fg} size={44} anchor="middle"/><HandLabel x={960} y={865} text="THE WORLD CAN'T ASK YOU TO GIVE BACK" color={a} size={48} anchor="middle"/></>}
</SvgStage>{beat.callout?<BigType x={110} y={875} size={46} maxWidth={760}>{beat.callout}</BigType>:null}</SceneShell>;};

const sceneComponents={
  'scene-01':HookScene,'scene-02':SecondLifeScene,'scene-03':BiologyScene,'scene-04':CircadianScene,'scene-05':EconomyScene,
  'scene-06':BoundaryScene,'scene-07':HomeScene,'scene-08':MemoryScene,'scene-09':PayoffScene,
};

export const SleepScene=({beat,beatOrdinal=1,palette})=>{
  const Component=sceneComponents[beat?.sceneId];
  if(!Component) return <AbsoluteFill style={{backgroundColor:palette.background}}/>;
  const phase=(Math.max(1,Number(beatOrdinal))-1)%8;
  return <Component phase={phase} beat={beat} palette={palette} beatOrdinal={beatOrdinal}/>;
};

export const SleepThumbnailArt=({palette})=>{
  const fg=palette.foreground,a=palette.accent;
  return <SvgStage>
    <PieClock x={1410} y={540} r={310} stroke={fg} accent={a}/>
    <path d="M1410 540 L1410 230 A310 310 0 0 1 1678 695 Z" fill={a} opacity=".88"/>
    <DoodlePerson x={1000} y={430} scale={1.38} stroke={fg} accent={a} pose="reach"/>
    <DoodleArrow x1={1120} y1={475} x2={1275} y2={430} stroke={a} strokeWidth={9}/>
    <HandLabel x={1410} y={555} text="8H" color="#0b0d12" size={62} anchor="middle"/>
  </SvgStage>;
};