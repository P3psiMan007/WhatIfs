import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

// One palette for the whole film. Shots move through it; they never invent
// their own colours, which is what keeps nine different scenes reading as one
// piece rather than nine templates.
export const FILM = Object.freeze({
  black: '#04060b',
  nightDeep: '#070b14',
  nightBlue: '#101c33',
  shadowBlue: '#16233d',
  moon: '#a8c6f0',
  moonDim: '#5f7ba8',
  amber: '#ff9f45',
  amberDeep: '#c96a1e',
  sodium: '#ffb15c',
  dawn: '#e8834a',
  morning: '#f6d3a0',
  morningPale: '#fbe7c9',
  paper: '#f4f1ea',
  ink: '#0a0d14',
});

const GRAIN_TILE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
       <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" stitchTiles="stitch"/>
       <feColorMatrix type="saturate" values="0"/></filter>
       <rect width="220" height="220" filter="url(#g)"/>
     </svg>`,
  );

/** Moving film grain. The tile is static; only its offset moves, so the
 *  browser rasterises the noise once instead of once per frame. */
export const Grain = ({opacity = 0.075}) => {
  const frame = useCurrentFrame();
  const x = (frame * 37) % 220;
  const y = (frame * 61) % 220;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${GRAIN_TILE}")`,
        backgroundPosition: `${x}px ${y}px`,
        opacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};

export const Vignette = ({strength = 0.72, feather = 46}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 92% at 50% 46%, rgba(0,0,0,0) ${feather}%, rgba(0,0,0,${strength * 0.5}) 78%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

/** Warm halation around highlights plus a cool shadow lift - the two moves
 *  that separate a graded frame from a flat one. */
export const ColorGrade = ({lift = 'rgba(28,52,92,0.13)', warm = 'rgba(255,150,60,0.05)'}) => (
  <>
    <AbsoluteFill style={{background: lift, mixBlendMode: 'screen', pointerEvents: 'none'}} />
    <AbsoluteFill style={{background: warm, mixBlendMode: 'soft-light', pointerEvents: 'none'}} />
  </>
);

/** Very slight lens breathing so no shot is ever mathematically still. */
export function useBreath(amount = 0.0035, period = 5.5) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return 1 + Math.sin((frame / fps / period) * Math.PI * 2) * amount;
}

/** Shot-level exposure ramp: every shot opens and closes on a small light
 *  change rather than a cut to nothing. Never returns 0, so a cut can never
 *  read as a black frame. */
export function useShotExposure(durationInFrames, {inFrames = 5, outFrames = 4, floor = 0.92} = {}) {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, inFrames], [floor, 1], CLAMP);
  const fall = interpolate(frame, [durationInFrames - outFrames, durationInFrames], [1, floor], CLAMP);
  return Math.min(rise, fall);
}

export const FilmFrame = ({children, exposure = 1, vignette = 0.72, grain = 0.075, lift, warm}) => (
  <AbsoluteFill style={{backgroundColor: FILM.black, overflow: 'hidden'}}>
    <AbsoluteFill style={{filter: exposure === 1 ? undefined : `brightness(${exposure})`}}>{children}</AbsoluteFill>
    <ColorGrade lift={lift} warm={warm} />
    <Vignette strength={vignette} />
    <Grain opacity={grain} />
  </AbsoluteFill>
);
