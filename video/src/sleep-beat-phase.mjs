const LATE_PHASES=Object.freeze({
  'scene-02':Object.freeze({9:5,10:6,11:7,12:7}),
  'scene-03':Object.freeze({9:4,10:6,11:6,12:7}),
  'scene-04':Object.freeze({9:5,10:7}),
  'scene-05':Object.freeze({9:6,10:6,11:7,12:5}),
  'scene-06':Object.freeze({9:4,10:5,11:5,12:6}),
  'scene-07':Object.freeze({9:3,10:4,11:5,12:5,13:6,14:6}),
  'scene-08':Object.freeze({9:6,10:7}),
  'scene-09':Object.freeze({9:6,10:5}),
});

export function getSleepBeatPhase(sceneId,beatOrdinal){
  const ordinal=Math.max(1,Number(beatOrdinal)||1);
  if(ordinal<=8) return ordinal-1;
  const mapped=LATE_PHASES[sceneId]?.[ordinal];
  return Number.isInteger(mapped)?mapped:7;
}
