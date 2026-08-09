import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {scatter} from './rng.mjs';
import {CLAMP, FILM} from './grade.jsx';

const W = 1920;
const H = 1080;

/** A depth plane. Distant planes move less and carry more haze; near planes
 *  move more and go soft. This is the whole reason the frames read as space
 *  rather than as stacked stickers. */
export const Plane = ({depth = 0, pan = 0, rise = 0, zoom = 1, rotate = 0, blur = 0, children, style}) => (
  <AbsoluteFill
    style={{
      transform: `translate3d(${pan * depth}px, ${rise * depth}px, 0) rotate(${rotate}deg) scale(${zoom})`,
      filter: blur ? `blur(${blur}px)` : undefined,
      willChange: 'transform',
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Atmospheric perspective: a haze wash sitting between two depth planes. */
export const Haze = ({color = 'rgba(120,160,220,0.10)', top = '38%', bottom = '0%'}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, transparent ${top}, ${color} 100%)`,
      bottom,
      pointerEvents: 'none',
    }}
  />
);

export const Starfield = ({seed = 11, count = 150, opacity = 1, area = {x: 0, y: 0, w: W, h: 620}}) => {
  const frame = useCurrentFrame();
  const stars = scatter(seed, count, (random) => ({
    x: area.x + random() * area.w,
    y: area.y + random() * area.h,
    r: 0.6 + random() * 1.5,
    a: 0.25 + random() * 0.6,
    phase: random() * Math.PI * 2,
  }));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, opacity}}>
      {stars.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="#dfe9ff"
          opacity={star.a * (0.72 + 0.28 * Math.sin(frame / 22 + star.phase))}
        />
      ))}
    </svg>
  );
};

/** Motes drifting in a light beam. Small, slow, mostly invisible - which is
 *  exactly why the shot feels photographed. */
export const DustField = ({
  seed = 3,
  count = 46,
  area = {x: 0, y: 0, w: W, h: H},
  color = 'rgba(255,238,214,0.55)',
  size = [1.2, 3.4],
  speed = 9,
  blur = 0.6,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const motes = scatter(seed, count, (random) => ({
    x: area.x + random() * area.w,
    y: area.y + random() * area.h,
    r: size[0] + random() * (size[1] - size[0]),
    a: 0.18 + random() * 0.72,
    drift: 0.45 + random() * 1.1,
    sway: 10 + random() * 34,
    phase: random() * Math.PI * 2,
  }));
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{position: 'absolute', inset: 0, filter: blur ? `blur(${blur}px)` : undefined}}
    >
      {motes.map((mote, index) => {
        const y = mote.y - ((t * speed * mote.drift) % (area.h + 60));
        const wrapped = y < area.y - 30 ? y + area.h + 60 : y;
        return (
          <circle
            key={index}
            cx={mote.x + Math.sin(t * 0.5 + mote.phase) * mote.sway}
            cy={wrapped}
            r={mote.r}
            fill={color}
            opacity={mote.a * (0.55 + 0.45 * Math.sin(t * 1.2 + mote.phase))}
          />
        );
      })}
    </svg>
  );
};

/** Out-of-focus highlights. Used only where the lens is genuinely wide open. */
export const Bokeh = ({seed = 5, count = 9, color = '255,168,92', maxOpacity = 0.2, area = {x: 120, y: 90, w: 1700, h: 820}}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const orbs = scatter(seed, count, (random) => ({
    x: area.x + random() * area.w,
    y: area.y + random() * area.h,
    r: 48 + random() * 130,
    a: 0.25 + random() * 0.75,
    phase: random() * Math.PI * 2,
  }));
  return (
    <AbsoluteFill style={{filter: 'blur(22px)', mixBlendMode: 'screen'}}>
      {orbs.map((orb, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: orb.x + Math.sin(t * 0.22 + orb.phase) * 16,
            top: orb.y + Math.cos(t * 0.18 + orb.phase) * 12,
            width: orb.r,
            height: orb.r,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${color},${maxOpacity * orb.a}) 0%, rgba(${color},${maxOpacity * orb.a * 0.35}) 55%, rgba(${color},0) 72%)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** A volumetric beam. Drawn as a soft polygon, blurred and screened - the
 *  cheapest honest way to get light with a direction into a frame. */
export const LightShaft = ({points, color = 'rgba(168,198,240,0.30)', blur = 26, opacity = 1}) => (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{position: 'absolute', inset: 0, filter: `blur(${blur}px)`, mixBlendMode: 'screen', opacity}}
  >
    <polygon points={points} fill={color} />
  </svg>
);

/** Glow that reads as bloom off a practical light source. */
export const Glow = ({x, y, radius, color = '255,159,69', intensity = 0.5}) => (
  <div
    style={{
      position: 'absolute',
      left: x - radius,
      top: y - radius,
      width: radius * 2,
      height: radius * 2,
      borderRadius: '50%',
      background: `radial-gradient(circle, rgba(${color},${intensity}) 0%, rgba(${color},${intensity * 0.28}) 38%, rgba(${color},0) 70%)`,
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    }}
  />
);

const SEGMENTS = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abgfcd',
};

/** Seven-segment digits, drawn as real segments rather than a font. Beveled
 *  ends and an unlit-segment ghost are what make a clock read as a clock. */
export const SevenSegment = ({
  value,
  x,
  y,
  w = 62,
  h = 118,
  gap = 20,
  color = FILM.amber,
  thickness = 13,
  ghost = 'rgba(255,159,69,0.035)',
  colonOpacity = 1,
}) => {
  const digits = String(value).split('');
  let cursor = x;
  const shapes = [];
  digits.forEach((char, index) => {
    if (char === ':') {
      shapes.push(
        <g key={`c${index}`} opacity={colonOpacity}>
          <rect x={cursor + 2} y={y + h * 0.26} width={thickness} height={thickness} rx={thickness * 0.28} fill={color} />
          <rect x={cursor + 2} y={y + h * 0.68} width={thickness} height={thickness} rx={thickness * 0.28} fill={color} />
        </g>,
      );
      cursor += thickness + gap + 2;
      return;
    }
    const on = SEGMENTS[char] || '';
    const t = thickness;
    const seg = {
      a: [cursor + t * 0.55, y, w - t * 1.1, t],
      b: [cursor + w - t, y + t * 0.5, t, h / 2 - t * 0.75],
      c: [cursor + w - t, y + h / 2 + t * 0.25, t, h / 2 - t * 0.75],
      d: [cursor + t * 0.55, y + h - t, w - t * 1.1, t],
      e: [cursor, y + h / 2 + t * 0.25, t, h / 2 - t * 0.75],
      f: [cursor, y + t * 0.5, t, h / 2 - t * 0.75],
      g: [cursor + t * 0.55, y + h / 2 - t / 2, w - t * 1.1, t],
    };
    Object.entries(seg).forEach(([key, [sx, sy, sw, sh]]) => {
      const lit = on.includes(key);
      shapes.push(
        <rect
          key={`${index}${key}`}
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          rx={t * 0.28}
          fill={lit ? color : ghost}
        />,
      );
    });
    cursor += w + gap;
  });
  return <>{shapes}</>;
};

/** Deterministic skyline band.
 *
 *  Buildings vary in roof form, sit on slightly different ground lines and are
 *  allowed to overlap, because a row of equal rectangles standing on one line
 *  is the thing that makes a skyline read as cardboard. */
const ROOFS = ['flat', 'flat', 'setback', 'stepped', 'spire', 'tank', 'angled'];

export function buildSkyline({seed, count, baseY, minH, maxH, minW, maxW, spread}) {
  let x = spread.from;
  return scatter(seed, count, (random) => {
    const width = minW + random() * (maxW - minW);
    const height = minH + random() * (maxH - minH);
    const building = {
      x,
      base: baseY + (random() - 0.5) * 26,
      y: baseY - height,
      w: width,
      h: height,
      cols: Math.max(1, Math.round(width / (24 + random() * 12))),
      rows: Math.max(2, Math.round(height / (30 + random() * 16))),
      seed: Math.floor(random() * 100000),
      roof: ROOFS[Math.floor(random() * ROOFS.length)],
      roofScale: 0.4 + random() * 0.5,
    };
    // Overlap sometimes, gap other times.
    x += width * (0.78 + random() * 0.46);
    return building;
  }).filter((building) => building.x < spread.to);
}

function roofPath(building) {
  const {x, w, y, roof, roofScale} = building;
  const bottom = building.base;
  const inset = w * 0.2 * roofScale;
  switch (roof) {
    case 'setback':
      return `M${x} ${bottom}V${y + 40}h${inset}V${y}h${w - inset * 2}v${40}h${inset}V${bottom}Z`;
    case 'stepped':
      return `M${x} ${bottom}V${y + 66}h${inset * 0.7}V${y + 32}h${inset * 0.8}V${y}h${w - inset * 3}v${32}h${inset * 0.8}v${34}h${inset * 0.7}V${bottom}Z`;
    case 'angled':
      return `M${x} ${bottom}V${y + 44}L${x + w} ${y}V${bottom}Z`;
    default:
      return `M${x} ${bottom}V${y}h${w}V${bottom}Z`;
  }
}

export const SkylineBand = ({
  buildings,
  fill = '#080c15',
  windowColor = '255,190,120',
  windowOpacity = 0.85,
  litRatio = 0.42,
  flicker = true,
  roofEdge = null,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      {buildings.map((building, index) => {
        const cells = building.cols * building.rows;
        // Floors are lit in runs, the way real office floors are, rather than
        // as independent coin flips per window.
        const floors = scatter(building.seed ^ 0x5f3a, building.rows, (random) => ({
          band: random() < litRatio * 0.55,
          bias: random(),
        }));
        const windows = scatter(building.seed, cells, (random, cell) => ({
          cell,
          roll: random(),
          a: 0.42 + random() * 0.58,
          phase: random() * 9,
          switches: random() > 0.94,
        }));
        const colWidth = (building.w - 16) / building.cols;
        const rowHeight = (building.h - 18) / building.rows;
        return (
          <g key={index}>
            <path d={roofPath(building)} fill={fill} />
            {building.roof === 'spire' ? (
              <rect x={building.x + building.w / 2 - 2.5} y={building.y - 34 * building.roofScale - 6} width={5} height={34 * building.roofScale + 8} fill={fill} />
            ) : null}
            {building.roof === 'tank' ? (
              <rect
                x={building.x + building.w * 0.52}
                y={building.y - 22 * building.roofScale}
                width={building.w * 0.3}
                height={22 * building.roofScale + 4}
                rx={5}
                fill={fill}
              />
            ) : null}
            {roofEdge ? (
              <path d={roofPath(building)} fill="none" stroke={roofEdge} strokeWidth={1.4} opacity={0.5} />
            ) : null}
            {windows.map((win) => {
              const col = win.cell % building.cols;
              const row = Math.floor(win.cell / building.cols);
              const floor = floors[row] || {band: false, bias: 0.5};
              const threshold = floor.band ? litRatio * 2.1 : litRatio * 0.55;
              const on = win.switches && flicker ? Math.sin(t * 0.7 + win.phase) > 0.1 : win.roll < threshold;
              if (!on) return null;
              const wx = building.x + 8 + col * colWidth;
              const wy = building.y + 12 + row * rowHeight;
              // Skip windows that would fall outside a sloped or stepped roof.
              if (wy < building.y + 8) return null;
              if (building.roof === 'angled' && wy < building.y + 44 * (1 - (wx - building.x) / building.w)) return null;
              return (
                <rect
                  key={win.cell}
                  x={wx}
                  y={wy}
                  width={Math.max(3, colWidth - 9)}
                  height={Math.max(4, rowHeight - 13)}
                  fill={`rgba(${windowColor},${win.a * windowOpacity})`}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

/** Long-exposure traffic. Streaks slide along a road plane and wrap. */
export const TrafficStreaks = ({seed = 21, count = 16, y = 900, spread = 240, color = '255,176,92', speed = 210}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const streaks = scatter(seed, count, (random) => ({
    lane: random(),
    len: 120 + random() * 320,
    thick: 2 + random() * 5,
    a: 0.2 + random() * 0.6,
    offset: random() * 2400,
    dir: random() > 0.5 ? 1 : -1,
  }));
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', filter: 'blur(2.5px)'}}>
      {streaks.map((streak, index) => {
        const lane = y + streak.lane * spread;
        const scale = 0.55 + streak.lane * 0.8;
        const travel = ((t * speed * scale * streak.dir + streak.offset) % 2600 + 2600) % 2600;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: travel - 340,
              top: lane,
              width: streak.len * scale,
              height: streak.thick * scale,
              borderRadius: 99,
              background: `linear-gradient(90deg, rgba(${color},0) 0%, rgba(${color},${streak.a}) 45%, rgba(${color},0) 100%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Interpolated multi-stop sky. Drives the night-to-morning progressions. */
export function skyGradient(progress, stops) {
  const pick = (index) => {
    const values = stops.map((stop) => stop[index]);
    const scaled = progress * (values.length - 1);
    const low = Math.max(0, Math.min(values.length - 1, Math.floor(scaled)));
    const high = Math.max(0, Math.min(values.length - 1, low + 1));
    return mixColor(values[low], values[high], scaled - low);
  };
  return `linear-gradient(180deg, ${pick(0)} 0%, ${pick(1)} 46%, ${pick(2)} 100%)`;
}

export function mixColor(a, b, amount) {
  const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const t = Math.max(0, Math.min(1, amount));
  const channel = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${channel(r1, r2)},${channel(g1, g2)},${channel(b1, b2)})`;
}

export const ease = (frame, from, to, out = [0, 1]) =>
  interpolate(frame, [from, to], out, {...CLAMP, easing: (x) => 1 - Math.pow(1 - x, 3)});

export const easeInOut = (frame, from, to, out = [0, 1]) =>
  interpolate(frame, [from, to], out, {
    ...CLAMP,
    easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  });

export const CANVAS = {W, H};
