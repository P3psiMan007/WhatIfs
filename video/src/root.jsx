import React from 'react';
import {Composition} from 'remotion';
import {WhatIfEpisode,WhatIfThumbnail} from './what-if-episode.jsx';

const palette={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
const defaultProps={
  episodeId:'preview',
  title:'What If Humans Never Needed Sleep?',
  durationSeconds:12,
  audio:null,
  palette,
  captions:[{start:0,end:4,text:'Imagine never needing to sleep again.'}],
  scenes:[{id:'a',start:0,duration:6,headline:'NO MORE SLEEP',narration:'Imagine never needing to sleep again.',visual:'clock'}],
  beats:[
    {id:'a-1',start:0,duration:4,sceneId:'a',sceneHeadline:'HOOK',text:'Imagine never needing to sleep again.',callout:'NO MORE SLEEP',visual:'clock',layout:0},
    {id:'a-2',start:4,duration:4,sceneId:'a',sceneHeadline:'HOOK',text:'You gain eight extra hours.',callout:'EIGHT HOURS',visual:'hourglass',layout:1},
    {id:'a-3',start:8,duration:4,sceneId:'a',sceneHeadline:'PAYOFF',text:'Those hours may stop belonging to you.',callout:null,visual:'scale',layout:2},
  ],
};
const thumbnailProps={episodeId:'preview',title:'What If Humans Never Needed Sleep?',thumbnailText:'8 HOURS BACK',palette,visual:'clock'};

export const RemotionRoot=()=> <>
  <Composition id="WhatIfEpisode" component={WhatIfEpisode} width={1920} height={1080} fps={30} durationInFrames={360} defaultProps={defaultProps} calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(Number(props.durationSeconds||12)*30))})}/>
  <Composition id="WhatIfThumbnail" component={WhatIfThumbnail} width={1280} height={720} fps={30} durationInFrames={1} defaultProps={thumbnailProps}/>
</>;
