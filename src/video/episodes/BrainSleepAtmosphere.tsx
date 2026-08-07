import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {BS} from "./BrainSleepPrimitives";
import {getBrainSleepSceneFamily} from "./brainSleepArtPlan";

export const BrainSleepAtmosphere: React.FC<{sceneId: string}> = ({sceneId}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const family = getBrainSleepSceneFamily(sceneId);
  const drift = Math.sin(frame / (fps * 3.5)) * 10;
  const pulse = 0.55 + 0.15 * Math.sin(frame / (fps * 1.8));

  const bedroom = (
    <>
      <rect x="1370" y="120" width="360" height="250" rx="16" fill="none" stroke={BS.blue} strokeWidth="5" opacity="0.22" />
      <circle cx="1570" cy="220" r="58" fill={BS.amber} opacity="0.09" />
      <path d="M 110 855 L 1810 855" stroke={BS.faint} strokeWidth="5" opacity="0.18" />
      <path d="M 150 710 L 300 710 L 300 850 M 210 710 L 210 610" stroke={BS.cream} strokeWidth="6" opacity="0.11" />
    </>
  );

  const lab = (
    <>
      <path d="M 80 830 L 1840 830" stroke={BS.cream} strokeWidth="6" opacity="0.13" />
      <path d="M 150 830 L 150 710 L 510 710 L 510 830 M 1420 830 L 1420 690 L 1770 690 L 1770 830" fill="none" stroke={BS.cream} strokeWidth="6" opacity="0.11" />
      {[0,1,2,3].map((i) => <circle key={i} cx={260+i*120} cy={665-(i%2)*30} r={24+i*5} fill={i%2?BS.blue:BS.amber} opacity="0.07" />)}
      <path d="M 1490 560 Q 1540 510 1590 560 L 1635 690 L 1445 690 Z" fill="none" stroke={BS.blue} strokeWidth="5" opacity="0.15" />
    </>
  );

  const office = (
    <>
      <rect x="1380" y="130" width="360" height="240" fill="none" stroke={BS.blue} strokeWidth="5" opacity="0.14" />
      <path d="M 118 845 L 1810 845 M 140 700 L 515 700 M 200 700 L 200 845 M 455 700 L 455 845" stroke={BS.cream} strokeWidth="6" opacity="0.13" />
      <rect x="270" y="500" width="250" height="150" rx="14" fill="none" stroke={BS.faint} strokeWidth="6" opacity="0.12" />
      <circle cx="1570" cy="250" r="55" fill={BS.amber} opacity="0.06" />
    </>
  );

  const ocean = (
    <>
      {[0,1,2].map((i) => <path key={i} d={`M -40 ${760+i*70} Q 380 ${700+i*70} 820 ${760+i*70} T 1700 ${760+i*70} T 2040 ${760+i*70}`} fill="none" stroke={BS.blue} strokeWidth={5} opacity={0.10+i*0.03} />)}
      {[0,1,2,3,4].map((i) => <circle key={i} cx={120+i*355+drift*(i%2?1:-1)} cy={260+(i%3)*95} r={7+i*2} fill={BS.blue} opacity="0.11" />)}
      <path d="M 0 355 Q 460 315 920 350 T 1920 350" fill="none" stroke={BS.faint} strokeWidth="4" opacity="0.07" />
    </>
  );

  const nightSky = (
    <>
      {Array.from({length: 34}, (_, i) => <circle key={i} cx={60+((i*149)%1820)} cy={55+((i*83)%520)} r={i%5===0?3.5:2} fill={BS.cream} opacity={0.07+(i%4)*0.025} />)}
      <circle cx="1560" cy="185" r="82" fill={BS.amber} opacity="0.055" />
      <path d="M -20 820 Q 440 760 880 820 T 1780 820 T 1980 820" fill="none" stroke={BS.blue} strokeWidth="6" opacity="0.15" />
      <path d={`M ${160+drift} 360 Q ${330+drift} 300 ${500+drift} 355`} fill="none" stroke={BS.faint} strokeWidth="4" opacity="0.08" />
    </>
  );

  const city = (
    <>
      {Array.from({length: 16}, (_, i) => {
        const x = 40+i*122;
        const h = 80+(i%5)*38;
        return <g key={i} opacity="0.09"><rect x={x} y={870-h} width="90" height={h} fill="none" stroke={BS.cream} strokeWidth="4" /><circle cx={x+28} cy={900-h} r="4" fill={i%3===0?BS.amber:BS.blue} /></g>;
      })}
      <path d="M 0 875 L 1920 875" stroke={BS.faint} strokeWidth="5" opacity="0.13" />
    </>
  );

  const abstract = (
    <>
      <path d="M -30 850 C 260 610 560 755 800 590 C 1040 430 1300 610 1510 455 C 1690 325 1830 430 1980 345" fill="none" stroke={BS.blue} strokeWidth="7" opacity="0.11" />
      <path d="M -30 930 C 250 700 560 850 850 690 C 1110 550 1390 730 1580 590 C 1750 470 1840 555 1990 480" fill="none" stroke={BS.amber} strokeWidth="7" opacity="0.09" />
      {Array.from({length: 10}, (_, i) => <circle key={i} cx={180+i*170} cy={260+(i%4)*95} r={18+(i%3)*7} fill={i%2?BS.blue:BS.amber} opacity={0.045+pulse*0.035} />)}
    </>
  );

  const content = family === "switch-paradox" || family === "human-first-night"
    ? bedroom
    : family === "mouse-local" || family === "mouse-experiment"
      ? lab
      : family === "fatigue-human"
        ? office
        : family === "dolphin"
          ? ocean
          : family === "frigatebird"
            ? nightSky
            : family === "stadium-local"
              ? city
              : abstract;

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:"absolute", inset:0, pointerEvents:"none"}}>
      {content}
    </svg>
  );
};
