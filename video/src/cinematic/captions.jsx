import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CLAMP, FILM} from './grade.jsx';

const TYPE = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Captions sized for a phone held at arm's length: 54px on a 1080p master is
 * roughly the same angular size as 17px UI text on the device. No box - a
 * gradient scrim keeps contrast without stamping a rectangle over the frame.
 */
export const Captions = ({cues}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = (cues || []).find((item) => t >= item.start && t < item.end);
  if (!cue) return null;

  const local = t - cue.start;
  const remaining = cue.end - t;
  const opacity = Math.min(
    interpolate(local, [0, 0.14], [0, 1], CLAMP),
    interpolate(remaining, [0, 0.12], [0, 1], CLAMP),
  );
  const lift = interpolate(local, [0, 0.26], [7, 0], {...CLAMP, easing: (x) => 1 - Math.pow(1 - x, 3)});

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 300,
          background: 'linear-gradient(180deg, rgba(4,6,11,0) 0%, rgba(4,6,11,0.42) 52%, rgba(4,6,11,0.72) 100%)',
          opacity: opacity * 0.95,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 200,
          right: 200,
          bottom: 92,
          display: 'flex',
          justifyContent: 'center',
          opacity,
          transform: `translateY(${lift}px)`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            fontFamily: TYPE,
            fontSize: 54,
            lineHeight: 1.24,
            fontWeight: 600,
            letterSpacing: -0.4,
            color: FILM.paper,
            textAlign: 'center',
            textShadow: '0 2px 4px rgba(0,0,0,0.85), 0 8px 30px rgba(0,0,0,0.75)',
          }}
        >
          {cue.text}
        </div>
      </div>
    </>
  );
};
