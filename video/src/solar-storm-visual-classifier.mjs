export function classifySolarStormVisual(beat={}) {
  const text=String(beat.text||'').toLowerCase();
  const heading=String(beat.sceneHeadline||'').toLowerCase();
  const t=`${text} ${heading}`;

  // Beat-level meaning always wins over a broad section heading. This prevents a whole
  // section from freezing on one illustration when the narration has already moved on.
  if (/(gps|navigation|ionosphere|position|timing)/.test(text)) return 'gps-ionosphere';
  if (/(phone does not|phone.*explode|car does not|laptop|not a magic pulse|not an emp)/.test(text)) return 'device-myth';
  if (/(mobile network|data center|water systems|card payments|warehouse|airlines|dependencies|internet is gone|thousands of systems)/.test(text)) return 'dependency-stack';
  if (/(nasa|noaa|watch the sun|warning|forecast|safe mode|operators can prepare)/.test(text)) return 'monitoring';
  if (/(nature challenged|researchers|scientists|ceiling|measurement point|relationship kept increasing)/.test(text)) return 'research-graph';
  if (/(payoff|stress test|designed to bend|sky would stay quiet)/.test(text)) return 'aurora-grid-payoff';
  if (/(transformer|power-grid|grid operator|transmission|geomagnetically induced|geoelectric|hydro-qu[eé]bec|telegraph|currents appearing in lines)/.test(text)) return 'grid-current';
  if (/(satellite|spacecraft|low earth orbit|drag|starlink)/.test(text)) return 'satellite-orbit';
  if (/(solar flare|coronal mass ejection|\bcme\b|eruption|problem left the sun|speed of light)/.test(text)) return 'sun-earth';
  if (/(aurora|sky changes color|green and red|beautiful|people go outside|phones come up)/.test(text)) return 'aurora-city';

  // Only use the section heading as a fallback once the beat itself has no stronger cue.
  if (/(aurora|beautiful warning|green and red)/.test(heading)) return 'aurora-city';
  if (/(transformer|power-grid|grid operator|transmission|geomagnetically induced|geoelectric|hydro-qu[eé]bec|telegraph)/.test(heading)) return 'grid-current';
  if (/(satellite|spacecraft|low earth orbit|drag|starlink)/.test(heading)) return 'satellite-orbit';
  if (/(solar flare|coronal mass ejection|\bcme\b|sun.*earth|eruption)/.test(t)) return 'sun-earth';
  return 'sun-earth';
}
