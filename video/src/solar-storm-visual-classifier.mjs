export function classifySolarStormVisual(beat={}) {
  const t=`${beat.text||''} ${beat.sceneHeadline||''}`.toLowerCase();
  if (/(aurora|sky changes color|beautiful warning|green and red)/.test(t)) return 'aurora-city';
  if (/(solar flare|coronal mass ejection|\bcme\b|sun.*earth|eruption)/.test(t)) return 'sun-earth';
  if (/(satellite|spacecraft|low earth orbit|drag|starlink)/.test(t)) return 'satellite-orbit';
  if (/(gps|navigation|ionosphere|position|timing)/.test(t)) return 'gps-ionosphere';
  if (/(transformer|power-grid|grid operator|transmission|geomagnetically induced|geoelectric|hydro-qu[eé]bec|telegraph)/.test(t)) return 'grid-current';
  if (/(phone does not|phone.*explode|car does not|laptop|not a magic pulse|not an emp)/.test(t)) return 'device-myth';
  if (/(mobile network|data center|water systems|card payments|warehouse|airlines|dependencies|internet is gone|thousands of systems)/.test(t)) return 'dependency-stack';
  if (/(nasa|noaa|watch the sun|warning|forecast|safe mode|operators can prepare)/.test(t)) return 'monitoring';
  if (/(nature challenged|researchers|scientists|ceiling|measurement point|relationship kept increasing)/.test(t)) return 'research-graph';
  if (/(payoff|stress test|designed to bend|sky would stay quiet)/.test(t)) return 'aurora-grid-payoff';
  return 'sun-earth';
}
