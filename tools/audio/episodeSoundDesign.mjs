const normalized = (value) => String(value ?? "").trim().toLowerCase();

export const classifySfxIntent = (intent) => {
  const text = normalized(intent);
  if (!text) return null;
  if (/click|toggle|switch|tick/.test(text)) return "click";
  if (/whoosh|rush|wind|transition|sweep|air/.test(text)) return "whoosh";
  if (/hit|reveal|impact|thump|drop/.test(text)) return "hit";
  if (/pulse|wave|electric|electrical|brain|signal|beep/.test(text)) return "pulse";
  return null;
};

export const buildCuePlan = (scenes) =>
  scenes.flatMap((scene) => {
    const cue = classifySfxIntent(scene.sfxIntent);
    const start = Number(scene?.timing?.startSeconds);
    if (!cue || !Number.isFinite(start)) return [];
    return [{
      sceneId: scene.sceneId,
      cue,
      offsetSeconds: Number((Math.max(0, start) + 0.08).toFixed(3)),
    }];
  });
