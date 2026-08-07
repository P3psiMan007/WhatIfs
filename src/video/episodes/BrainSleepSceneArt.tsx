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

const Ground: React.FC<{y?: number}> = ({y = 850}) => (
  <line x1={80} y1={y} x2={1840} y2={y} stroke={BS.faint} strokeWidth={6} strokeLinecap="round" />
);

const Stars: React.FC = () => (
  <>
    {Array.from({length: 20}, (_, i) => (
      <circle key={i} cx={80 + ((i * 131) % 1760)} cy={70 + ((i * 83) % 430)} r={i % 4 === 0 ? 4 : 2.5} fill={BS.cream} opacity={0.18 + (i % 5) * 0.06} />
    ))}
  </>
);

const BrainCity: React.FC<{dim?: number}> = ({dim = -1}) => (
  <g transform="translate(960 520)">
    <path d="M -320 5 C -335 -175 -140 -282 -8 -208 C 128 -286 330 -174 304 18 C 350 142 215 250 92 207 C 24 273 -108 255 -154 199 C -270 220 -352 112 -320 5 Z" fill={BS.bg2} stroke={BS.cream} strokeWidth={9} />
    {Array.from({length: 6}, (_, i) => {
      const x = -225 + (i % 3) * 225;
      const y = -105 + Math.floor(i / 3) * 165;
      const sleepy = i === dim;
      return (
        <g key={i} opacity={sleepy ? 0.45 : 1}>
          <rect x={x} y={y} width={138} height={95} rx={18} fill={sleepy ? BS.blue : BS.bg} stroke={sleepy ? BS.blue : BS.cream} strokeWidth={6} />
          <circle cx={x + 34} cy={y + 30} r={8} fill={sleepy ? BS.blue : BS.amber} />
          <line x1={x + 20} y1={y + 68} x2={x + 116} y2={y + 68} stroke={sleepy ? BS.blue : BS.cream} strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    })}
  </g>
);

const Stadium: React.FC<{lights: number}> = ({lights}) => (
  <g transform="translate(960 555)">
    <ellipse cx={0} cy={110} rx={655} ry={262} fill={BS.bg2} stroke={BS.cream} strokeWidth={9} />
    <ellipse cx={0} cy={110} rx={420} ry={132} fill={BS.bg} stroke={BS.faint} strokeWidth={7} />
    {Array.from({length: 32}, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return <circle key={i} cx={Math.cos(a) * 535} cy={110 + Math.sin(a) * 195} r={11} fill={i < lights ? BS.amber : BS.faint} opacity={i < lights ? 0.95 : 0.45} />;
    })}
  </g>
);

const MouseRace: React.FC<{progress: number}> = ({progress}) => (
  <g>
    {[0, 1, 2].map((i) => {
      const y = 350 + i * 190;
      const performance = i === 1 ? 0.62 : 0.92;
      return (
        <g key={i}>
          <line x1={310} y1={y} x2={1570} y2={y} stroke={BS.faint} strokeWidth={5} />
          <Mouse x={365 + performance * 1050 * progress} y={y - 10} scale={0.42} />
          <Label x={255} y={y + 16} text={i === 0 ? "RESTED" : i === 1 ? "DEPRIVED" : "+ RHYTHM"} anchor="end" size={34} color={i === 2 ? BS.blue : BS.cream} />
        </g>
      );
    })}
    <line x1={1570} y1={270} x2={1570} y2={820} stroke={BS.amber} strokeWidth={8} strokeDasharray="18 14" />
  </g>
);

export const BrainSleepSceneArt: React.FC<BrainSleepSceneArtProps> = ({scene, cameraProgress, revealProgress}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = Number(scene.sceneId.slice(1));
  const family = getBrainSleepSceneFamily(scene.sceneId);
  const bob = Math.sin(frame / (fps * 0.7)) * 7;
  const pulse = 0.5 + 0.5 * Math.sin(frame / (fps * 0.4));
  const enter = interpolate(revealProgress, [0, 0.42, 1], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const camScale = scene.cameraIntent === "push-in" ? 1 + cameraProgress * 0.045 : scene.cameraIntent === "pull-out" ? 1.045 - cameraProgress * 0.045 : 1;
  const panX = scene.cameraIntent === "pan-right" ? -35 + cameraProgress * 70 : scene.cameraIntent === "pan-left" ? 35 - cameraProgress * 70 : scene.cameraIntent === "parallax-drift" ? Math.sin(cameraProgress * Math.PI * 2) * 18 : 0;
  const panY = scene.cameraIntent === "parallax-drift" ? Math.cos(cameraProgress * Math.PI * 2) * 9 : 0;

  const switchScenes = () => {
    switch (n) {
      case 1:
        return <><Human x={470} y={700} scale={1.35} pose="think" /><Switch x={1325} y={475} scale={1.35} progress={0.22 + pulse * 0.06} /><Label x={1325} y={735} text="AWAKE  /  ASLEEP" size={38} color={BS.faint} /></>;
      case 2:
        return <><Ground y={840} /><Human x={520 + cameraProgress * 300} y={680} scale={1.05} pose={cameraProgress < 0.55 ? "work" : "sleep"} eyeMode={cameraProgress < 0.55 ? "open" : "closed"} /><Bed x={1410} y={750} scale={1.2} /><Clock x={950} y={330} scale={0.62} /><Switch x={960} y={610} scale={0.72} progress={cameraProgress} /></>;
      default:
        return <><Brain x={960} y={500} scale={1.48} /><Switch x={960} y={505} scale={0.78} progress={0.5} broken /><g opacity={enter}>{[-2, -1, 0, 1, 2].map((i) => <circle key={i} cx={960 + i * 140} cy={770 + Math.abs(i) * 35} r={24} fill={i % 2 ? BS.blue : BS.amber} opacity={0.78} />)}</g><Label x={960} y={930} text="NOT ONE MASTER SWITCH" size={48} /></>;
    }
  };

  const mouseLocalScenes = () => {
    switch (n) {
      case 4:
        return <><Mouse x={440} y={715 + bob} scale={1.15} brainPatch /><Brain x={1300} y={475} scale={1.42} patch patchColor={BS.blue} /><Wave x={1060} y={475} width={400} amp={28} phase={frame / (fps * 0.3)} color={BS.blue} /><Label x={1300} y={780} text="LOCAL SLEEP-LIKE RHYTHM" size={42} color={BS.blue} /></>;
      case 5:
        return <><Clock x={460} y={510} scale={1.18} value="30 MIN" /><g transform="translate(240 115) scale(.82)"><MouseRace progress={enter} /></g><Label x={1160} y={905} text="MEMORY ALMOST CAUGHT UP" size={42} color={BS.amber} /></>;
      default:
        return <><Human x={960} y={765} scale={0.95} /><Brain x={960} y={385} scale={1.32} leftColor={BS.blue} rightColor={BS.amber} /><Label x={960} y={665} text="WHAT DOES “AWAKE” MEAN?" size={50} /></>;
    }
  };

  const stadiumScenes = () => {
    switch (n) {
      case 7:
        return <><Stadium lights={Math.round(30 * enter)} /><Label x={960} y={185} text="BILLIONS OF NEURONS" size={50} color={BS.amber} /></>;
      case 8:
        return <><Stadium lights={Math.max(0, 32 - Math.round(cameraProgress * 32))} /><Label x={960} y={185} text="OLD MODEL: EVERYTHING SHUTS DOWN" size={42} /></>;
      case 9:
        return <><BrainCity dim={4} /><Wave x={1070} y={615} width={270} amp={24} color={BS.blue} /><Label x={960} y={915} text="DIFFERENT REGIONS. DIFFERENT SLEEP PRESSURE." size={42} /></>;
      default:
        return <><Brain x={960} y={500} scale={1.58} patch patchColor={BS.blue} /><Wave x={730} y={475} width={255} amp={28} color={BS.blue} /><Label x={960} y={840} text="LOCAL SLEEP" size={72} color={BS.blue} /></>;
    }
  };

  const fatigueScenes = () => {
    switch (n) {
      case 11:
        return <><Ground /><Human x={1260} y={700} scale={1.22} pose="work" /><Brain x={580} y={430} scale={1.1} patch /><rect x={930} y={495} width={360} height={220} rx={22} fill={BS.bg2} stroke={BS.cream} strokeWidth={8} /><Label x={1110} y={615} text="still working…" size={38} color={BS.faint} /></>;
      case 12:
        return <><Ground /><Human x={430} y={705} scale={1.08} pose="work" /><rect x={820} y={305} width={720} height={430} rx={32} fill={BS.bg2} stroke={BS.cream} strokeWidth={8} /><Label x={1180} y={480} text="7 + 5 = 17" size={72} color={BS.red} /><Brain x={530} y={345} scale={0.65} patch /><Label x={1180} y={625} text="technically awake" size={38} color={BS.faint} /></>;
      default:
        return <><Wave x={245} y={520} width={620} amp={90} color={BS.red} phase={frame / (fps * 0.2)} /><Arrow x1={900} y1={520} x2={1100} y2={520} /><Wave x={1120} y={520} width={550} amp={35} color={BS.blue} /><Label x={530} y={755} text="CHAOTIC" size={44} color={BS.red} /><Label x={1400} y={755} text="CONTROLLED" size={44} color={BS.blue} /></>;
    }
  };

  const mouseExperimentScenes = () => {
    switch (n) {
      case 14:
        return <><Brain x={960} y={500} scale={1.58} />{[-1, 0, 1].map((r) => <g key={r} opacity={0.4 + 0.55 * pulse}><circle cx={835 + r * 105} cy={425 + r * 28} r={18} fill={BS.amber} /><circle cx={1085 + r * 105} cy={590 - r * 26} r={18} fill={BS.blue} /></g>)}<Label x={960} y={850} text="ON  ·  OFF  ·  ON  ·  OFF" size={58} /></>;
      case 15:
        return <><Label x={510} y={220} text="JUST QUIETER" size={38} color={BS.faint} /><line x1={265} y1={535} x2={765} y2={535} stroke={BS.faint} strokeWidth={12} strokeLinecap="round" /><Label x={1400} y={220} text="RIGHT RHYTHM" size={38} color={BS.blue} /><Wave x={1080} y={535} width={620} amp={60} color={BS.blue} /><Label x={960} y={875} text="THE TIMING MATTERED" size={54} color={BS.amber} /></>;
      case 16:
        return <><Wave x={360} y={490} width={1200} amp={65} color={BS.blue} /><Wave x={360 + (1 - enter) * 160} y={490} width={1200} amp={65} color={BS.amber} opacity={0.75} /><Label x={960} y={770} text="INDUCED RHYTHM ≈ SLEEP RHYTHM" size={48} /></>;
      case 17:
        return <><Brain x={690} y={500} scale={1.32} patch /><rect x={1220} y={350} width={250} height={430} rx={35} fill={BS.bg2} stroke={BS.cream} strokeWidth={8} /><rect x={1264} y={395 + (1 - enter) * 270} width={162} height={335 - (1 - enter) * 270} rx={18} fill={BS.blue} opacity={0.7} /><Label x={1345} y={840} text="LOCAL DEBT ↓" size={40} color={BS.blue} /></>;
      case 18:
        return <><Mouse x={630 + cameraProgress * 260} y={655} scale={0.9} /><rect x={1030} y={480} width={290} height={260} fill={BS.bg2} stroke={BS.cream} strokeWidth={7} /><path d="M 1050 540 L 1300 540 M 1050 615 L 1300 615 M 1050 690 L 1300 690" stroke={BS.faint} strokeWidth={8} /><Label x={1175} y={415} text="TACTILE MEMORY" size={42} /></>;
      case 19:
        return <><MouseRace progress={enter} /><Label x={960} y={920} text="RESTED ≈ DEPRIVED + RHYTHM" size={48} color={BS.amber} /></>;
      case 20:
        return <><Mouse x={960} y={675 + bob} scale={1.38} brainPatch /><Label x={960} y={300} text="A LOCAL PIECE OF REST" size={52} color={BS.blue} /></>;
      default:
        return <><Mouse x={520} y={610} scale={0.9} brainPatch /><line x1={930} y1={150} x2={930} y2={900} stroke={BS.red} strokeWidth={12} /><Human x={1380} y={680} scale={1.12} pose="sleep" eyeMode="closed" /><Bed x={1380} y={765} scale={1.05} /><Label x={930} y={985} text="MOUSE RESULT ≠ HUMAN SLEEP REPLACEMENT" size={40} color={BS.red} /></>;
    }
  };

  const dolphinScenes = () => {
    switch (n) {
      case 22:
        return <><Mouse x={600 - cameraProgress * 220} y={600} scale={0.9} opacity={1 - cameraProgress} /><Dolphin x={1210 + cameraProgress * 120} y={570} scale={1.02} opacity={cameraProgress} /><Label x={960} y={205} text="NATURE WENT FURTHER" size={52} color={BS.amber} /></>;
      case 23:
        return <><path d="M 0 250 Q 960 180 1920 250" fill="none" stroke={BS.blue} strokeWidth={10} /><Dolphin x={930 + cameraProgress * 190} y={635 + bob} scale={1.05} /><Arrow x1={1190} y1={565} x2={1370} y2={280} color={BS.amber} /><Label x={1470} y={245} text="BREATHE" size={44} color={BS.amber} /></>;
      case 24:
        return <><Dolphin x={960} y={580} scale={1.12} split={pulse > 0.5 ? "left" : "right"} /><Label x={960} y={235} text="ONE HEMISPHERE AT A TIME" size={50} /><Wave x={480} y={825} width={430} amp={35} color={pulse > 0.5 ? BS.blue : BS.amber} /><Wave x={1010} y={825} width={430} amp={35} color={pulse > 0.5 ? BS.amber : BS.blue} /></>;
      default:
        return <><Dolphin x={710} y={585} scale={0.85} eyeOpen /><Brain x={1320} y={485} scale={0.72} leftColor={BS.blue} rightColor={BS.amber} /><path d="M 850 535 C 1030 420 1140 430 1245 465" fill="none" stroke={BS.amber} strokeWidth={7} strokeDasharray="14 12" /><path d="M 850 552 C 1035 650 1140 620 1245 520" fill="none" stroke={BS.blue} strokeWidth={7} strokeDasharray="14 12" /><Label x={960} y={865} text="ONE EYE CAN STAY OPEN" size={52} color={BS.amber} /></>;
    }
  };

  const birdScenes = () => {
    switch (n) {
      case 26:
        return <><Dolphin x={560 - cameraProgress * 260} y={660} scale={0.78} opacity={1 - cameraProgress} /><Bird x={1300 + cameraProgress * 120} y={470} scale={1} opacity={cameraProgress} /><path d="M 0 820 Q 960 735 1920 820" fill="none" stroke={BS.blue} strokeWidth={7} /></>;
      case 27:
        return <><Stars /><path d="M 0 870 Q 960 800 1920 870" fill="none" stroke={BS.blue} strokeWidth={8} /><Bird x={1040 + Math.sin(frame / (fps * 2)) * 100} y={470 + bob} scale={1.2} recorder /><Wave x={680} y={720} width={700} amp={28} color={BS.blue} /><Label x={960} y={210} text="SLEEPING WHILE FLYING" size={54} /></>;
      case 28:
        return <><Clock x={960} y={470} scale={1.4} value="0.69 HOURS / DAY" /><Bird x={1410} y={350 + bob} scale={0.55} /><Label x={960} y={850} text="IN THE AIR" size={42} color={BS.faint} /></>;
      default:
        return <><Stars /><Bird x={450 + cameraProgress * 900} y={470 + bob} scale={0.8} />{[0, 1, 2, 3].map((i) => <g key={i} opacity={0.35 + 0.55 * Math.max(0, 1 - Math.abs(cameraProgress - (i + 1) / 5) * 5)}><circle cx={650 + i * 300} cy={510} r={75} fill={BS.blue} opacity={0.18} /><text x={650 + i * 300} y={528} textAnchor="middle" fill={BS.blue} fontSize={54}>z</text></g>)}<Label x={960} y={830} text="TINY PACKETS OF SLEEP" size={48} /></>;
    }
  };

  const humanScenes = () => {
    switch (n) {
      case 30:
        return <><Dolphin x={400} y={540} scale={0.5} opacity={0.55} /><Human x={960} y={720} scale={1.25} pose="think" /><Brain x={1480} y={470} scale={0.85} leftColor={BS.blue} rightColor={BS.amber} /><Label x={960} y={230} text="COULD HUMANS DO IT?" size={58} /></>;
      case 31:
        return <><Brain x={540} y={500} scale={1.05} leftColor={BS.blue} rightColor={BS.amber} /><Label x={540} y={790} text="DOLPHIN" size={38} /><Brain x={1380} y={500} scale={1.05} patch patchColor={BS.blue} /><Label x={1380} y={790} text="HUMAN" size={38} /><Label x={960} y={200} text="NOT THE SAME TRICK" size={48} color={BS.red} /></>;
      case 32:
        return <><Ground y={840} /><Bed x={1300} y={735} scale={1.08} /><Human x={1270} y={655} scale={0.78} pose="sleep" eyeMode="closed" /><Brain x={660} y={460} scale={1.1} leftColor={BS.blue} rightColor={BS.cream} />{[0, 1, 2].map((i) => <path key={i} d={`M ${150 + i * 45} ${410 + i * 35} Q 340 ${350 + i * 70} 500 ${430 + i * 20}`} fill="none" stroke={BS.amber} strokeWidth={6} opacity={0.45 + 0.18 * i} />)}<Label x={660} y={760} text="NIGHT WATCH?" size={50} color={BS.blue} /></>;
      case 33:
        return <>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${430 + i * 560} 610) scale(.72)`}><Bed x={0} y={0} /><Brain x={0} y={-250} scale={0.55} leftColor={i === 0 ? BS.blue : BS.cream} rightColor={BS.cream} opacity={i === 0 ? 1 : 0.55} /><Label x={0} y={165} text={`NIGHT ${i + 1}`} size={42} /></g>)}</>;
      default:
        return <><Brain x={960} y={500} scale={1.55} leftColor={BS.blue} rightColor={BS.amber} /><line x1={960} y1={315} x2={960} y2={680} stroke={BS.red} strokeWidth={10} opacity={1 - enter} />{[0, 1, 2, 3].map((i) => <circle key={i} cx={720 + i * 165} cy={430 + (i % 2) * 140} r={48} fill={i % 2 ? BS.blue : BS.amber} opacity={0.15 + enter * 0.35} />)}<Label x={960} y={850} text="HUMANS ARE MESSIER" size={56} /></>;
    }
  };

  const distributedScenes = () => {
    switch (n) {
      case 35:
        return <><defs><linearGradient id="landscapeGradient"><stop offset="0" stopColor={BS.amber} /><stop offset=".52" stopColor={BS.faint} /><stop offset="1" stopColor={BS.blue} /></linearGradient></defs><path d="M 260 640 C 370 380 635 260 870 365 C 1050 205 1390 325 1630 610 C 1440 785 1160 850 900 775 C 610 880 390 790 260 640 Z" fill="url(#landscapeGradient)" opacity={0.52} stroke={BS.cream} strokeWidth={9} /><Label x={960} y={205} text="THE BORDER IS BLURRY" size={58} /></>;
      case 36:
        return <><BrainCity dim={Math.floor((frame / (fps * 1.4)) % 6)} /><Label x={960} y={910} text="MANY CIRCUITS. MANY STATES." size={52} /></>;
      default:
        return <>{[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${285 + i * 455} ${535 + (i % 2) * 45}) scale(.55)`}>{i === 0 ? <Brain x={0} y={0} patch /> : i === 1 ? <Human x={0} y={100} scale={1.1} pose="work" /> : i === 2 ? <Dolphin x={0} y={0} scale={0.85} split="left" /> : <Mouse x={0} y={0} scale={1.1} brainPatch />}</g>)}<path d="M 280 790 C 620 710 1280 875 1640 760" fill="none" stroke={BS.amber} strokeWidth={8} strokeDasharray="20 14" /><Label x={960} y={925} text="ONE STORY, FOUR CLUES" size={46} /></>;
    }
  };

  const futureScenes = () => {
    switch (n) {
      case 38:
        return <><Ground /><Human x={960} y={700} scale={1.25} pose="work" /><path d="M 905 512 Q 960 475 1015 512" fill="none" stroke={BS.amber} strokeWidth={12} /><Brain x={1350} y={430} scale={0.78} patch /><Label x={960} y={225} text="REST WHILE AWAKE?" size={58} /><Label x={960} y={910} text="FUTURE QUESTION — NOT CURRENT TECH" size={34} color={BS.faint} /></>;
      case 39:
        return <><Mouse x={460} y={580} scale={0.85} brainPatch /><Arrow x1={720} y1={530} x2={1210} y2={530} dashed opacity={enter} /><Human x={1480} y={680} scale={1.05} /><Label x={960} y={280} text="FROM MICE → HUMAN RESEARCH?" size={50} /></>;
      default:
        return <><Brain x={360} y={430} scale={0.62} patch /><Label x={360} y={670} text="LOCAL" size={36} color={BS.blue} /><Arrow x1={560} y1={460} x2={810} y2={460} color={BS.red} /><Human x={1250} y={720} scale={1.1} pose="sleep" eyeMode="closed" /><Bed x={1250} y={790} scale={1.08} />{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={1010 + i * 130} cy={300 + (i % 2) * 70} r={38} fill={[BS.amber, BS.blue, BS.green, BS.red, BS.cream][i]} opacity={0.45} />)}<Label x={1250} y={920} text="FULL-BODY SLEEP" size={42} /><Label x={960} y={180} text="LOCAL REST ≠ REPLACING SLEEP" size={54} color={BS.red} /></>;
    }
  };

  const finaleScenes = () => {
    if (n === 41) return <><Brain x={960} y={525} scale={1.12} leftColor={BS.blue} rightColor={BS.amber} /><Dolphin x={420} y={640 + bob} scale={0.55} split="left" /><Bird x={1500} y={330 - bob} scale={0.58} /><Mouse x={530} y={300} scale={0.58} brainPatch /><Human x={1430} y={720} scale={0.72} pose="sleep" eyeMode="closed" /><Label x={960} y={900} text="THE BRAIN COLLECTS ITS DEBT" size={52} color={BS.amber} /></>;
    return <><defs><linearGradient id="twilightGradient"><stop offset="0" stopColor="#b67843" /><stop offset=".45" stopColor="#3b3e55" /><stop offset="1" stopColor="#314b72" /></linearGradient></defs><Bed x={540} y={790} scale={0.9} /><Human x={530} y={720} scale={0.68} pose="sleep" eyeMode="closed" /><path d="M 650 675 C 790 325 1140 180 1510 370 C 1700 470 1730 700 1600 800 C 1320 920 890 900 650 675 Z" fill="url(#twilightGradient)" opacity={0.48} stroke={BS.cream} strokeWidth={9} />{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={850 + i * 160} cy={510 + (i % 2) * 110} r={35 + (i % 3) * 10} fill={i < Math.floor(cameraProgress * 6) ? BS.blue : BS.amber} opacity={0.5} />)}<Label x={1230} y={260} text="A LANDSCAPE, NOT A LINE" size={58} /></>;
  };

  const art = family === "switch-paradox" ? switchScenes() : family === "mouse-local" ? mouseLocalScenes() : family === "stadium-local" ? stadiumScenes() : family === "fatigue-human" ? fatigueScenes() : family === "mouse-experiment" ? mouseExperimentScenes() : family === "dolphin" ? dolphinScenes() : family === "frigatebird" ? birdScenes() : family === "human-first-night" ? humanScenes() : family === "distributed-brain" ? distributedScenes() : family === "future-caveat" ? futureScenes() : family === "evolution-finale" ? finaleScenes() : null;

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position: "absolute", inset: 0, background: BS.bg}}>
      <defs><radialGradient id="episodeVignette"><stop offset="0" stopColor={BS.bg2} /><stop offset="1" stopColor={BS.bg} /></radialGradient></defs>
      <rect width="1920" height="1080" fill="url(#episodeVignette)" />
      <g transform={`translate(${960 + panX} ${540 + panY}) scale(${camScale}) translate(-960 -540)`}>{art}</g>
    </svg>
  );
};
