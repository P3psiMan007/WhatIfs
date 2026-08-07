import React from 'react';
import {Composition} from 'remotion';
import {WhatIfEpisode} from './what-if-episode.jsx';

const defaultProps = {
  episodeId: 'preview',
  title: 'What If Humans Never Needed Sleep?',
  durationSeconds: 12,
  audio: null,
  palette: {background: '#0b0d12', foreground: '#eae7e1', accent: '#ffb340'},
  captions: [],
  scenes: [
    {id:'a', start:0, duration:6, headline:'NO MORE SLEEP', narration:'Imagine never needing to sleep again.', visual:'clock'},
    {id:'b', start:6, duration:6, headline:'8 HOURS BACK', narration:'You would gain thousands of waking hours.', visual:'hourglass'}
  ]
};

export const RemotionRoot = () => (
  <Composition
    id="WhatIfEpisode"
    component={WhatIfEpisode}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={360}
    defaultProps={defaultProps}
    calculateMetadata={({props}) => ({
      durationInFrames: Math.max(1, Math.ceil(Number(props.durationSeconds || 12) * 30)),
    })}
  />
);
