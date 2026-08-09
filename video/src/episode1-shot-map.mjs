import {EPISODE1_ACTUAL_BEAT_COUNTS, EPISODE1_IMAGE_SCENE_IDS} from './episode1-image-assets.mjs';

const shot = (asset, position, scale, drift, lift, occluder, exposure = 1.06, grade = {}) => ({
  asset,
  position,
  scale,
  drift,
  lift,
  occluder,
  exposure,
  ...grade,
});

const identities = Object.freeze({
  'scene-01': {
    light: 'linear-gradient(98deg,rgba(2,6,14,.38),transparent 57%),linear-gradient(0deg,rgba(0,0,0,.22),transparent 64%)',
    haze: 'radial-gradient(52% 65% at 74% 37%,rgba(116,173,238,.18),transparent 74%)',
    foreground: 'linear-gradient(90deg,rgba(0,0,0,.20),transparent 30%)',
  },
  'scene-02': {
    light: 'linear-gradient(275deg,rgba(4,6,10,.35),transparent 56%),linear-gradient(0deg,rgba(0,0,0,.18),transparent 61%)',
    haze: 'radial-gradient(53% 62% at 67% 41%,rgba(255,170,74,.17),transparent 75%)',
    foreground: 'linear-gradient(0deg,rgba(0,0,0,.16),transparent 33%)',
  },
  'scene-03': {
    light: 'linear-gradient(92deg,rgba(2,8,15,.34),transparent 55%),linear-gradient(0deg,rgba(0,0,0,.19),transparent 59%)',
    haze: 'radial-gradient(55% 67% at 61% 44%,rgba(82,175,221,.19),transparent 76%)',
    foreground: 'linear-gradient(90deg,rgba(0,0,0,.17),transparent 32%)',
  },
  'scene-04': {
    light: 'linear-gradient(101deg,rgba(3,8,15,.18),transparent 55%),linear-gradient(0deg,rgba(0,0,0,.09),transparent 60%)',
    haze: 'radial-gradient(60% 61% at 67% 34%,rgba(122,179,234,.16),transparent 77%)',
    foreground: 'linear-gradient(0deg,rgba(0,0,0,.10),transparent 34%)',
  },
  'scene-05': {
    light: 'linear-gradient(268deg,rgba(4,6,10,.34),transparent 57%),linear-gradient(0deg,rgba(0,0,0,.18),transparent 62%)',
    haze: 'radial-gradient(52% 62% at 66% 38%,rgba(255,154,68,.16),transparent 76%)',
    foreground: 'linear-gradient(90deg,transparent 58%,rgba(0,0,0,.19))',
  },
  'scene-06': {
    light: 'linear-gradient(95deg,rgba(3,7,14,.33),transparent 57%),linear-gradient(0deg,rgba(0,0,0,.18),transparent 61%)',
    haze: 'radial-gradient(51% 65% at 72% 43%,rgba(92,163,221,.18),transparent 75%)',
    foreground: 'linear-gradient(90deg,rgba(0,0,0,.17),transparent 31%)',
  },
  'scene-07': {
    light: 'linear-gradient(269deg,rgba(4,6,11,.32),transparent 56%),linear-gradient(0deg,rgba(0,0,0,.17),transparent 62%)',
    haze: 'radial-gradient(54% 62% at 68% 43%,rgba(246,169,83,.17),transparent 76%)',
    foreground: 'linear-gradient(0deg,rgba(0,0,0,.16),transparent 32%)',
  },
  'scene-08': {
    light: 'linear-gradient(96deg,rgba(2,8,12,.33),transparent 57%),linear-gradient(0deg,rgba(0,0,0,.17),transparent 62%)',
    haze: 'radial-gradient(55% 64% at 67% 39%,rgba(74,166,171,.18),transparent 76%)',
    foreground: 'linear-gradient(90deg,rgba(0,0,0,.17),transparent 29%)',
  },
  'scene-09': {
    light: 'linear-gradient(272deg,rgba(2,6,12,.30),transparent 57%),linear-gradient(0deg,rgba(0,0,0,.15),transparent 64%)',
    haze: 'radial-gradient(58% 66% at 68% 37%,rgba(126,188,235,.19),transparent 76%)',
    foreground: 'linear-gradient(0deg,rgba(0,0,0,.15),transparent 34%)',
  },
});

const withIdentity = (sceneId, specs) => Object.freeze(specs.map((spec) => ({...identities[sceneId], ...spec})));

// Each entry is a measured narration beat. The camera position, motion and
// foreground crop are intentionally explicit so a longer render cannot wrap
// back to a centered template or silently reuse the opening composition.
export const IMAGE_FIRST_TAKES = Object.freeze({
  'scene-01': withIdentity('scene-01', [
    shot(4,'17% 64%',[1.10,1.18],[-.4,-.2],[0,.3],'none',1.13,{lightOpacity:.52,hazeOpacity:.58,foregroundOpacity:.75,shadowOpacity:.72}),
    shot(2,'76% 48%',[1.18,1.09],[.6,.2],[.2,-.2],'right',1.12,{occluderOpacity:.11,lightOpacity:.55,hazeOpacity:.62,foregroundOpacity:.78,shadowOpacity:.74}),
    shot(5,'58% 37%',[1.24,1.16],[.2,-.6],[.4,-.1],'none',1.14,{lightOpacity:.5,hazeOpacity:.45,foregroundOpacity:.68,shadowOpacity:.7}),
    shot(3,'30% 59%',[1.09,1.21],[-.5,.5],[-.1,.4],'doorway',1.11,{occluderOpacity:.12,lightOpacity:.56,hazeOpacity:.6,foregroundOpacity:.76,shadowOpacity:.73}),
    shot(7,'83% 31%',[1.30,1.15],[1.1,-.4],[.5,-.2],'none',1.14,{lightOpacity:.5,hazeOpacity:.54,foregroundOpacity:.7,shadowOpacity:.68}),
    shot(6,'20% 69%',[1.11,1.25],[-.8,.7],[-.2,.5],'none',1.12,{lightOpacity:.54,hazeOpacity:.45,foregroundOpacity:.7,shadowOpacity:.72}),
  ]),
  'scene-02': withIdentity('scene-02', [
    shot(0,'12% 58%',[1.12,1.28],[-1.1,1.3],[.3,-.6],'left',1.12,{occluderOpacity:.14}),
    shot(1,'84% 39%',[1.34,1.17],[1.8,-1.1],[.4,-.5],'none',1.28,{lightOpacity:.40,hazeOpacity:.50,foregroundOpacity:.68,shadowOpacity:.68}),
    shot(8,'44% 72%',[1.16,1.31],[-.3,1.4],[-.6,.6],'none',1.30,{lightOpacity:.42,hazeOpacity:.50,foregroundOpacity:.68,shadowOpacity:.68}),
    shot(6,'73% 31%',[1.22,1.39],[.9,-1.2],[.7,-.4],'bottom',1.13,{occluderOpacity:.13}),
    shot(5,'19% 35%',[1.37,1.20],[-1.7,.7],[.6,-.3],'left',1.1,{occluderOpacity:.12}),
    shot(3,'58% 63%',[1.13,1.26],[.4,1.1],[-.5,.5],'rail',1.30,{occluderOpacity:.06,lightOpacity:.42,hazeOpacity:.46,foregroundOpacity:.68,shadowOpacity:.65}),
    shot(7,'88% 54%',[1.29,1.42],[1.4,-1.4],[.4,-.7],'right',1.12,{occluderOpacity:.13}),
    shot(9,'37% 28%',[1.43,1.30],[-.8,-1.0],[.8,-.4],'right',1.12,{occluderOpacity:.12}),
    shot(10,'24% 66%',[1.10,1.24],[-1.3,1.0],[-.4,.7],'bottom',1.11,{occluderOpacity:.14}),
    shot(11,'67% 70%',[1.21,1.12],[1.0,.8],[-.7,.4],'rail',1.1,{occluderOpacity:.12}),
    shot(12,'52% 42%',[1.31,1.45],[.2,-1.5],[.8,-.5],'top-right',1.13,{occluderOpacity:.13}),
    shot(13,'14% 48%',[1.17,1.32],[-1.5,.7],[.2,-.6],'left',1.15,{occluderOpacity:.11,lightOpacity:.55,hazeOpacity:.56}),
  ]),
  'scene-03': withIdentity('scene-03', [
    shot(0,'14% 27%',[1.52,1.68],[-.2,-.5],[.4,-.2],'top-left',1.15,{occluderOpacity:.12,lightOpacity:.72}),
    shot(1,'83% 68%',[1.64,1.46],[.5,.2],[-.3,.5],'rail',1.15,{occluderOpacity:.1,lightOpacity:.7}),
    shot(2,'42% 41%',[1.44,1.61],[-.4,.3],[.1,-.5],'bottom',1.14,{occluderOpacity:.11,lightOpacity:.72}),
    shot(4,'66% 22%',[1.53,1.40],[.2,-.6],[.5,-.1],'top-right',1.14,{occluderOpacity:.1,lightOpacity:.7}),
    shot(5,'21% 74%',[1.37,1.58],[-.6,.4],[-.4,.5],'left',1.14,{occluderOpacity:.12,lightOpacity:.73}),
    shot(6,'78% 36%',[1.66,1.45],[.6,-.3],[.2,-.4],'right',1.15,{occluderOpacity:.1,lightOpacity:.71}),
    shot(7,'49% 55%',[1.12,1.22],[.1,.3],[-.1,-.2],'doorway',1.16,{occluderOpacity:.09,lightOpacity:.6,hazeOpacity:.58}),
    shot(11,'87% 18%',[1.74,1.56],[.5,-.4],[.6,-.3],'top-right',1.14,{occluderOpacity:.1,lightOpacity:.7}),
    shot(9,'31% 47%',[1.47,1.69],[-.5,.2],[.3,-.5],'left',1.15,{occluderOpacity:.11,lightOpacity:.72}),
    shot(10,'54% 79%',[1.34,1.55],[.2,.6],[-.5,.4],'bottom',1.14,{occluderOpacity:.12,lightOpacity:.71}),
    shot(8,'16% 59%',[1.61,1.43],[-.4,.4],[-.3,.3],'rail',1.14,{occluderOpacity:.1,lightOpacity:.72}),
    shot(12,'72% 44%',[1.48,1.65],[.4,-.5],[.4,-.5],'top-left',1.15,{occluderOpacity:.11,lightOpacity:.71}),
    shot(13,'89% 63%',[1.18,1.08],[.2,.1],[-.2,.1],'doorway',1.16,{occluderOpacity:.08,lightOpacity:.57,hazeOpacity:.55,foregroundOpacity:.8,shadowOpacity:.75}),
  ]),
  'scene-04': withIdentity('scene-04', [
    shot(3,'4% 82%',[1.04,1.12],[-.8,.3],[.3,-.4],'none',1.30,{lightOpacity:.45,hazeOpacity:.59,foregroundOpacity:.72,shadowOpacity:.70}),
    shot(7,'94% 18%',[1.13,1.03],[.9,-.5],[-.4,.3],'none',1.29,{lightOpacity:.43,hazeOpacity:.59,foregroundOpacity:.7,shadowOpacity:.68}),
    shot(2,'7% 92%',[1.08,1.17],[-.7,.6],[.4,-.4],'bottom',1.29,{occluderOpacity:.07,lightOpacity:.45}),
    shot(0,'72% 9%',[1.17,1.07],[.6,-.8],[-.2,-.5],'right',1.30,{occluderOpacity:.07,lightOpacity:.42}),
    shot(4,'66% 91%',[1.02,1.14],[.8,.5],[-.4,.3],'none',1.31,{lightOpacity:.44,hazeOpacity:.58,foregroundOpacity:.7}),
    shot(5,'42% 14%',[1.15,1.05],[-.7,-.6],[.4,-.4],'left',1.30,{occluderOpacity:.07,lightOpacity:.43}),
    shot(8,'94% 89%',[1.06,1.16],[.6,.7],[-.4,.5],'bottom',1.29,{occluderOpacity:.07,lightOpacity:.44}),
    shot(9,'4% 19%',[1.18,1.09],[-.9,-.4],[.3,-.3],'doorway',1.31,{occluderOpacity:.06,lightOpacity:.41}),
    shot(10,'70% 7%',[1.11,1.02],[.5,-.8],[-.1,-.5],'rail',1.30,{occluderOpacity:.07,lightOpacity:.44}),
    shot(6,'63% 94%',[1.05,1.15],[.1,.8],[-.5,.5],'none',1.31,{lightOpacity:.42,hazeOpacity:.56,foregroundOpacity:.72,shadowOpacity:.69}),
  ]),
  'scene-05': withIdentity('scene-05', [
    shot(0,'82% 72%',[1.42,1.64],[1.1,-1.4],[.8,-.6],'left',1.17,{occluderOpacity:.13,lightOpacity:.68,hazeOpacity:.63}),
    shot(11,'17% 26%',[1.61,1.39],[-1.5,.9],[.7,-.3],'top-left',1.16,{occluderOpacity:.12,lightOpacity:.66,hazeOpacity:.62}),
    shot(4,'57% 82%',[1.35,1.57],[.2,1.5],[-.8,.7],'rail',1.18,{occluderOpacity:.14,lightOpacity:.67}),
    shot(6,'88% 42%',[1.66,1.44],[1.7,-.8],[.5,-.7],'right',1.18,{occluderOpacity:.12,lightOpacity:.64}),
    shot(7,'29% 63%',[1.46,1.68],[-1.2,1.2],[-.4,.6],'rail',1.2,{occluderOpacity:.14,lightOpacity:.62,hazeOpacity:.58}),
    shot(8,'69% 19%',[1.58,1.37],[.9,-1.5],[.8,-.4],'none',1.27,{lightOpacity:.5,hazeOpacity:.48,foregroundOpacity:.7,shadowOpacity:.7}),
    shot(12,'11% 48%',[1.37,1.55],[-1.6,.5],[.4,-.5],'left',1.17,{occluderOpacity:.13,lightOpacity:.67}),
    shot(10,'76% 58%',[1.65,1.43],[1.3,-1.1],[.6,-.5],'doorway',1.16,{occluderOpacity:.12,lightOpacity:.65}),
    shot(13,'43% 33%',[1.49,1.69],[-.3,-1.3],[.7,-.5],'bottom',1.18,{occluderOpacity:.14,lightOpacity:.66}),
    shot(9,'91% 68%',[1.34,1.59],[1.5,.8],[-.6,.5],'right',1.18,{occluderOpacity:.13,lightOpacity:.65}),
    shot(14,'24% 77%',[1.63,1.41],[-1.1,1.4],[-.7,.8],'rail',1.2,{occluderOpacity:.12,lightOpacity:.62}),
    shot(15,'61% 46%',[1.47,1.66],[.4,-1.2],[.3,-.6],'right',1.2,{occluderOpacity:.13,lightOpacity:.62,hazeOpacity:.58}),
  ]),
  'scene-06': withIdentity('scene-06', [
    shot(2,'51% 43%',[1.04,1.10],[.1,-.2],[0,-.1],'none',1.19,{lightOpacity:.46,hazeOpacity:.52,foregroundOpacity:.75,shadowOpacity:.7}),
    shot(1,'70% 15%',[1.15,1.05],[.2,-.4],[.1,-.3],'none',1.2,{lightOpacity:.44,hazeOpacity:.5,foregroundOpacity:.7,shadowOpacity:.68}),
    shot(8,'83% 27%',[1.08,1.17],[.3,-.4],[.2,-.3],'top-right',1.16,{occluderOpacity:.09,lightOpacity:.62}),
    shot(3,'36% 71%',[1.12,1.03],[-.2,.3],[-.2,.2],'top-right',1.15,{occluderOpacity:.1,lightOpacity:.64}),
    shot(4,'68% 58%',[1.05,1.14],[.2,.2],[-.1,.1],'none',1.16,{lightOpacity:.63,hazeOpacity:.58,foregroundOpacity:.8,shadowOpacity:.75}),
    shot(5,'12% 35%',[1.17,1.07],[-.5,-.1],[.1,-.2],'left',1.18,{occluderOpacity:.09,lightOpacity:.5,hazeOpacity:.54}),
    shot(7,'57% 79%',[1.03,1.12],[.1,.4],[-.3,.3],'left',1.17,{occluderOpacity:.09,lightOpacity:.62}),
    shot(6,'87% 49%',[1.14,1.04],[.4,-.1],[.1,-.1],'doorway',1.17,{occluderOpacity:.09,lightOpacity:.51,hazeOpacity:.52}),
    shot(11,'29% 21%',[1.07,1.16],[-.3,-.4],[.2,-.3],'top-left',1.16,{occluderOpacity:.09,lightOpacity:.62}),
    shot(10,'74% 72%',[1.11,1.02],[.3,.3],[-.2,.2],'none',1.26,{lightOpacity:.40,hazeOpacity:.46,foregroundOpacity:.68,shadowOpacity:.67}),
    shot(9,'43% 64%',[1.02,1.13],[-.1,.4],[-.3,.3],'none',1.21,{lightOpacity:.43,hazeOpacity:.48,foregroundOpacity:.7,shadowOpacity:.67}),
  ]),
  'scene-07': withIdentity('scene-07', [
    shot(11,'18% 46%',[1.24,1.39],[-.7,.9],[.3,-.5],'doorway',1.17,{occluderOpacity:.12,lightOpacity:.62}),
    shot(2,'78% 33%',[1.43,1.25],[1.0,-.9],[.7,-.4],'right',1.17,{occluderOpacity:.11,lightOpacity:.61}),
    shot(3,'52% 76%',[1.18,1.36],[.1,1.1],[-.6,.6],'bottom',1.18,{occluderOpacity:.13,lightOpacity:.62}),
    shot(4,'12% 61%',[1.51,1.28],[-1.1,.5],[.5,-.3],'left',1.18,{occluderOpacity:.11,lightOpacity:.6}),
    shot(5,'86% 55%',[1.29,1.47],[1.2,-.8],[.3,-.6],'rail',1.19,{occluderOpacity:.12,lightOpacity:.61}),
    shot(6,'35% 24%',[1.46,1.23],[-.6,-1.0],[.8,-.3],'doorway',1.18,{occluderOpacity:.1,lightOpacity:.6}),
    shot(7,'67% 69%',[1.22,1.41],[.6,1.0],[-.5,.7],'bottom',1.2,{occluderOpacity:.13,lightOpacity:.59}),
    shot(8,'25% 37%',[1.55,1.31],[-1.3,.6],[.6,-.5],'doorway',1.19,{occluderOpacity:.11,lightOpacity:.6}),
    shot(10,'74% 79%',[1.19,1.38],[.5,1.2],[-.7,.6],'rail',1.17,{occluderOpacity:.12,lightOpacity:.61}),
    shot(12,'42% 49%',[1.38,1.56],[-.2,-1.1],[.5,-.5],'top-right',1.19,{occluderOpacity:.1,lightOpacity:.6}),
    shot(9,'91% 27%',[1.50,1.27],[1.4,-.7],[.5,-.4],'right',1.18,{occluderOpacity:.11,lightOpacity:.6}),
    shot(13,'16% 72%',[1.25,1.45],[-.9,1.1],[-.5,.7],'left',1.2,{occluderOpacity:.12,lightOpacity:.59}),
    shot(14,'61% 18%',[1.48,1.22],[.3,-1.2],[.7,-.4],'top-left',1.19,{occluderOpacity:.1,lightOpacity:.59}),
  ]),
  'scene-08': withIdentity('scene-08', [
    shot(4,'22% 74%',[1.02,1.00],[-.4,.2],[-.1,.1],'none',1.22,{lightOpacity:.28,hazeOpacity:.45,foregroundOpacity:.7,shadowOpacity:.67}),
    shot(5,'77% 68%',[1.04,1.16],[.4,-.1],[.2,-.2],'rail',1.21,{occluderOpacity:.08,lightOpacity:.27,hazeOpacity:.44,foregroundOpacity:.72,shadowOpacity:.66}),
    shot(2,'48% 29%',[1.17,1.06],[.1,-.4],[.3,-.2],'top-left',1.22,{occluderOpacity:.07,lightOpacity:.25,hazeOpacity:.43,foregroundOpacity:.68,shadowOpacity:.65}),
    shot(3,'16% 48%',[1.09,1.18],[-.5,.3],[.1,-.2],'left',1.23,{occluderOpacity:.08,lightOpacity:.24,hazeOpacity:.42,foregroundOpacity:.7,shadowOpacity:.65}),
    shot(1,'86% 41%',[1.13,1.02],[.5,-.3],[.2,-.1],'top-right',1.23,{occluderOpacity:.08,lightOpacity:.24,hazeOpacity:.41,foregroundOpacity:.69,shadowOpacity:.64}),
    shot(10,'61% 81%',[1.02,1.14],[.2,.4],[-.3,.3],'bottom',1.22,{occluderOpacity:.08,lightOpacity:.26,hazeOpacity:.44,foregroundOpacity:.72,shadowOpacity:.66}),
    shot(6,'11% 35%',[1.16,1.05],[-.5,-.2],[.2,-.2],'none',1.21,{lightOpacity:.25,hazeOpacity:.42,foregroundOpacity:.68,shadowOpacity:.65}),
    shot(8,'73% 56%',[1.08,1.18],[.4,.3],[-.2,.2],'doorway',1.23,{occluderOpacity:.08,lightOpacity:.24,hazeOpacity:.41,foregroundOpacity:.7,shadowOpacity:.64}),
    shot(7,'35% 63%',[1.14,1.04],[-.2,.4],[-.2,.3],'rail',1.22,{occluderOpacity:.08,lightOpacity:.25,hazeOpacity:.43,foregroundOpacity:.71,shadowOpacity:.65}),
    shot(9,'89% 73%',[1.01,1.12],[.5,.2],[-.3,.2],'none',1.24,{lightOpacity:.23,hazeOpacity:.4,foregroundOpacity:.68,shadowOpacity:.63}),
  ]),
  'scene-09': withIdentity('scene-09', [
    shot(3,'16% 31%',[1.56,1.41],[-1.0,.5],[.6,-.3],'none',1.27,{lightOpacity:.34,hazeOpacity:.42,foregroundOpacity:.67,shadowOpacity:.66}),
    shot(0,'81% 72%',[1.42,1.60],[1.1,-.7],[-.5,.6],'rail',1.18,{occluderOpacity:.14,lightOpacity:.61}),
    shot(1,'39% 22%',[1.61,1.45],[-.4,-1.0],[.7,-.4],'top-left',1.19,{occluderOpacity:.12,lightOpacity:.6}),
    shot(4,'72% 49%',[1.46,1.63],[.8,-.9],[.3,-.6],'top-right',1.2,{occluderOpacity:.13,lightOpacity:.56}),
    shot(8,'24% 68%',[1.58,1.39],[-.9,1.1],[-.6,.7],'bottom',1.2,{occluderOpacity:.13,lightOpacity:.55}),
    shot(5,'94% 83%',[1.09,1.20],[.3,-.4],[.2,-.2],'none',1.23,{lightOpacity:.48,hazeOpacity:.5,foregroundOpacity:.75,shadowOpacity:.7}),
    shot(7,'13% 58%',[1.18,1.06],[-.5,.3],[-.1,.2],'top-right',1.22,{occluderOpacity:.09,lightOpacity:.5,hazeOpacity:.52}),
    shot(10,'85% 26%',[1.05,1.17],[.4,-.5],[.3,-.3],'right',1.23,{occluderOpacity:.09,lightOpacity:.47,hazeOpacity:.5}),
    shot(9,'47% 77%',[1.16,1.04],[-.1,.5],[-.3,.3],'bottom',1.24,{occluderOpacity:.09,lightOpacity:.46,hazeOpacity:.49}),
    shot(11,'91% 64%',[1.03,1.14],[.5,.2],[-.2,.2],'rail',1.25,{occluderOpacity:.08,lightOpacity:.44,hazeOpacity:.47,foregroundOpacity:.73,shadowOpacity:.68}),
  ]),
});

for (const sceneId of EPISODE1_IMAGE_SCENE_IDS) {
  if (IMAGE_FIRST_TAKES[sceneId]?.length !== EPISODE1_ACTUAL_BEAT_COUNTS[sceneId]) {
    throw new Error(`image-first shot map mismatch for ${sceneId}`);
  }
}

export function imageFirstTakeFor(sceneId, localBeatOrdinal = 1) {
  const takes = IMAGE_FIRST_TAKES[sceneId];
  if (!takes) throw new Error(`unmapped image-first scene: ${sceneId}`);
  const ordinal = Math.max(1, Math.floor(Number(localBeatOrdinal) || 1));
  const selected = takes[ordinal - 1];
  if (!selected) throw new Error(`unmapped image-first beat: ${sceneId}#${ordinal}`);
  return selected;
}
