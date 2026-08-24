const ENTITY_PATTERNS = [
  ['battery', /\bbatter(?:y|ies)\b|\bvoltage\b|\bcharge(?:r|d|s|ing)?\b/i, 'BATTERY'],
  ['phone', /\bphone\b|\bsmartphone\b|\bmobile\b/i, 'PHONE'],
  ['eye', /\beye\b|\beyelid\b|\btwitch/i, 'EYE'],
  ['wifi', /\bwi-?fi\b|\brouter\b|\bwireless\b/i, 'WI-FI'],
  ['wall', /\bwall\b|\bdoor\b|\bconcrete\b|\bbrick\b/i, 'WALL'],
  ['airplane', /\bairplane\b|\baircraft\b|\bplane\b|\bcabin\b/i, 'AIRPLANE'],
  ['ear', /\bear\b|\beardrum\b|\bhearing\b/i, 'EAR'],
  ['sun', /\bsun\b|\bsolar\b|\bflare\b|\bcme\b/i, 'SUN'],
  ['earth', /\bearth\b|\bmagnetosphere\b|\bionosphere\b/i, 'EARTH'],
  ['satellite', /\bsatellite\b|\borbit\b|\bgps\b/i, 'SATELLITE'],
  ['grid', /\bpower grid\b|\btransformer\b|\btransmission\b|\bpower line\b/i, 'GRID'],
  ['brain', /\bbrain\b|\bmemory\b|\bneuron\b|\bnervous system\b/i, 'BRAIN'],
  ['sleep', /\bsleep\b|\bcircadian\b|\bbedtime\b/i, 'SLEEP'],
  ['car', /\bcar\b|\bfuel gauge\b|\bvehicle\b/i, 'CAR'],
  ['metal', /\bmetal\b|\baluminum\b|\bsteel\b/i, 'METAL'],
  ['wood', /\bwood\b|\bwooden\b/i, 'WOOD'],
  ['microwave', /\bmicrowave\b|\bmesh\b/i, 'MICROWAVE'],
  ['signal', /\bsignal\b|\breading\b|\bcurrent\b|\belectric(?:al)?\b/i, 'SIGNAL'],
  ['software', /\bsoftware\b|\balgorithm\b|\bestimat(?:e|or|ing)\b|\bcalculate/i, 'SOFTWARE'],
  ['temperature', /\bcold\b|\bhot\b|\bheat\b|\btemperature\b/i, 'TEMPERATURE'],
];

const STOPWORDS = new Set('the a an and or but if then than to from into in on at of for with without your you it its this that these those is are was were be being been as by can could would should will just actually really directly even much more less some any one two three how why what when where while through'.split(/\s+/));

function cleanText(value) {
  return String(value || '').replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/\s+/g,' ').trim();
}

function firstEntity(text, excluded = new Set()) {
  for (const [key, pattern, label] of ENTITY_PATTERNS) {
    if (!excluded.has(key) && pattern.test(text)) return {key,label};
  }
  const tokens = cleanText(text).toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];
  const token = tokens.find((word)=>!STOPWORDS.has(word)) || 'system';
  return {key:'generic',label:token.toUpperCase().slice(0,18)};
}

function extractEntities(text) {
  const source = cleanText(text);
  const found = [];
  for (const [key, pattern, label] of ENTITY_PATTERNS) {
    const match = source.match(pattern);
    if (match && Number.isInteger(match.index)) found.push({key,label,index:match.index});
  }
  found.sort((a,b)=>a.index-b.index);
  const unique=[]; const seen=new Set();
  for (const item of found) { if (!seen.has(item.key)) { seen.add(item.key); unique.push({key:item.key,label:item.label}); } }
  if (!unique.length) unique.push(firstEntity(source));
  return unique;
}

function detectKind(text) {
  const t = cleanText(text).toLowerCase();
  if (/\b(isn't|is not|aren't|are not|doesn't|does not|not actually|instead|but rather|unlike|myth|wrong)\b/.test(t)) return 'contrast';
  if (/\b(measure|measures|measured|reading|sends?|convert|turns? into|estimate|calculat|signal path|travels?|flows?)\b/.test(t)) return 'process';
  if (/\b(inside|within|under the|beneath|component|layer|cross[- ]?section|cutaway)\b/.test(t)) return 'cutaway';
  if (/\b(because|causes?|makes?|means?|therefore|so that|which is why|that is why|leads? to|results? in)\b/.test(t)) return 'cause-effect';
  if (/\b(depends? on|network|connected|stacked|backup|service|system|systems|infrastructure)\b/.test(t)) return 'network';
  if (/\b(more than|less than|twice|half|percent|%|million|billion|thousand|tiny|huge|larger|smaller)\b/.test(t)) return 'scale';
  if (/\b(first|then|next|finally|before|after|later|sequence|stage)\b/.test(t)) return 'timeline';
  return 'object-focus';
}

function splitStages(text) {
  const raw = cleanText(text)
    .replace(/\b(and then|then)\b/gi, '|')
    .replace(/\b(and|but)\b/gi, '|')
    .split(/[|.;]/)
    .map((s)=>s.trim())
    .filter(Boolean);
  const stages = raw.slice(0,4).map((part)=>{
    const entities = extractEntities(part);
    const words = part.toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];
    const verb = words.find((w)=>/(measure|send|turn|estimate|convert|change|move|flow|heat|expand|bend|delay|protect|charge|recalibr)/.test(w));
    return {label:(verb || entities[0]?.label || 'STEP').toUpperCase().slice(0,20), entity:entities[0] || {key:'generic',label:'STEP'}};
  });
  while (stages.length < 3) stages.push({label:`STEP ${stages.length+1}`,entity:{key:'generic',label:`STEP ${stages.length+1}`}});
  return stages;
}

function objectiveFor(kind, subject, secondary, text) {
  switch (kind) {
    case 'contrast': return `Show the intuitive/wrong model beside the actual mechanism: ${subject.label} is interpreted through ${secondary.label}.`;
    case 'process': return `Show the signal or mechanism moving step-by-step from ${subject.label} toward ${secondary.label}.`;
    case 'cutaway': return `Reveal what is happening inside ${subject.label} instead of decorating the narration.`;
    case 'cause-effect': return `Make the causal chain visible: ${subject.label} changes, then ${secondary.label} responds.`;
    case 'network': return `Show ${subject.label} as part of a dependency network so failure propagation is obvious.`;
    case 'scale': return `Show the size or quantity relationship around ${subject.label} visually, not as headline text.`;
    case 'timeline': return `Show the order of events around ${subject.label} with a clear before-to-after progression.`;
    default: return `Make ${subject.label} the dominant object and visualize the specific action in: ${cleanText(text).slice(0,90)}.`;
  }
}

function cameraFor(kind, index) {
  const variants = {
    contrast:['locked split','slow lateral reveal'],
    process:['track with signal','push through stages'],
    cutaway:['slow push-in','section reveal'],
    'cause-effect':['follow the pulse','push from cause to effect'],
    network:['slow orbit','center-out reveal'],
    scale:['locked comparison','slow pull-back'],
    timeline:['left-to-right track','progressive push'],
    'object-focus':['slow macro push','subtle parallax'],
  };
  const list = variants[kind] || variants['object-focus'];
  return list[index % list.length];
}

function legacyVisualFor(shot) {
  const key = shot.subject?.key;
  if (key === 'brain') return 'brain';
  if (key === 'sleep') return 'sunmoon';
  if (['grid','satellite','earth','sun'].includes(key)) return 'grid';
  if (['phone','battery','software','signal'].includes(key)) return 'scale';
  if (shot.kind === 'contrast') return 'split';
  if (shot.kind === 'timeline') return 'timeline';
  if (shot.kind === 'network') return 'map';
  return 'grid';
}

export function planSemanticShot({text, sceneHeadline='', index=0}) {
  const source = cleanText(`${text} ${sceneHeadline}`);
  const entities = extractEntities(source);
  const subject = entities[0] || firstEntity(source);
  let secondary = entities.find((entity)=>entity.key !== subject.key);
  if (!secondary) secondary = firstEntity(sceneHeadline || text, new Set([subject.key]));
  const kind = detectKind(text);
  const shot = {
    version:'semantic-shot-v2',
    kind,
    subject,
    secondary,
    stages:kind === 'process' || kind === 'timeline' ? splitStages(text) : [],
    visualObjective:objectiveFor(kind,subject,secondary,text),
    composition:kind === 'contrast' ? 'two-state split with one dominant contradiction' : kind === 'network' ? 'central subject with radial dependencies' : kind === 'scale' ? 'side-by-side scale comparison' : kind === 'cutaway' ? 'single-object cutaway with internal layer' : kind === 'process' ? 'three-stage signal path' : kind === 'cause-effect' ? 'cause left, effect right, animated bridge' : kind === 'timeline' ? 'progressive sequence with 3-4 states' : 'single dominant object with negative space',
    camera:cameraFor(kind,index),
    semanticKey:`${kind}:${subject.key}:${secondary.key}`,
  };
  return {...shot, legacyVisual:legacyVisualFor(shot)};
}

const ALT_KIND = {
  'object-focus':['cutaway','cause-effect','process'],
  cutaway:['process','object-focus','cause-effect'],
  process:['cutaway','cause-effect','object-focus'],
  'cause-effect':['process','cutaway','object-focus'],
  contrast:['cause-effect','process','cutaway'],
  network:['process','cause-effect','object-focus'],
  scale:['contrast','object-focus','process'],
  timeline:['process','object-focus','cause-effect'],
};

export function improveShotSequence(shots) {
  const out = [];
  for (const original of shots || []) {
    let shot = {...original};
    const n = out.length;
    const previous = out[n-1];
    const previous2 = out[n-2];
    if (previous && previous2 && previous.kind === shot.kind && previous2.kind === shot.kind) {
      const options = ALT_KIND[shot.kind] || ALT_KIND['object-focus'];
      const replacement = options.find((candidate)=>candidate !== previous.kind) || 'object-focus';
      shot = {
        ...shot,
        kind:replacement,
        composition:replacement === 'cutaway' ? 'single-object cutaway with internal layer' : replacement === 'process' ? 'three-stage signal path' : replacement === 'cause-effect' ? 'cause left, effect right, animated bridge' : 'single dominant object with negative space',
        camera:cameraFor(replacement,n),
        semanticKey:`${replacement}:${shot.subject.key}:${shot.secondary.key}`,
        stages:replacement === 'process' && (!shot.stages || shot.stages.length < 3) ? [
          {label:shot.subject.label,entity:shot.subject},
          {label:'MECHANISM',entity:{key:'signal',label:'SIGNAL'}},
          {label:shot.secondary.label,entity:shot.secondary},
        ] : shot.stages,
      };
      shot.legacyVisual = legacyVisualFor(shot);
    }
    out.push(shot);
  }
  return out;
}

function longestRun(values) {
  let best=0, current=0, previous;
  for (const value of values) {
    if (value===previous) current += 1; else {current=1; previous=value;}
    best=Math.max(best,current);
  }
  return best;
}

export function scoreStoryboardQuality(beats) {
  const list = (beats || []).filter(Boolean);
  if (!list.length) return {score:0, semanticCoverage:0, kindVariety:0, genericRate:1, maxKindRun:0, pass:false};
  const shots = list.map((item)=>item.shot || item);
  const semanticCoverage = shots.filter((shot)=>shot?.subject?.key && shot?.visualObjective && shot?.composition).length / shots.length;
  const kindVariety = new Set(shots.map((shot)=>shot?.kind).filter(Boolean)).size / Math.min(shots.length,7);
  const genericRate = shots.filter((shot)=>shot?.subject?.key === 'generic').length / shots.length;
  const maxKindRun = longestRun(shots.map((shot)=>shot?.kind || 'missing'));
  const repetitionPenalty = Math.max(0,(maxKindRun-2)*0.09);
  const score = Math.max(0,Math.min(1,
    semanticCoverage*0.48 +
    Math.min(1,kindVariety*1.35)*0.34 +
    (1-genericRate)*0.18 -
    repetitionPenalty
  ));
  return {
    score:Number(score.toFixed(3)),
    semanticCoverage:Number(semanticCoverage.toFixed(3)),
    kindVariety:Number(kindVariety.toFixed(3)),
    genericRate:Number(genericRate.toFixed(3)),
    maxKindRun,
    pass:score >= 0.68 && semanticCoverage >= 0.9 && maxKindRun <= 3,
  };
}
