export const EPISODE1_IMAGE_ASSET_REVISION = 'image-first-cinematic-v5';

export const EPISODE1_IMAGE_SCENE_IDS = Object.freeze([
  'scene-01',
  'scene-02',
  'scene-03',
  'scene-04',
  'scene-05',
  'scene-06',
  'scene-07',
  'scene-08',
  'scene-09',
]);

// Counts are measured from the actual ~6:20 narrator timing, not a generic
// preview. They make a missing late-beat camera choice a hard failure.
export const EPISODE1_ACTUAL_BEAT_COUNTS = Object.freeze({
  'scene-01': 6,
  'scene-02': 12,
  'scene-03': 13,
  'scene-04': 10,
  'scene-05': 12,
  'scene-06': 11,
  'scene-07': 13,
  'scene-08': 10,
  'scene-09': 10,
});

export const EPISODE1_IMAGE_ASSETS = Object.freeze({
  'scene-01': Object.freeze(['generated/episode1/scene-01-a.png', 'generated/episode1/scene-01-b.png', 'generated/episode1/scene-01-c.png', 'generated/episode1/scene-01-d.png', 'generated/episode1/scene-01-e.png', 'generated/episode1/scene-01-f.png', 'generated/episode1/scene-01-g.png', 'generated/episode1/scene-01-h.png']),
  'scene-02': Object.freeze(['generated/episode1/scene-02-a.png', 'generated/episode1/scene-02-b.png', 'generated/episode1/scene-02-c.png', 'generated/episode1/scene-02-d.png', 'generated/episode1/scene-02-e.png', 'generated/episode1/scene-02-f.png', 'generated/episode1/scene-02-g.png', 'generated/episode1/scene-02-h.png', 'generated/episode1/scene-02-i.png', 'generated/episode1/scene-02-j.png', 'generated/episode1/scene-02-k.png', 'generated/episode1/scene-02-l.png', 'generated/episode1/scene-02-m.png', 'generated/episode1/scene-02-n.png']),
  'scene-03': Object.freeze(['generated/episode1/scene-03-a.png', 'generated/episode1/scene-03-b.png', 'generated/episode1/scene-03-c.png', 'generated/episode1/scene-03-d.png', 'generated/episode1/scene-03-e.png', 'generated/episode1/scene-03-f.png', 'generated/episode1/scene-03-g.png', 'generated/episode1/scene-03-h.png', 'generated/episode1/scene-03-i.png', 'generated/episode1/scene-03-j.png', 'generated/episode1/scene-03-k.png', 'generated/episode1/scene-03-l.png', 'generated/episode1/scene-03-m.png', 'generated/episode1/scene-03-n.png']),
  'scene-04': Object.freeze(['generated/episode1/scene-04-a.png', 'generated/episode1/scene-04-b.png', 'generated/episode1/scene-04-c.png', 'generated/episode1/scene-04-d.png', 'generated/episode1/scene-04-e.png', 'generated/episode1/scene-04-f.png', 'generated/episode1/scene-04-g.png', 'generated/episode1/scene-04-h.png', 'generated/episode1/scene-04-i.png', 'generated/episode1/scene-04-j.png', 'generated/episode1/scene-04-k.png']),
  'scene-05': Object.freeze(['generated/episode1/scene-05-a.png', 'generated/episode1/scene-05-b.png', 'generated/episode1/scene-05-c.png', 'generated/episode1/scene-05-d.png', 'generated/episode1/scene-05-e.png', 'generated/episode1/scene-05-f.png', 'generated/episode1/scene-05-g.png', 'generated/episode1/scene-05-h.png', 'generated/episode1/scene-05-i.png', 'generated/episode1/scene-05-j.png', 'generated/episode1/scene-05-k.png', 'generated/episode1/scene-05-l.png', 'generated/episode1/scene-05-m.png', 'generated/episode1/scene-05-n.png', 'generated/episode1/scene-05-o.png', 'generated/episode1/scene-05-p.png']),
  'scene-06': Object.freeze(['generated/episode1/scene-06-a.png', 'generated/episode1/scene-06-b.png', 'generated/episode1/scene-06-c.png', 'generated/episode1/scene-06-d.png', 'generated/episode1/scene-06-e.png', 'generated/episode1/scene-06-f.png', 'generated/episode1/scene-06-g.png', 'generated/episode1/scene-06-h.png', 'generated/episode1/scene-06-i.png', 'generated/episode1/scene-06-j.png', 'generated/episode1/scene-06-k.png', 'generated/episode1/scene-06-l.png']),
  'scene-07': Object.freeze(['generated/episode1/scene-07-a.png', 'generated/episode1/scene-07-b.png', 'generated/episode1/scene-07-c.png', 'generated/episode1/scene-07-d.png', 'generated/episode1/scene-07-e.png', 'generated/episode1/scene-07-f.png', 'generated/episode1/scene-07-g.png', 'generated/episode1/scene-07-h.png', 'generated/episode1/scene-07-i.png', 'generated/episode1/scene-07-j.png', 'generated/episode1/scene-07-k.png', 'generated/episode1/scene-07-l.png', 'generated/episode1/scene-07-m.png', 'generated/episode1/scene-07-n.png', 'generated/episode1/scene-07-o.png']),
  'scene-08': Object.freeze(['generated/episode1/scene-08-a.png', 'generated/episode1/scene-08-b.png', 'generated/episode1/scene-08-c.png', 'generated/episode1/scene-08-d.png', 'generated/episode1/scene-08-e.png', 'generated/episode1/scene-08-f.png', 'generated/episode1/scene-08-g.png', 'generated/episode1/scene-08-h.png', 'generated/episode1/scene-08-i.png', 'generated/episode1/scene-08-j.png', 'generated/episode1/scene-08-k.png']),
  'scene-09': Object.freeze(['generated/episode1/scene-09-a.png', 'generated/episode1/scene-09-b.png', 'generated/episode1/scene-09-c.png', 'generated/episode1/scene-09-d.png', 'generated/episode1/scene-09-e.png', 'generated/episode1/scene-09-f.png', 'generated/episode1/scene-09-g.png', 'generated/episode1/scene-09-h.png', 'generated/episode1/scene-09-i.png', 'generated/episode1/scene-09-j.png', 'generated/episode1/scene-09-k.png', 'generated/episode1/scene-09-l.png']),
});

// These originals are retained in the immutable asset ledger, but have been
// screened out of the finished cut because their clipped shadows fail the
// real-frame readability threshold. The shot-map test makes this decision
// fail closed rather than relying on a human to remember it at render time.
export const EPISODE1_SCREENING_BLOCKED_ASSETS = Object.freeze(new Set([
  'generated/episode1/scene-01-a.png',
  'generated/episode1/scene-01-b.png',
  'generated/episode1/scene-02-c.png',
  'generated/episode1/scene-02-e.png',
  'generated/episode1/scene-03-d.png',
  'generated/episode1/scene-04-b.png',
  'generated/episode1/scene-05-b.png',
  'generated/episode1/scene-05-c.png',
  'generated/episode1/scene-05-d.png',
  'generated/episode1/scene-05-f.png',
  'generated/episode1/scene-06-a.png',
  'generated/episode1/scene-07-a.png',
  'generated/episode1/scene-07-b.png',
  'generated/episode1/scene-08-a.png',
  'generated/episode1/scene-09-c.png',
  'generated/episode1/scene-09-g.png',
]));

export function imageAssetsForScene(sceneId) {
  return EPISODE1_IMAGE_ASSETS[sceneId] || EPISODE1_IMAGE_ASSETS['scene-08'];
}

export function assertEpisode1ImageAssetCoverage(sceneIds) {
  const actual = [...new Set(sceneIds || [])].sort();
  const expected = [...EPISODE1_IMAGE_SCENE_IDS].sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    throw new Error(`Episode 1 image asset coverage mismatch: expected ${expected.join(', ')}, received ${actual.join(', ')}`);
  }
  for (const id of expected) {
    const assets = EPISODE1_IMAGE_ASSETS[id];
    const expectedVariants = Array.from({length: assets?.length || 0}, (_, index) => String.fromCharCode(97 + index));
    if (!Array.isArray(assets) || assets.length < 2 || assets.some((asset, index) => asset !== `generated/episode1/${id}-${expectedVariants[index]}.png`)) {
      throw new Error(`Episode 1 image asset set is invalid for ${id}`);
    }
  }
  return true;
}
