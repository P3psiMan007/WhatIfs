import React from 'react';
import {Composition} from 'remotion';
import {WhatIfEpisode,WhatIfThumbnail} from './what-if-episode.jsx';
import {CinematicHook} from './cinematic/hook.jsx';
import {HOOK_SHOTS} from './cinematic/shot-plan.mjs';
import {WhatIfCinematicBenchmark} from './cinematic-benchmark.jsx';
import {WhatIfEditorialBenchmark} from './editorial-benchmark.jsx';

const palette={background:'#0b0d12',foreground:'#eae7e1',accent:'#ffb340'};
const defaultProps={
  episodeId:'preview',
  title:'What If Humans Never Needed Sleep?',
  durationSeconds:12,
  audio:null,
  palette,
  captions:[{start:0,end:4,text:'Tonight, you go to bed for the last time.'},{start:4,end:8,text:'Tomorrow, sleep is unnecessary.'},{start:8,end:12,text:'You gain roughly eight extra hours every day.'}],
  scenes:[{id:'scene-01',start:0,duration:12,headline:'HOOK',narration:'Tonight, you go to bed for the last time.'}],
  beats:[
    {id:'scene-01-beat-001',start:0,duration:4,sceneId:'scene-01',sceneHeadline:'HOOK',text:'Tonight, you go to bed for the last time.',callout:'LAST SLEEP'},
    {id:'scene-01-beat-002',start:4,duration:4,sceneId:'scene-01',sceneHeadline:'HOOK',text:'Tomorrow, sleep is unnecessary.',callout:'AWAKE'},
    {id:'scene-01-beat-003',start:8,duration:4,sceneId:'scene-01',sceneHeadline:'HOOK',text:'You gain roughly eight extra hours every day.',callout:'8 HOURS'},
  ],
};
const thumbnailProps={episodeId:'preview',title:'What If Humans Never Needed Sleep?',thumbnailText:'8 HOURS BACK',palette};

export const RemotionRoot=()=> <>
  <Composition id="WhatIfEpisode" component={WhatIfEpisode} width={1920} height={1080} fps={30} durationInFrames={360} defaultProps={defaultProps} calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(Number(props.durationSeconds||12)*30))})}/>
  <Composition id="WhatIfThumbnail" component={WhatIfThumbnail} width={1280} height={720} fps={30} durationInFrames={1} defaultProps={thumbnailProps}/>
  <Composition
    id="CinematicHook"
    component={CinematicHook}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={841}
    defaultProps={{durationSeconds:28.04,captions:[],shots:HOOK_SHOTS}}
    calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.round(Number(props.durationSeconds||28.04)*30))})}
  />
  <Composition id="WhatIfCinematicBenchmark" component={WhatIfCinematicBenchmark} width={1920} height={1080} fps={30} durationInFrames={720}/>
  <Composition id="WhatIfEditorialBenchmark" component={WhatIfEditorialBenchmark} width={1920} height={1080} fps={30} durationInFrames={600}/>
</>;
