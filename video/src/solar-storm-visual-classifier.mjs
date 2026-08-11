export function classifySolarStormVisual(beat={}) {
  const text=String(beat.text||'').toLowerCase();
  const heading=String(beat.sceneHeadline||'').toLowerCase();
  const t=`${text} ${heading}`;

  // The ending must visually pay off the opening instead of collapsing back into a generic GPS/grid diagram.
  if (/(payoff)/.test(heading)) {
    if (/(satellite teams|radio operators|navigation systems|grid operators|services|infrastructure)/.test(text)) return 'dependency-stack';
    if (/(not automatically end civilization|designed to bend|designed assuming|sky would stay quiet|stress test|beautiful thing in the sky|sky glowing|aurora)/.test(text)) return 'aurora-grid-payoff';
    return 'aurora-grid-payoff';
  }

  // Beat-level meaning wins over broad section headings.
  if (/(gps|navigation|ionosphere|position|timing signal|precision systems|signals can bend|signals can.*delay)/.test(text)) return 'gps-ionosphere';
  if (/(phone does not|phone.*explode|car does not|laptop|not a magic pulse|not an emp|every electronic device|unplugged phone)/.test(text)) return 'device-myth';
  if (/(mobile network|data center|water systems|card payments|warehouse|airlines|backup power|generators need fuel|dependencies|thousands of systems stacked)/.test(text)) return 'dependency-stack';
  if (/(one city might|another might|rolling outages|satellite service can fail while fiber|map of disruption|regions lose grid capacity|unevenness)/.test(text)) return 'outage-map';
  if (/(nasa|noaa|watch the sun|issues watches|warnings|operators can prepare|safe mode|forecast models)/.test(text)) return 'monitoring';
  if (/(warning turns a surprise|engineering problem|what is protected|what is disconnected|backup capacity|how quickly operators react|difference between.*disturbance.*disaster)/.test(text)) return 'warning-timeline';
  if (/(nature challenged|researchers|scientists|ceiling|measurement point|relationship kept increasing|more observations|apparent ceiling|less solid)/.test(text)) return 'research-graph';
  if (/(1859|carrington|telegraph|march 1989|hydro-qu[eé]bec|millions lost electricity)/.test(text)) return 'history-grid';
  if (/(transformer operation|heating|voltage-control|protective equipment)/.test(text)) return 'grid-current';
  if (/(changing magnetic field can induce|electric field|geoelectric|geomagnetically induced|long conductors|power lines become pathways|ground develops electric fields|part of the circuit)/.test(text)) return 'induction-circuit';
  if (/(power-grid|grid operator|transmission network|currents appearing in lines|grid capacity|transformer)/.test(text)) return 'grid-current';
  if (/(upper atmosphere heats|upper atmosphere.*expands|atmospheric drag|starlink|orbit predictions|low earth orbit)/.test(text)) return 'satellite-orbit';
  if (/(satellite|spacecraft|tracking and orientation|communication links can degrade|weather forecasting|earth observation)/.test(text)) return 'satellite-orbit';
  if (/(two cmes|similar speed|magnetic field they carry|connects with earth|ingredients line up badly)/.test(text)) return 'flare-cme-split';
  if (/(magnetic field|magnetosphere|magnetic shield|meets our magnetic|protect people on the surface|squeezes and shakes|couples with earth|energy moves into)/.test(text)) return 'magnetosphere-shield';
  if (/(flare.*speed of light|solar flare|electromagnetic radiation|sunlit side|high-frequency communication|first knock on the door)/.test(text)) return 'flare-wave';
  if (/(coronal mass ejection|\bcme\b|cloud of magnetized|less than a day|coming up the driveway|fast, earth-directed|cloud is slower)/.test(text)) return 'cme-wave';
  if (/(problem left the sun|eruption|sun.*earth|technologies that depend on the space around earth)/.test(text)) return 'sun-earth';
  if (/(aurora|sky changes color|green and red|beautiful|people go outside|phones come up|pretty lights)/.test(text)) return 'aurora-city';

  // Section fallbacks deliberately alternate conceptual families rather than repeat one diagram for an entire minute.
  if (/(beautiful warning|aurora)/.test(heading)) return 'aurora-city';
  if (/(two different attacks|same eruption)/.test(heading)) return 'flare-cme-split';
  if (/(earth does not simply get hit)/.test(heading)) return 'sun-earth';
  if (/(satellites feel it first)/.test(heading)) return 'satellite-orbit';
  if (/(earth becomes part of the circuit)/.test(heading)) return 'grid-current';
  if (/(second-order failures)/.test(heading)) return 'outage-map';
  if (/(we are not helpless)/.test(heading)) return 'warning-timeline';
  if (/(new reason scientists)/.test(heading)) return 'research-graph';
  if (/(solar flare|coronal mass ejection|\bcme\b|sun.*earth|eruption)/.test(t)) return 'sun-earth';
  return 'sun-earth';
}
