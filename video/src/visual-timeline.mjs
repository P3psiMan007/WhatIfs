export function buildContinuousBeatFrames(beats, fps, durationSeconds) {
  const rate = Math.max(1, Number(fps) || 30);
  const totalFrames = Math.max(1, Math.ceil(Math.max(0, Number(durationSeconds) || 0) * rate));
  const ordered = [...(beats || [])]
    .filter((beat) => Number.isFinite(Number(beat?.start)))
    .sort((a,b) => Number(a.start) - Number(b.start));

  return ordered.map((beat, index) => {
    const from = Math.max(0, Math.min(totalFrames - 1, Math.floor(Number(beat.start) * rate)));
    const next = ordered[index + 1];
    const nextFrom = next
      ? Math.max(from + 1, Math.min(totalFrames, Math.floor(Number(next.start) * rate)))
      : totalFrames;
    return {
      ...beat,
      from,
      durationInFrames: Math.max(1, nextFrom - from),
    };
  });
}
