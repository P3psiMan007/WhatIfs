export function classifySolarStormVisual(beat={}) {
  const text=String(beat.text||'').toLowerCase();
  const heading=String(beat.sceneHeadline||'').toLowerCase();
  const t=`${text} ${heading}`;

  // Beat-level meaning always wins over broad section headings.
  if (/(gps|navigation|ionosphere|position|timing signal|precision systems)/.test(text)) return 'gps-ionosphere';
  if (/(phone does not|phone.*explode|car does not|laptop|not a magic pulse|not an emp|every electronic device)/.test(text)) return 'device-myth';
  if (/(mobile network|data center|water systems|card payments|warehouse|airlines|backup power|generators need fuel)/.test(text)) return 'dependency-stack';
  if (/(one city might|another might|rolling outages|satellite service can fail while fiber|map of disruption|regions lose grid capacity)/.test(text)) return 'outage-map';
  if (/(nasa|noaa|watch the sun|issues watches|warnings|operators can prepare|safe mode)/.test(text)) return 'monitoring';
  if (/(warning turns a surprise|engineering problem|what is protected|what is disconnected|backup capacity|how quickly operators react)/.test(text)) return 'warning-timeline';
  if (/(nature challenged|researchers|scientists|ceiling|measurement point|relationship kept increasing|more observations)/.test(text)) return 'research-graph';
  if (/(stress test|designed to bend|sky would stay quiet|most beautiful thing in the sky)/.test(text)) return 'aurora-grid-payoff';
  if (/(1859|carrington|telegraph|march 1989|hydro-qu[eé]bec|millions lost electricity)/.test(text)) return 'history-grid';
  if (/(changing magnetic field can induce|electric field|geoelectric|geomagnetically induced|long conductors|power lines become pathways|transformer operation|voltage-control|protective equipment)/.test(text)) return 'induction-circuit';
  if (/(power-grid|grid operator|transmission network|currents appearing in lines|grid capacity|transformer)/.test(text)) return 'grid-current';
  if (/(satellite|spacecraft|low earth orbit|atmospheric drag|starlink|orbit predictions|upper atmosphere heats|upper atmosphere.*expands)/.test(text)) return 'satellite-orbit';
  if (/(magnetic field|magnetosphere|magnetic shield|meets our magnetic|protect people on the surface|squeezes and shakes|couples with earth)/.test(text)) return 'magnetosphere-shield';
  if (/(flare.*speed of light|solar flare|electromagnetic radiation|sunlit side|high-frequency communication)/.test(text)) return 'flare-wave';
  if (/(coronal mass ejection|\bcme\b|cloud of magnetized|less than a day|coming up the driveway|fast, earth-directed)/.test(text)) return 'cme-wave';
  if (/(problem left the sun|eruption|sun.*earth)/.test(text)) return 'sun-earth';
  if (/(aurora|sky changes color|green and red|beautiful|people go outside|phones come up)/.test(text)) return 'aurora-city';

  // Section-level fallbacks only after the beat itself has no stronger cue.
  if (/(beautiful warning|aurora)/.test(heading)) return 'aurora-city';
  if (/(two different attacks|same eruption)/.test(heading)) return 'flare-cme-split';
  if (/(earth does not simply get hit)/.test(heading)) return 'magnetosphere-shield';
  if (/(satellites feel it first)/.test(heading)) return 'satellite-orbit';
  if (/(earth becomes part of the circuit)/.test(heading)) return 'induction-circuit';
  if (/(second-order failures)/.test(heading)) return 'dependency-stack';
  if (/(we are not helpless)/.test(heading)) return 'monitoring';
  if (/(new reason scientists)/.test(heading)) return 'research-graph';
  if (/(payoff)/.test(heading)) return 'aurora-grid-payoff';
  if (/(solar flare|coronal mass ejection|\bcme\b|sun.*earth|eruption)/.test(t)) return 'sun-earth';
  return 'sun-earth';
}
