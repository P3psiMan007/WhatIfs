import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CLAMP, FILM, FilmFrame, useBreath, useShotExposure} from './grade.jsx';
import {
  Bokeh,
  CANVAS,
  DustField,
  Glow,
  Haze,
  LightShaft,
  Plane,
  SevenSegment,
  SkylineBand,
  Starfield,
  TrafficStreaks,
  buildSkyline,
  ease,
  easeInOut,
  mixColor,
} from './primitives.jsx';
import {scatter} from './rng.mjs';

const {W, H} = CANVAS;
const TYPE = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const useShot = (durationInFrames) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {
    frame,
    fps,
    t: frame / fps,
    progress: interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], CLAMP),
    exposure: useShotExposure(durationInFrames),
    breath: useBreath(),
  };
};

/* ------------------------------------------------------------------ *
 * 1. CLOCK MACRO - the last minute of the last night.
 * ------------------------------------------------------------------ */
export const ClockMacro = ({durationInFrames}) => {
  const {t, progress, exposure, breath} = useShot(durationInFrames);
  const zoom = (1.0 + progress * 0.085) * breath;
  const flipped = t >= 2.85;
  const flash = flipped ? interpolate(t, [2.85, 2.95, 3.3], [1.42, 1.08, 1], CLAMP) : 1;
  const colonOpacity = flipped ? 1 : 0.34 + 0.66 * (Math.floor(t * 2) % 2 === 0 ? 1 : 0);
  const readout = flipped ? '12:00' : '11:59';
  const digits = (opacity, extra) => (
    <g opacity={opacity} style={extra}>
      <SevenSegment value={readout} x={556} y={392} w={148} h={266} gap={38} thickness={31} colonOpacity={colonOpacity} />
    </g>
  );

  return (
    <FilmFrame exposure={exposure} vignette={0.9} grain={0.085} lift="rgba(24,42,78,0.09)">
      <AbsoluteFill style={{background: `radial-gradient(66% 54% at 52% 44%, #0b0f16 0%, ${FILM.black} 70%)`}} />
      <Bokeh seed={31} count={7} maxOpacity={0.15} area={{x: 40, y: 40, w: 1840, h: 560}} />

      {/* The clock is not axis-aligned to the frame. A couple of degrees is
          the difference between a photograph and a diagram. */}
      <Plane zoom={zoom} rotate={-2.1}>
        <div
          style={{
            position: 'absolute',
            left: 384,
            top: 286,
            width: 1160,
            height: 486,
            borderRadius: 24,
            background: 'linear-gradient(168deg, #0b0e15 0%, #06080d 62%, #04060a 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -34px 70px rgba(0,0,0,0.6)',
          }}
        />
        <Glow x={962} y={524} radius={470} color="255,150,60" intensity={0.13 * flash} />

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          {digits(0.5 * flash, {filter: 'blur(26px)'})}
          {digits(0.6 * flash, {filter: 'blur(8px)'})}
          {digits(flash)}
        </svg>

        {/* Reflection in the lacquered surface below the clock. */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translateY(1128px) scaleY(-0.42)',
            transformOrigin: '50% 50%',
            opacity: 0.16 * flash,
            filter: 'blur(9px)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 78%)',
            maskImage: 'linear-gradient(to bottom, #000 0%, transparent 78%)',
          }}
        >
          {digits(1)}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: 384,
            top: 286,
            width: 1160,
            height: 486,
            borderRadius: 24,
            background: 'linear-gradient(112deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 74%, rgba(255,255,255,0.03) 100%)',
          }}
        />
      </Plane>

      <DustField seed={9} count={38} speed={7} color="rgba(255,214,168,0.42)" area={{x: 0, y: 0, w: W, h: H}} />

      {/* Out-of-focus foreground: the near edge of the nightstand. */}
      <div
        style={{
          position: 'absolute',
          left: -60,
          right: -60,
          bottom: -20,
          height: 268,
          background: 'linear-gradient(180deg, rgba(4,6,11,0) 0%, rgba(4,6,11,0.86) 42%, #04060b 100%)',
          filter: 'blur(15px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -120,
          bottom: -110,
          width: 620,
          height: 340,
          borderRadius: '48% 52% 60% 40%',
          background: '#03050a',
          filter: 'blur(26px)',
          opacity: 0.95,
        }}
      />
    </FilmFrame>
  );
};

/* ------------------------------------------------------------------ *
 * Shared bedroom geometry. Shots 2 and 4 are the same camera on the same
 * room; only the light and the bed change. That is the match cut.
 * ------------------------------------------------------------------ */
const BEDROOM_VALUES = {
  night: {
    wallTop: '#101a2b', wallBottom: '#0a1120', floorTop: '#080d17', floorBottom: '#04070c',
    skirting: '#131f33', base: '#04070d', mattress: '#0c1424', duvet: '#111c30',
    pillow: '#18263e', stand: '#070c16', standTop: '#101a2b',
    rim: 'rgba(168,198,240,0.6)', beam: 'rgba(168,198,240,0.24)',
    pool: 'rgba(150,186,236,0.20)', ambient: 'rgba(120,160,220,0.15)',
  },
  morning: {
    wallTop: '#2a211a', wallBottom: '#191310', floorTop: '#150f0b', floorBottom: '#080605',
    skirting: '#33261d', base: '#0a0806', mattress: '#1c150f', duvet: '#261c14',
    pillow: '#32251a', stand: '#0d0a08', standTop: '#241a13',
    rim: 'rgba(255,216,162,0.72)', beam: 'rgba(255,198,126,0.30)',
    pool: 'rgba(255,206,142,0.32)', ambient: 'rgba(255,196,124,0.22)',
  },
};

// One continuous contour: head, neck, shoulder, back, hip, thigh, calf, feet.
const SLEEPER_CONTOUR =
  'M180 730v-14q24-18 60-24q6-72 56-72q24-2 54 74q26-26 62-16q70 14 118 20' +
  'q58-26 104-10q66 16 112 28q40-14 74-4q40 6 66 18';

const BedroomRoom = ({mode, pan, zoom, skyProgress = 0}) => {
  const night = mode === 'night';
  const V = BEDROOM_VALUES[night ? 'night' : 'morning'];
  const skyTop = night ? '#0a1930' : mixColor('#20406e', '#8fb6da', skyProgress);
  const skyBottom = night ? '#16294a' : mixColor('#7d7f88', '#f6d9ab', skyProgress);
  const beamColor = V.beam;
  const rim = V.rim;

  return (
    <>
      {/* Back wall + floor, with a real value break and a skirting board so the
          two planes read as two planes instead of one wash. */}
      <Plane depth={0.35} pan={pan} zoom={zoom}>
        <AbsoluteFill style={{background: `linear-gradient(180deg, ${V.wallTop} 0%, ${V.wallBottom} 100%)`}} />
        <div style={{position: 'absolute', left: -220, right: -220, top: 800, height: 14, background: V.skirting, opacity: 0.9}} />
        <div
          style={{
            position: 'absolute',
            left: -220,
            right: -220,
            top: 814,
            bottom: -120,
            background: `linear-gradient(180deg, ${V.floorTop} 0%, ${V.floorBottom} 100%)`,
          }}
        />
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(58% 62% at 76% 36%, ${V.ambient}, transparent 70%)`}} />
      </Plane>

      {/* Window: sky, rooftops, frame */}
      <Plane depth={0.35} pan={pan} zoom={zoom}>
        <div
          style={{
            position: 'absolute',
            left: 1146,
            top: 156,
            width: 560,
            height: 536,
            background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} 100%)`,
            overflow: 'hidden',
          }}
        >
          {night ? (
            <div style={{position: 'absolute', inset: 0, transform: 'translate(-1146px,-156px)'}}>
              <Starfield seed={41} count={90} area={{x: 1146, y: 156, w: 560, h: 340}} opacity={0.85} />
            </div>
          ) : null}
          <svg width={560} height={536} viewBox="0 0 560 536" style={{position: 'absolute', inset: 0}}>
            <path
              d="M0 452h58v-38h34v-26h30v64h44v-58h20v-34h38v92h60v-46h30v-40l34-22v108h48v-72h44v72h50v-58h32v58h38v84H0Z"
              fill={night ? '#050910' : '#241f1c'}
              opacity={night ? 0.96 : 0.82}
            />
          </svg>
          {night ? (
            <>
              {/* Soft halo built from overlapping falloffs, so the moon has no
                  hard gradient ring around it. */}
              <div style={{position: 'absolute', left: 254, top: -44, width: 298, height: 298, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,220,255,0.20) 0%, rgba(198,220,255,0.05) 42%, transparent 68%)', filter: 'blur(26px)'}} />
              <div style={{position: 'absolute', left: 320, top: 22, width: 166, height: 166, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,238,255,0.34) 0%, transparent 62%)', filter: 'blur(12px)'}} />
              <div style={{position: 'absolute', left: 373, top: 75, width: 60, height: 60, borderRadius: '50%', background: '#eef4ff', filter: 'blur(1.5px)', opacity: 0.95}} />
            </>
          ) : null}
        </div>
        {/* Frame + mullions, drawn over the glass */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <g fill={night ? '#05080e' : '#0d0b0a'}>
            <rect x={1130} y={140} width={592} height={18} />
            <rect x={1130} y={676} width={592} height={20} />
            <rect x={1130} y={140} width={18} height={556} />
            <rect x={1704} y={140} width={18} height={556} />
            <rect x={1414} y={158} width={13} height={518} />
            <rect x={1148} y={414} width={574} height={13} />
          </g>
        </svg>
      </Plane>

      {/* Volumetric beam from window to floor */}
      <LightShaft
        points="1150,170 1706,170 1300,1080 200,1080"
        color={beamColor}
        blur={night ? 30 : 40}
        opacity={night ? 0.62 : 0.9}
      />
      {!night ? (
        <LightShaft points="1230,180 1560,180 980,1080 380,1080" color="rgba(255,226,178,0.28)" blur={54} opacity={0.85} />
      ) : null}

      {/* Floor pool where the beam lands - under the furniture, so the bed
          sits in the light rather than floating over it. */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 830,
          width: 1300,
          height: 250,
          background: `radial-gradient(56% 64% at 62% 26%, ${V.pool}, transparent 74%)`,
          filter: 'blur(18px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Bed. Drawn as stacked faces at different values: base, mattress side,
          duvet, pillow. Each edge that faces the window carries a rim light. */}
      <Plane depth={0.62} pan={pan} zoom={zoom}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <defs>
            {/* The window is off to the right, so edges facing it catch light
                and edges facing away do not. A uniform outline would read as a
                sticker; this reads as a lit edge. */}
            {/* userSpaceOnUse so every object in the room shares ONE light
                direction. Per-object gradients would give each shape its own
                little ramp, which is what makes art look like stickers. */}
            <linearGradient id={`rim-${mode}`} gradientUnits="userSpaceOnUse" x1="90" y1="0" x2="1240" y2="0">
              <stop offset="0%" stopColor={rim} stopOpacity={0.04} />
              <stop offset="38%" stopColor={rim} stopOpacity={0.26} />
              <stop offset="74%" stopColor={rim} stopOpacity={0.7} />
              <stop offset="100%" stopColor={rim} stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <ellipse cx={520} cy={912} rx={470} ry={40} fill="#000" opacity={night ? 0.5 : 0.42} />
          <rect x={84} y={512} width={78} height={396} rx={7} fill={V.base} />
          <rect x={84} y={512} width={78} height={9} rx={4} fill={`url(#rim-${mode})`} opacity={0.6} />
          <rect x={148} y={786} width={772} height={116} fill={V.base} />
          <rect x={148} y={730} width={772} height={58} fill={V.mattress} />
          <rect x={148} y={730} width={772} height={4} fill={`url(#rim-${mode})`} opacity={0.75} />

          {night ? (
            <>
              {/* Pillow, sitting behind the sleeper. */}
              <path d="M166 730c0-32 26-54 72-54h74c38 0 58 20 58 44l-4 10H166Z" fill={V.pillow} />
              <path d="M166 730c0-32 26-54 72-54h74c38 0 58 20 58 44" fill="none" stroke={`url(#rim-${mode})`} strokeWidth={2.2} />
              {/* One sleeping form, drawn as a single continuous contour:
                  head, neck, shoulder, back, hip, thigh, feet. No limbs and no
                  face - a silhouette with no anatomy cannot break anatomy. */}
              <path d={`${SLEEPER_CONTOUR}H180Z`} fill={V.duvet} />
              <path d={SLEEPER_CONTOUR} fill="none" stroke={`url(#rim-${mode})`} strokeWidth={2.8} />
              {/* fold shading in the duvet, not on the bed frame */}
              <g stroke="#000" strokeWidth={9} opacity={0.16} strokeLinecap="round">
                <path d="M470 700v26M628 704v22M770 716v14" />
              </g>
            </>
          ) : (
            <>
              {/* Made bed: flat, turned down, nobody in it. */}
              <rect x={176} y={694} width={744} height={40} rx={6} fill={V.duvet} />
              <rect x={176} y={694} width={744} height={4} fill={`url(#rim-${mode})`} opacity={0.9} />
              <path d="M176 700h744v-16H176Z" fill={V.pillow} opacity={0.55} />
              <path d="M182 690c0-28 24-48 70-48h84c38 0 60 18 60 44l-4 8H182Z" fill={V.pillow} />
              <path d="M182 690c0-28 24-48 70-48h84c38 0 60 18 60 44" fill="none" stroke={`url(#rim-${mode})`} strokeWidth={2.4} />
              <g stroke="#000" strokeWidth={6} opacity={0.16}>
                <path d="M470 736v48M660 736v48" />
              </g>
            </>
          )}
        </svg>
      </Plane>

      {/* Nightstand: a solid box with a lit top face, carrying the clock from
          the opening shot. */}
      <Plane depth={0.62} pan={pan} zoom={zoom}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <ellipse cx={1036} cy={906} rx={118} ry={20} fill="#000" opacity={night ? 0.5 : 0.44} />
          <rect x={954} y={772} width={164} height={132} fill={V.stand} />
          <rect x={946} y={760} width={180} height={13} rx={3} fill={V.standTop} />
          <rect x={946} y={760} width={180} height={3} fill={rim} opacity={0.4} />
          <rect x={972} y={824} width={128} height={2.5} fill={rim} opacity={0.16} />
          <rect x={988} y={722} width={96} height={38} rx={6} fill={night ? '#0a0f18' : '#171210'} />
          <rect x={988} y={722} width={96} height={3} fill={rim} opacity={0.3} />
          {night ? <rect x={1003} y={734} width={66} height={14} rx={3} fill={FILM.amber} opacity={0.9} /> : null}
        </svg>
        {night ? <Glow x={1036} y={741} radius={124} color="255,159,69" intensity={0.36} /> : null}
      </Plane>
    </>
  );
};

/* 2. BEDROOM NIGHT ---------------------------------------------------- */
export const BedroomNight = ({durationInFrames}) => {
  const {progress, exposure, breath} = useShot(durationInFrames);
  const pan = interpolate(progress, [0, 1], [16, -30], CLAMP);
  return (
    <FilmFrame exposure={exposure} vignette={0.8} grain={0.075} lift="rgba(26,50,96,0.14)">
      <AbsoluteFill style={{background: FILM.nightDeep}} />
      <BedroomRoom mode="night" pan={pan} zoom={(1.03 + progress * 0.028) * breath} />
      <DustField seed={17} count={30} speed={6} color="rgba(190,214,255,0.34)" area={{x: 420, y: 180, w: 1200, h: 860}} />
      <Haze color="rgba(70,104,164,0.16)" top="52%" />
    </FilmFrame>
  );
};

/* 3. WINDOW DAWN ------------------------------------------------------ */
export const WindowDawn = ({durationInFrames}) => {
  const {progress, exposure, breath} = useShot(durationInFrames);
  const zoom = (1.0 + progress * 0.15) * breath;
  const dawn = easeInOut(progress, 0.08, 0.92);
  // Four stops interpolated independently. A dawn is not one colour getting
  // lighter - it is a dark blue that stays dark at the top while the band just
  // above the horizon goes hot. Collapsing that into one mix gives mud.
  const skyTop = mixColor('#050c1c', '#14315e', dawn);
  const skyUpper = mixColor('#0a1c38', '#2f5480', dawn);
  const skyMid = mixColor('#102a4c', '#b4643a', dawn);
  const skyLow = mixColor('#173456', '#ffc079', dawn);

  return (
    <FilmFrame exposure={exposure} vignette={0.78} grain={0.07} lift="rgba(30,56,100,0.10)">
      <AbsoluteFill style={{background: FILM.nightDeep}} />
      <Plane zoom={zoom}>
        {/* Glass */}
        <div
          style={{
            position: 'absolute',
            left: 244,
            top: 74,
            width: 1432,
            height: 916,
            background: `linear-gradient(180deg, ${skyTop} 0%, ${skyUpper} 34%, ${skyMid} 66%, ${skyLow} 100%)`,
            overflow: 'hidden',
          }}
        >
          <div style={{position: 'absolute', inset: 0, transform: 'translate(-244px,-74px)', opacity: Math.max(0, 1 - dawn * 1.25)}}>
            <Starfield seed={73} count={140} area={{x: 244, y: 74, w: 1432, h: 520}} />
          </div>
          {/* Horizon bloom: a tight hot band sitting on the rooftops, not a
              soft blob over the middle of the glass. */}
          <div
            style={{
              position: 'absolute',
              left: 240,
              top: 626,
              width: 960,
              height: 300,
              background: `radial-gradient(58% 46% at 50% 78%, rgba(255,206,138,${0.05 + dawn * 0.62}) 0%, rgba(255,176,96,${dawn * 0.22}) 44%, transparent 72%)`,
              filter: 'blur(22px)',
              mixBlendMode: 'screen',
            }}
          />
          <svg width={1432} height={916} viewBox="0 0 1432 916" style={{position: 'absolute', inset: 0}}>
            {/* Rooftops stay near-black throughout: against a brightening sky
                a silhouette is the only thing holding the frame together. */}
            <path
              d="M0 742h96v-58h72v58h104v-96h84v96h132v-72h70v72h118v-118h86v118h150v-64h74v64h152v-92h84v92h110v174H0Z"
              fill={mixColor('#04070e', '#0e0c12', dawn)}
            />
          </svg>
        </div>
        {/* Window frame */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <g fill="#05070d">
            <rect x={216} y={44} width={1488} height={34} />
            <rect x={216} y={972} width={1488} height={64} />
            <rect x={216} y={44} width={34} height={992} />
            <rect x={1670} y={44} width={34} height={992} />
            <rect x={946} y={78} width={26} height={894} />
            <rect x={250} y={498} width={1420} height={24} />
          </g>
        </svg>
      </Plane>

      {/* Light entering the room, thrown from the lower half of the glass
          where the sun actually is. Kept weak so it does not flatten the sky. */}
      <LightShaft
        points="420,560 1500,560 1900,1080 20,1080"
        color={`rgba(255,200,138,${0.03 + dawn * 0.17})`}
        blur={70}
      />
      <DustField seed={53} count={34} speed={8} color={`rgba(255,226,186,${0.18 + dawn * 0.36})`} />
    </FilmFrame>
  );
};

/* 4. BEDROOM MORNING - identical framing, different world -------------- */
export const BedroomMorning = ({durationInFrames}) => {
  const {progress, exposure, breath} = useShot(durationInFrames);
  return (
    <FilmFrame exposure={exposure} vignette={0.74} grain={0.07} lift="rgba(70,54,38,0.10)" warm="rgba(255,170,80,0.08)">
      <AbsoluteFill style={{background: '#0b0908'}} />
      <BedroomRoom mode="morning" pan={16} zoom={(1.03 + progress * 0.05) * breath} skyProgress={0.55 + progress * 0.4} />
      <DustField seed={17} count={54} speed={7} color="rgba(255,222,176,0.6)" area={{x: 380, y: 140, w: 1240, h: 920}} />
      <Haze color="rgba(190,140,80,0.12)" top="54%" />
    </FilmFrame>
  );
};

/* 5. CLOCK DISSOLVE ---------------------------------------------------
 * Deliberately the same macro framing as shot 1, so the audience recognises
 * the object instantly. Same clock, morning light, display dead - and then it
 * comes apart. The rhyme does the explaining; no caption has to.
 * ------------------------------------------------------------------ */
export const ClockDissolve = ({durationInFrames}) => {
  const {t, progress, exposure, breath} = useShot(durationInFrames);
  const zoom = (1.06 + progress * 0.06) * breath;
  // The erase front sweeps down the frame. Everything below it is still solid;
  // everything above it has already come apart.
  const p = easeInOut(t, 0.6, 2.62);
  const frontY = 250 + 560 * p;
  const maskLow = (1080 - frontY) / 10.8;

  const particles = scatter(404, 260, (random) => ({
    x: random(),
    y: random(),
    r: random(),
    sway: random(),
  })).map((particle, index) => {
    // A particle is released as the front passes the height it sat at.
    const home = 286 + particle.y * 486;
    const released = (frontY - home) / 260;
    if (released <= 0 || released > 1) return null;
    const x = 400 + particle.x * 1136;
    return (
      <circle
        key={index}
        cx={x + Math.sin(t * 1.5 + index * 0.7) * (6 + particle.sway * 34) * released}
        cy={home - released * (90 + particle.r * 240)}
        r={0.9 + particle.r * 2.6}
        fill={index % 5 === 0 ? 'rgba(255,190,110,0.95)' : 'rgba(255,228,186,0.92)'}
        opacity={Math.sin(released * Math.PI) * 0.95}
      />
    );
  });

  return (
    <FilmFrame exposure={exposure} vignette={0.86} grain={0.08} lift="rgba(62,48,32,0.10)" warm="rgba(255,170,80,0.08)">
      <AbsoluteFill style={{background: 'radial-gradient(72% 60% at 62% 44%, #2a1f18 0%, #120d0a 60%, #070505 100%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 900,
          top: -160,
          width: 900,
          height: 1400,
          background: 'linear-gradient(108deg, rgba(255,206,146,0.30), transparent 60%)',
          filter: 'blur(34px)',
          mixBlendMode: 'screen',
          transform: 'rotate(-9deg)',
        }}
      />
      <Bokeh seed={67} count={6} maxOpacity={0.13} color="255,206,150" area={{x: 60, y: 60, w: 1800, h: 560}} />

      <Plane zoom={zoom} rotate={-2.1}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            WebkitMaskImage: `linear-gradient(to top, #000 ${maskLow}%, rgba(0,0,0,0.4) ${maskLow + 6}%, transparent ${maskLow + 14}%)`,
            maskImage: `linear-gradient(to top, #000 ${maskLow}%, rgba(0,0,0,0.4) ${maskLow + 6}%, transparent ${maskLow + 14}%)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 384,
              top: 286,
              width: 1160,
              height: 486,
              borderRadius: 24,
              background: 'linear-gradient(168deg, #14100d 0%, #0a0807 60%, #060505 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,222,176,0.09), inset 0 -34px 70px rgba(0,0,0,0.55)',
            }}
          />
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
            {/* The display is dead: only the unlit segments remain. */}
            <SevenSegment
              value="00:00"
              x={556}
              y={392}
              w={148}
              h={266}
              gap={38}
              thickness={31}
              color="rgba(255,196,140,0.055)"
              ghost="rgba(255,196,140,0.055)"
              colonOpacity={1}
            />
          </svg>
        </div>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, filter: 'blur(0.4px)'}}>
          {particles}
        </svg>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, filter: 'blur(9px)', mixBlendMode: 'screen', opacity: 0.7}}>
          {particles}
        </svg>
      </Plane>

      <DustField seed={61} count={44} speed={9} color="rgba(255,224,180,0.5)" area={{x: 200, y: 40, w: 1520, h: 1040}} />

      <div
        style={{
          position: 'absolute',
          left: -60,
          right: -60,
          bottom: -20,
          height: 240,
          background: 'linear-gradient(180deg, rgba(5,4,4,0) 0%, rgba(5,4,4,0.82) 44%, #050404 100%)',
          filter: 'blur(14px)',
        }}
      />
    </FilmFrame>
  );
};

/* Shared city. Reused across shots 6, 7 and 9 so the skyline is the same
 * city each time rather than three unrelated backdrops. */
const FAR = buildSkyline({seed: 91, count: 26, baseY: 812, minH: 120, maxH: 300, minW: 62, maxW: 150, spread: {from: -120, to: 2040}});
const MID = buildSkyline({seed: 137, count: 19, baseY: 902, minH: 210, maxH: 470, minW: 96, maxW: 216, spread: {from: -160, to: 2080}});

/* 6. CITY NIGHT -------------------------------------------------------- */
export const CityNight = ({durationInFrames}) => {
  const {progress, exposure, breath} = useShot(durationInFrames);
  const pan = interpolate(progress, [0, 1], [-34, 22], CLAMP);
  const zoom = (1.04 + progress * 0.03) * breath;

  return (
    <FilmFrame exposure={exposure} vignette={0.78} grain={0.075} lift="rgba(24,46,92,0.14)">
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #04070e 0%, #0a1426 52%, #14243c 100%)'}} />
      <Starfield seed={7} count={110} area={{x: 0, y: 0, w: W, h: 520}} opacity={0.55} />

      <Plane depth={0.28} pan={pan} zoom={zoom} blur={3}>
        <SkylineBand buildings={FAR} fill="#0a1120" windowColor="255,196,132" windowOpacity={0.42} litRatio={0.36} />
      </Plane>
      <Haze color="rgba(88,124,186,0.24)" top="34%" />

      <Plane depth={0.72} pan={pan} zoom={zoom}>
        <SkylineBand buildings={MID} fill="#050810" windowColor="255,190,124" windowOpacity={0.9} litRatio={0.46} />
      </Plane>

      {/* Sodium haze at street level */}
      <div
        style={{
          position: 'absolute',
          left: -100,
          right: -100,
          top: 812,
          height: 300,
          background: 'linear-gradient(180deg, rgba(255,162,84,0.16) 0%, rgba(255,140,60,0.05) 46%, transparent 100%)',
          filter: 'blur(24px)',
          mixBlendMode: 'screen',
        }}
      />
      <TrafficStreaks seed={23} count={18} y={926} spread={150} />

      {/* Street level: a dark occluding band so the towers stand in a city
          rather than on a shelf. */}
      <div style={{position: 'absolute', left: -80, right: -80, top: 968, bottom: -60, background: 'linear-gradient(180deg, #04070e 0%, #020408 100%)'}} />

      {/* Near rooftop, framing the right side. Soft edged - a hard rectangle
          reads as a rendering fault, not as foreground. */}
      <Plane depth={1.25} pan={pan} zoom={zoom}>
        <div
          style={{
            position: 'absolute',
            right: -80,
            top: 300,
            width: 330,
            bottom: -80,
            background: 'linear-gradient(90deg, rgba(3,5,10,0) 0%, rgba(3,5,10,0.86) 34%, #03050a 100%)',
            filter: 'blur(11px)',
          }}
        />
      </Plane>
    </FilmFrame>
  );
};

/* 7. CITY SWEEP - day arrives, nothing switches off -------------------- */
export const CitySweep = ({durationInFrames}) => {
  const {progress, exposure, breath} = useShot(durationInFrames);
  const zoom = (1.08 - progress * 0.06) * breath;
  const sweep = easeInOut(progress, 0.06, 0.86) * 132 - 16;
  const dayMask = `linear-gradient(96deg, #000 ${sweep - 16}%, rgba(0,0,0,0.5) ${sweep - 4}%, transparent ${sweep + 9}%)`;

  const City = ({day}) => (
    <>
      <AbsoluteFill
        style={{
          background: day
            ? 'linear-gradient(180deg, #35538a 0%, #a3752f 62%, #f0b268 100%)'
            : 'linear-gradient(180deg, #04070e 0%, #0a1426 52%, #14243c 100%)',
        }}
      />
      {!day ? <Starfield seed={7} count={90} area={{x: 0, y: 0, w: W, h: 480}} opacity={0.5} /> : null}
      {day ? (
        <div style={{position: 'absolute', left: 300, top: 560, width: 1320, height: 620, background: 'radial-gradient(46% 46% at 50% 50%, rgba(255,206,140,0.5), transparent 70%)', filter: 'blur(40px)', mixBlendMode: 'screen'}} />
      ) : null}
      <Plane depth={0.28} zoom={1} blur={3}>
        <SkylineBand
          buildings={FAR}
          fill={day ? '#6a5a55' : '#0a1120'}
          windowColor={day ? '255,236,206' : '255,196,132'}
          windowOpacity={day ? 0.34 : 0.42}
          litRatio={0.36}
          flicker={false}
        />
      </Plane>
      <Haze color={day ? 'rgba(236,186,128,0.42)' : 'rgba(88,124,186,0.24)'} top="34%" />
      <Plane depth={0.72} zoom={1}>
        <SkylineBand
          buildings={MID}
          fill={day ? '#2a201c' : '#050810'}
          windowColor={day ? '255,226,180' : '255,190,124'}
          windowOpacity={day ? 0.62 : 0.9}
          litRatio={0.46}
          flicker={false}
          roofEdge={day ? 'rgba(255,214,160,0.5)' : null}
        />
      </Plane>
      <div
        style={{
          position: 'absolute',
          left: -100,
          right: -100,
          top: 812,
          height: 300,
          background: day
            ? 'linear-gradient(180deg, rgba(255,196,120,0.3) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(255,162,84,0.16) 0%, transparent 100%)',
          filter: 'blur(24px)',
          mixBlendMode: 'screen',
        }}
      />
    </>
  );

  return (
    <FilmFrame exposure={exposure} vignette={0.76} grain={0.072} lift="rgba(40,62,104,0.10)">
      <Plane zoom={zoom}>
        <City day={false} />
        <AbsoluteFill style={{WebkitMaskImage: dayMask, maskImage: dayMask}}>
          <City day />
        </AbsoluteFill>
        {/* The terminator itself: a soft light edge, not a hard wipe line */}
        <div
          style={{
            position: 'absolute',
            left: `${sweep - 12}%`,
            top: -80,
            width: 260,
            bottom: -80,
            background: 'linear-gradient(90deg, rgba(255,222,176,0) 0%, rgba(255,222,176,0.24) 52%, rgba(255,222,176,0) 100%)',
            filter: 'blur(26px)',
            mixBlendMode: 'screen',
            transform: 'skewX(-6deg)',
          }}
        />
      </Plane>
      <TrafficStreaks seed={29} count={20} y={938} spread={140} color="255,196,132" />
    </FilmFrame>
  );
};

/* 8. HOURS GRAPHIC - the one number worth typography ------------------- */
export const HoursGraphic = ({durationInFrames}) => {
  const {t, exposure} = useShot(durationInFrames);
  const cx = 960;
  const cy = 356;
  const r = 152;
  const circumference = 2 * Math.PI * r;

  const ringDraw = ease(t, 0.06, 0.95);
  const ticks = ease(t, 0.55, 1.3);
  const arcDraw = ease(t, 0.9, 1.8);
  // The amber third does not vanish - it travels down and becomes the rule
  // under the number. Same element, one continuous idea.
  const travel = easeInOut(t, 1.85, 2.55);
  const typeWipe = ease(t, 2.3, 3.05);
  const ringFade = 1 - ease(t, 1.9, 2.6) * 0.26;

  const arcLength = circumference / 3;
  const barY = 540;
  const barWidth = 600;
  const arcOpacity = 1 - travel;
  const barOpacity = travel;

  return (
    <FilmFrame exposure={exposure} vignette={0.92} grain={0.08} lift="rgba(24,40,76,0.09)">
      <AbsoluteFill style={{background: `radial-gradient(62% 56% at 50% 38%, #141b26 0%, #080b12 74%)`}} />
      {/* The city is still there, held right down, so this is the same film and
          not a slide dropped in from a different one. */}
      <div style={{position: 'absolute', inset: 0, opacity: 0.13, filter: 'blur(10px)'}}>
        <Plane depth={0.4} zoom={1.05}>
          <SkylineBand buildings={MID} fill="#050810" windowColor="255,190,124" windowOpacity={0.3} litRatio={0.4} flicker={false} />
        </Plane>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 620, bottom: 0, background: 'linear-gradient(180deg, rgba(6,9,15,0.5), #070a10 44%)'}} />

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <g opacity={ringFade}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(244,241,234,0.42)"
            strokeWidth={2.5}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ringDraw)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          {Array.from({length: 24}, (_, index) => {
            const angle = (index / 24) * Math.PI * 2 - Math.PI / 2;
            const inner = index % 6 === 0 ? r - 16 : r - 8;
            const reveal = Math.max(0, Math.min(1, ticks * 24 - index));
            return (
              <line
                key={index}
                x1={cx + Math.cos(angle) * inner}
                y1={cy + Math.sin(angle) * inner}
                x2={cx + Math.cos(angle) * r}
                y2={cy + Math.sin(angle) * r}
                stroke="rgba(244,241,234,0.62)"
                strokeWidth={index % 6 === 0 ? 2.6 : 1.4}
                opacity={reveal * 0.9}
              />
            );
          })}
        </g>

        {/* The sleep third of the dial. */}
        <g opacity={arcOpacity}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={FILM.amber}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${arcLength * arcDraw} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </g>

        {/* ...becoming the rule under the number. */}
        <rect
          x={cx - (barWidth * barOpacity) / 2}
          y={cy + (barY - cy) * travel}
          width={barWidth * barOpacity}
          height={6}
          rx={3}
          fill={FILM.amber}
          opacity={barOpacity}
        />
      </svg>

      <Glow x={cx} y={cy} radius={300} color="255,159,69" intensity={0.11 * (1 - travel * 0.4)} />

      <div style={{position: 'absolute', left: 0, right: 0, top: 566, display: 'flex', justifyContent: 'center'}}>
        <div
          style={{
            fontFamily: TYPE,
            fontSize: 128,
            fontWeight: 800,
            letterSpacing: -4,
            color: FILM.paper,
            lineHeight: 1,
            textShadow: '0 6px 40px rgba(0,0,0,0.7)',
            // Masked on the type itself, so the wipe reads across the word
            // rather than across the empty frame either side of it.
            WebkitMaskImage: `linear-gradient(90deg, #000 ${typeWipe * 128 - 26}%, transparent ${typeWipe * 128}%)`,
            maskImage: `linear-gradient(90deg, #000 ${typeWipe * 128 - 26}%, transparent ${typeWipe * 128}%)`,
          }}
        >
          +8 HOURS
        </div>
      </div>
    </FilmFrame>
  );
};

// Head, neck, shoulders, waist, hips, two legs. Proportioned at just under
// seven heads tall so it reads as a person rather than a chess piece.
const FIGURE_CONTOUR =
  'M1372 686q4-32 48-32t48 32L1454 790L1460 830L1464 946L1432 946L1420 846L1408 946L1376 946L1380 830L1386 790Z';

/* 9. CLOSING WINDOW ---------------------------------------------------- */
export const ClosingWindow = ({durationInFrames}) => {
  const {progress, exposure, breath} = useShot(durationInFrames);
  const zoom = (1.14 - progress * 0.11) * breath;
  const rise = interpolate(progress, [0, 1], [-14, 10], CLAMP);

  return (
    <FilmFrame exposure={exposure} vignette={0.84} grain={0.075} lift="rgba(28,50,94,0.12)">
      <AbsoluteFill style={{background: FILM.black}} />
      <Plane zoom={zoom} rise={rise} depth={1}>
        {/* Glass wall onto the city */}
        <div style={{position: 'absolute', left: 150, top: 60, width: 1620, height: 880, overflow: 'hidden', background: 'linear-gradient(180deg, #071122 0%, #0e2039 54%, #1b2f47 100%)'}}>
          <div style={{position: 'absolute', inset: 0, transform: 'translate(-150px,-60px) scale(1.02)', filter: 'blur(3.5px)'}}>
            <Starfield seed={7} count={80} area={{x: 100, y: 60, w: 1720, h: 380}} opacity={0.4} />
            <SkylineBand buildings={FAR} fill="#0a1120" windowColor="255,196,132" windowOpacity={0.5} litRatio={0.4} />
            <SkylineBand buildings={MID} fill="#060a14" windowColor="255,190,124" windowOpacity={0.85} litRatio={0.5} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, background: 'linear-gradient(180deg, rgba(255,166,88,0.14), transparent 70%)', mixBlendMode: 'screen', filter: 'blur(18px)'}} />
        </div>
        <Bokeh seed={44} count={8} maxOpacity={0.14} area={{x: 260, y: 200, w: 1400, h: 560}} />

        {/* Mullions */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <g fill="#04060b">
            <rect x={124} y={36} width={1672} height={30} />
            <rect x={124} y={924} width={1672} height={30} />
            <rect x={124} y={36} width={30} height={918} />
            <rect x={1766} y={36} width={30} height={918} />
            <rect x={686} y={66} width={16} height={858} />
            <rect x={1218} y={66} width={16} height={858} />
          </g>
          {/* floor + one person, small in a large room. Seven heads tall,
              shoulders wider than the head, no limbs drawn - a silhouette
              cannot have broken anatomy if there is no anatomy to break. */}
          <rect x={0} y={946} width={W} height={140} fill="#05070c" />
          <g fill="#04060a">
            <ellipse cx={1420} cy={612} rx={21} ry={26} />
            <rect x={1411} y={632} width={18} height={26} />
            <path d={FIGURE_CONTOUR} />
          </g>
          <g fill="none" stroke="rgba(190,214,255,0.5)" strokeWidth={2}>
            <path d="M1468 686L1454 790L1460 830L1464 946" opacity={0.55} />
            <path d="M1441 592a21 26 0 0 1 0 34" opacity={0.6} />
          </g>
          {/* Reflection in the floor grounds the figure instead of letting it
              hover in front of the glass. */}
          <g opacity={0.18} transform="translate(0 1892) scale(1 -0.42)">
            <ellipse cx={1420} cy={612} rx={21} ry={26} fill="#0b1524" />
            <path d={FIGURE_CONTOUR} fill="#0b1524" />
          </g>
          <ellipse cx={1420} cy={950} rx={74} ry={10} fill="#000" opacity={0.55} />
        </svg>
      </Plane>

      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(180deg, rgba(4,6,11,0), #04060b 72%)'}} />
      <DustField seed={83} count={26} speed={5} color="rgba(200,222,255,0.3)" area={{x: 200, y: 120, w: 1520, h: 820}} />
    </FilmFrame>
  );
};

export const SHOT_COMPONENTS = {
  ClockMacro,
  BedroomNight,
  WindowDawn,
  BedroomMorning,
  ClockDissolve,
  CityNight,
  CitySweep,
  HoursGraphic,
  ClosingWindow,
};
