const SHOT_KINDS=new Set(['contrast','process','cutaway','cause-effect','network','scale','timeline','object-focus']);
const ENTITY_SHAPES=new Set(['battery','phone','eye','wifi','wall','airplane','ear','sun','earth','satellite','grid','brain','sleep','car','metal','wood','microwave','signal','software','temperature']);

export function normalizeShotKind(kind){return SHOT_KINDS.has(kind)?kind:'object-focus';}
export function entityShapeForKey(key){return ENTITY_SHAPES.has(key)?key:'generic';}
export function semanticVisualType(shot={}){
  const kind=normalizeShotKind(shot.kind);
  const subject=shot?.subject?.key;
  if(subject==='brain')return 'brain';
  if(subject==='sleep')return 'sunmoon';
  if(kind==='contrast')return 'compare';
  if(kind==='network')return 'map';
  if(kind==='timeline')return 'timeline';
  if(kind==='scale')return 'stat';
  if(['process','cutaway','cause-effect'].includes(kind))return 'metaphor';
  return ['grid','satellite','earth','sun'].includes(subject)?'map':'metaphor';
}
