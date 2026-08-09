import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {getSleepSceneSpec} from './sleep-visual-registry.mjs';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const font = 'Arial, Helvetica, sans-serif';
const cameraPositions = [
  [-26,-14,1.05],[18,-10,1.075],[-16,12,1.09],[22,10,1.06],[0,-16,1.08],[-20,8,1.07],[20,12,1.095],[0,0,1.055],
];

export function SleepAssetScene({beat, beatOrdinal = 1, palette}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const spec = getSleepSceneSpec(beat?.sceneId);
  const [x,y,baseScale] = cameraPositions[(Math.max(1, beatOrdinal) - 1) % cameraPositions.length];
  const progress = interpolate(frame, [0, Math.max(1, Number(beat?.duration || 4) * fps)], [0,1], clamp);
  const scale = baseScale + progress * 0.018;
  const callout = String(beat?.callout || '').trim();

  return <AbsoluteFill style={{backgroundColor: palette.background, overflow:'hidden'}} data-visual-owner="authored-asset-only">
    {spec ? <Img
      src={staticFile(spec.asset)}
      style={{
        position:'absolute', inset:-45, width:'calc(100% + 90px)', height:'calc(100% + 90px)',
        objectFit:'cover', transform:`translate(${x}px, ${y}px) scale(${scale})`, transformOrigin:'50% 50%'
      }}
    /> : null}
    <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(11,13,18,.04), rgba(11,13,18,.14) 72%, rgba(11,13,18,.48))'}}/>
    {callout ? <div style={{
      position:'absolute', left:88, bottom:118, maxWidth:760, fontFamily:font, fontSize:46,
      lineHeight:1, fontWeight:900, letterSpacing:-1.5, color:palette.foreground,
      textTransform:'uppercase', textShadow:'0 4px 18px rgba(0,0,0,.75)'
    }}>{callout}</div> : null}
  </AbsoluteFill>;
}
