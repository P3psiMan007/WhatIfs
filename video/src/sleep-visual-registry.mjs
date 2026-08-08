export const SLEEP_SCENE_IDS = Object.freeze([
  'scene-01','scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09',
]);

export const SLEEP_SCENE_ASSETS = Object.freeze(Object.fromEntries(
  SLEEP_SCENE_IDS.map((id) => [id, `visuals/20260807-episode/${id}.svg`]),
));

const SPECS = Object.freeze({
  'scene-01': {name:'Last Bedtime', asset:SLEEP_SCENE_ASSETS['scene-01']},
  'scene-02': {name:'A Second Life', asset:SLEEP_SCENE_ASSETS['scene-02']},
  'scene-03': {name:'Sleep Is Doing Work', asset:SLEEP_SCENE_ASSETS['scene-03']},
  'scene-04': {name:'Night Still Exists Inside You', asset:SLEEP_SCENE_ASSETS['scene-04']},
  'scene-05': {name:'The 24-Hour Economy', asset:SLEEP_SCENE_ASSETS['scene-05']},
  'scene-06': {name:'Sleep Was A Boundary', asset:SLEEP_SCENE_ASSETS['scene-06']},
  'scene-07': {name:'Homes And Relationships Change', asset:SLEEP_SCENE_ASSETS['scene-07']},
  'scene-08': {name:'Memory And Time', asset:SLEEP_SCENE_ASSETS['scene-08']},
  'scene-09': {name:'Payoff', asset:SLEEP_SCENE_ASSETS['scene-09']},
});

export function getSleepSceneSpec(sceneId) {
  return SPECS[sceneId] || null;
}

export function assertSleepVisualCoverage(sceneIds) {
  const ids = Array.isArray(sceneIds) ? sceneIds : [];
  const unique = [...new Set(ids)];
  const exact = unique.length === SLEEP_SCENE_IDS.length
    && SLEEP_SCENE_IDS.every((id) => unique.includes(id))
    && unique.every((id) => SLEEP_SCENE_IDS.includes(id));
  if (!exact) throw new Error(`Sleep visual coverage mismatch: expected ${SLEEP_SCENE_IDS.join(', ')}, received ${unique.join(', ')}`);
  if (!SLEEP_SCENE_IDS.every((id) => getSleepSceneSpec(id)?.asset === SLEEP_SCENE_ASSETS[id])) {
    throw new Error('Sleep visual coverage mismatch: registry asset missing');
  }
  return true;
}
