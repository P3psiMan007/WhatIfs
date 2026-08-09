import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {imageAssetsForScene} from './episode1-image-assets.mjs';
import {IMAGE_FIRST_TAKES, imageFirstTakeFor} from './episode1-shot-map.mjs';

const CLAMP = {extrapolateLeft:'clamp', extrapolateRight:'clamp'};
const AMBER = '#ffb340';
const OCCLUDER_CLIPS = Object.freeze({
  left: 'polygon(0 0,20% 0,31% 100%,0 100%)',
  right: 'polygon(79% 0,100% 0,100% 100%,68% 100%)',
  bottom: 'polygon(0 76%,100% 66%,100% 100%,0 100%)',
  doorway: 'polygon(0 0,17% 0,26% 100%,0 100%)',
  rail: 'polygon(0 78%,100% 65%,100% 100%,0 100%)',
  'top-left': 'polygon(0 0,34% 0,22% 32%,0 44%)',
  'top-right': 'polygon(70% 0,100% 0,100% 42%,82% 29%)',
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const progressFor = (frame, durationInFrames) => clamp01(frame / Math.max(1, Number(durationInFrames || 1) - 1));

// This is a second image plane, cropped to a real edge of the chosen plate and
// moved faster than the camera. It supplies actual foreground parallax instead
// of a reusable gradient pretending to be depth.
const ForegroundOccluder = ({source, take, progress, baseX, baseY}) => {
  if (take.occluder === 'none' || take.occluderOpacity === 0) return null;
  const x = interpolate(progress,[0,1],[baseX * 1.7 - .8,baseX * 2.6 + 1.1],CLAMP);
  const y = interpolate(progress,[0,1],[baseY * 1.7 + .4,baseY * 2.4 - .6],CLAMP);
  const scale = interpolate(progress,[0,1],[1.18,1.29],CLAMP);
  return <AbsoluteFill style={{overflow:'hidden',pointerEvents:'none'}}>
    <Img
      src={staticFile(source)}
      style={{
        position:'absolute',left:'-15%',top:'-15%',width:'130%',height:'130%',objectFit:'cover',objectPosition:take.position,
        clipPath:OCCLUDER_CLIPS[take.occluder] || OCCLUDER_CLIPS.left,
        transform:`translate3d(${x}%, ${y}%, 0) scale(${scale})`,
        opacity:take.occluderOpacity ?? .20,
        filter:`saturate(.90) contrast(1.05) brightness(${take.occluderBrightness ?? .84}) blur(1.1px)`,
        mixBlendMode:'multiply',
      }}
    />
  </AbsoluteFill>;
};

const ImageFirstPlate = ({sceneId, localBeatOrdinal, durationInFrames}) => {
  const frame = useCurrentFrame();
  const take = imageFirstTakeFor(sceneId, localBeatOrdinal);
  const source = imageAssetsForScene(sceneId)[take.asset];
  const progress = progressFor(frame, durationInFrames);
  const scale = interpolate(progress, [0,1], take.scale, CLAMP);
  const x = interpolate(progress, [0,1], [take.drift[0], take.drift[1]], CLAMP);
  const y = interpolate(progress, [0,1], [take.lift[0], take.lift[1]], CLAMP);
  const atmosphereShift = interpolate(progress, [0,1], [-.7,.8], CLAMP);
  return <AbsoluteFill style={{backgroundColor:'#05070d',overflow:'hidden'}}>
    <Img
      src={staticFile(source)}
      style={{
        width:'100%',height:'100%',objectFit:'cover',objectPosition:take.position,
        transform:`translate3d(${x}%, ${y}%, 0) scale(${scale})`,
        filter:`saturate(.96) contrast(1.035) brightness(${take.exposure})`,
      }}
    />
    <AbsoluteFill style={{background:take.light,opacity:take.lightOpacity ?? 1,pointerEvents:'none'}} />
    <AbsoluteFill style={{background:take.haze,opacity:take.hazeOpacity ?? .72,pointerEvents:'none'}} />
    <ForegroundOccluder source={source} take={take} progress={progress} baseX={x} baseY={y}/>
    <AbsoluteFill style={{background:take.foreground,opacity:take.foregroundOpacity ?? 1,transform:`translateX(${atmosphereShift}%)`,pointerEvents:'none'}} />
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,.025) 45%,rgba(0,0,0,.16) 100%)',opacity:take.shadowOpacity ?? 1,pointerEvents:'none'}} />
  </AbsoluteFill>;
};

const MinimalCallout = ({text}) => {
  if (!text || String(text).length > 18) return null;
  return <div style={{position:'absolute',left:118,top:98,padding:'9px 14px',borderRadius:10,background:'rgba(5,8,14,.55)',border:'1px solid rgba(240,238,232,.12)',fontSize:24,fontWeight:800,letterSpacing:2,color:AMBER,textShadow:'0 4px 18px rgba(0,0,0,.45)'}}>{String(text).toUpperCase()}</div>;
};

const isHighValueCallout = (beat, localBeatOrdinal) => {
  const callout = String(beat?.callout || '').toUpperCase();
  return (beat?.sceneId === 'scene-01' && callout === '8 HOURS' && localBeatOrdinal <= 6)
    || (beat?.sceneId === 'scene-02' && callout === '2,920 HOURS' && localBeatOrdinal <= 12);
};

export {IMAGE_FIRST_TAKES, imageFirstTakeFor};

export const CinematicEpisodeScene = ({beat, beatOrdinal = 1, durationInFrames}) => {
  const sceneId = beat?.sceneId || 'scene-08';
  return <AbsoluteFill data-visual-owner="cinematic-single" style={{backgroundColor:'#090c12'}}>
    <ImageFirstPlate sceneId={sceneId} localBeatOrdinal={beatOrdinal} durationInFrames={durationInFrames}/>
    {isHighValueCallout(beat, beatOrdinal) ? <MinimalCallout text={beat.callout}/> : null}
  </AbsoluteFill>;
};
