import { WAVEFORM_BUCKETS } from '../constants.js';
import { computePeaks } from './peaks.js';

const TARGET_PEAK_DB = -1;
const TARGET_PEAK = 10 ** (TARGET_PEAK_DB / 20);
const AT_TARGET_TOLERANCE = 0.001;

function peakOf(peaks) {
  let peak = 0;
  for (let bucket = 0; bucket < peaks.maximums.length; bucket += 1) {
    peak = Math.max(peak, peaks.maximums[bucket], -peaks.minimums[bucket]);
  }
  return peak;
}

export function canNormalize(peaks) {
  const peak = peakOf(peaks);
  return peak > 0 && Math.abs(peak - TARGET_PEAK) > AT_TARGET_TOLERANCE;
}

export function normalizeSource(source) {
  let peak = 0;
  for (const channel of source.channels) {
    for (const value of channel) peak = Math.max(peak, Math.abs(value));
  }
  if (peak === 0) return { source, peaks: computePeaks(source.channels, WAVEFORM_BUCKETS), gain: 1 };

  const gain = TARGET_PEAK / peak;
  const channels = source.channels.map((channel) => channel.map((value) => value * gain));
  return {
    source: { ...source, channels },
    peaks: computePeaks(channels, WAVEFORM_BUCKETS),
    gain,
  };
}
