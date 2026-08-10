export function classifySolarStormVisual(beat={}) {
  const text=String(beat.text||'').toLowerCase();
  const heading=String(beat.sceneHeadline||'').toLowerCase();
  const t=`${text} ${heading}`;
  // Prefer beat-level concepts before broad section headings so mixed sections can change visual class.
  if (/(gps|navigation|ionosphere|position|timing)/.test(text)) return 'gps-ionosphere';
  if (/(phone does not|phone.*explode|car does not|laptop|not a magic pulse|not an emp)/.test(text)) return 'device-myth';
  if (/(mobile network|data center|water systems|card payments|warehouse|airlines|dependencies|internet is gone|thousands of systems)/.test(text)) return 'dependency-stack';
  if (/(nasa|noaa|watch the sun|warning|forecast|safe mode|operators can prepare)/.test(text)) return 'monitoring';
  if (/(nature challenged|researchers|scientists|ceiling|measurement point|relationship kept increasing)/.test(text)) return 'research-graph';
  if (/(payoff|stress test|designed to bend|sky would stay quiet)/.test(text)) return 'aurora-grid-payoff';
  if (/(aurora|sky changes color|beautiful warning|green and red)/.test(t)) return 'aurora-city';
  if (/(transformer|power-grid|grid operator|transmission|geomagnetically induced|geoelectric|hydro-qu[eé]bec|telegraph)/.test(t)) return 'grid-current';
  if (/(satellite|spacecraft|low earth orbit|drag|starlink)/.test(t)) return 'satellite-orbit';
  if (/(solar flare|coronal mass ejection|\bcme\b|sun.*earth|eruption)/.test(t)) return 'sun-earth';
  return 'sun-earth';
}
