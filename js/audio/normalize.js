import { WAVEFORM_BUCKETS } from '../constants.js';
import { computePeaks } from './peaks.js';

const FULL_SCALE = 1;
const ALREADY_FULL_SCALE = 0.999;

function peakOf(peaks) {
  let peak = 0;
  for (let bucket = 0; bucket < peaks.maximums.length; bucket += 1) {
    peak = Math.max(peak, peaks.maximums[bucket], -peaks.minimums[bucket]);
  }
  return peak;
}

export function canNormalize(peaks) {
  const peak = peakOf(peaks);
  return peak > 0 && peak < ALREADY_FULL_SCALE;
}

export function normalizeSource(source) {
  let peak = 0;
  for (const channel of source.channels) {
    for (const value of channel) peak = Math.max(peak, Math.abs(value));
  }
  if (peak === 0) return { source, peaks: computePeaks(source.channels, WAVEFORM_BUCKETS), gain: FULL_SCALE };

  const gain = FULL_SCALE / peak;
  const channels = source.channels.map((channel) => channel.map((value) => value * gain));
  return {
    source: { ...source, channels },
    peaks: computePeaks(channels, WAVEFORM_BUCKETS),
    gain,
  };
}
