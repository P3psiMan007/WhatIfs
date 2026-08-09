import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {FILM} from './grade.jsx';
import {SHOT_COMPONENTS} from './shots.jsx';
import {Captions} from './captions.jsx';
import {HOOK_SHOTS, buildShotFrames, findCoverageGaps} from './shot-plan.mjs';

/**
 * Episode 1 cinematic hook benchmark.
 *
 * Audio is intentionally NOT mounted here: narration and the sound bed are
 * mixed downstream by tools/benchmark_mix.py so levels are controlled in one
 * place. The render is picture only.
 */
export const CinematicHook = ({durationSeconds = 28.04, captions = [], shots = HOOK_SHOTS}) => {
  const {fps} = useVideoConfig();
  const frames = buildShotFrames(shots, fps, durationSeconds);
  const gaps = findCoverageGaps(frames, fps, durationSeconds);
  if (gaps.length) {
    // Fail closed. A gap here is exactly what produced the black flashes in
    // the rejected render, and it must never be rendered around silently.
    throw new Error(`Shot coverage gap(s): ${gaps.map((gap) => `${gap.from}-${gap.to}`).join(', ')}`);
  }

  return (
    <AbsoluteFill style={{backgroundColor: FILM.black, overflow: 'hidden'}}>
      {/* Base plate. Always painted, under every shot, for every frame. */}
      <AbsoluteFill style={{background: `radial-gradient(80% 70% at 50% 45%, #0a0e16 0%, ${FILM.black} 76%)`}} />

      {frames.map((frame) => {
        const Shot = SHOT_COMPONENTS[frame.shot];
        if (!Shot) throw new Error(`Unknown shot component: ${frame.shot}`);
        return (
          <Sequence
            key={frame.id}
            from={frame.from}
            durationInFrames={frame.durationInFrames}
            premountFor={Math.min(frame.durationInFrames, Math.round(0.6 * fps))}
            layout="none"
          >
            <AbsoluteFill data-shot={frame.id} data-visual-owner="single">
              <Shot durationInFrames={frame.durationInFrames} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <Captions cues={captions} />
    </AbsoluteFill>
  );
};
