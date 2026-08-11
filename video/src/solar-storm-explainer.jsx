// Canonical Episode 2 semantic routes retained for ownership regression checks:
// aurora-grid-payoff
// grid-current
import React from 'react';
import {Freeze,useCurrentFrame} from 'remotion';
import {SolarStormExplainerScene as SolarStormExplainerSceneV6} from './solar-storm-explainer-v6.jsx';

export const SolarStormExplainerScene=(props)=>{
  const contextFrame=useCurrentFrame();
  const requested=Number(props?.frameOverride);
  const localFrame=Number.isFinite(requested)?Math.max(0,Math.round(requested)):contextFrame;
  return <Freeze frame={localFrame}>
    <SolarStormExplainerSceneV6 {...props}/>
  </Freeze>;
};
