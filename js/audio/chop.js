import {
  CHOP_ENVELOPE_HOP_MS,
  CHOP_MIN_SLICE_MS,
  CHOP_ONSET_RISE_FACTOR,
  WAVEFORM_BUCKETS,
} from '../constants.js';
import { computePeaks } from './peaks.js';
import { foldToMono, renderPad } from './process.js';

const MILLISECONDS_PER_SECOND = 1000;
const SILENCE_FLOOR_RATIO = 0.05;
const HASH_OFFSET = 0x811c9dc5;
const HASH_PRIME = 0x01000193;
const HASH_LENGTH = 8;

function shortHash(text) {
  let hash = HASH_OFFSET;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, HASH_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(HASH_LENGTH, '0').slice(-HASH_LENGTH);
}

function energyEnvelope(channel, hopFrames) {
  const hopCount = Math.floor(channel.length / hopFrames);
  const envelope = new Float32Array(hopCount);
  for (let hop = 0; hop < hopCount; hop += 1) {
    let sum = 0;
    const start = hop * hopFrames;
    for (let frame = start; frame < start + hopFrames; frame += 1) sum += channel[frame] * channel[frame];
    envelope[hop] = Math.sqrt(sum / hopFrames);
  }
  return envelope;
}

function detectOnsets(channel, sampleRate, sliceCount) {
  const hopFrames = Math.max(1, Math.round((sampleRate * CHOP_ENVELOPE_HOP_MS) / MILLISECONDS_PER_SECOND));
  const envelope = energyEnvelope(channel, hopFrames);
  const loudest = envelope.reduce((peak, value) => Math.max(peak, value), 0);
  const floor = loudest * SILENCE_FLOOR_RATIO;
  const minimumGapHops = Math.max(1, Math.round(CHOP_MIN_SLICE_MS / CHOP_ENVELOPE_HOP_MS));

  const candidates = [];
  let lastHop = -minimumGapHops;
  for (let hop = 1; hop < envelope.length; hop += 1) {
    const previous = Math.max(envelope[hop - 1], floor);
    if (envelope[hop] < floor || envelope[hop] < previous * CHOP_ONSET_RISE_FACTOR) continue;
    if (hop - lastHop < minimumGapHops) continue;
    candidates.push({ frame: hop * hopFrames, strength: envelope[hop] / previous });
    lastHop = hop;
  }

  const strongest = candidates.sort((left, right) => right.strength - left.strength).slice(0, sliceCount - 1);
  const boundaries = strongest.map((candidate) => candidate.frame).sort((left, right) => left - right);
  return [0, ...boundaries];
}

function equalBoundaries(frames, sliceCount) {
  return Array.from({ length: sliceCount }, (unused, index) => Math.floor((frames * index) / sliceCount));
}

function sliceLengths(boundaries, frames) {
  return boundaries.map((start, index) => (boundaries[index + 1] ?? frames) - start);
}

function assembleSlices(channels, boundaries, frames) {
  const lengths = sliceLengths(boundaries, frames);
  const sliceFrames = lengths.reduce((longest, length) => Math.max(longest, length), 0);
  const totalFrames = sliceFrames * boundaries.length;
  return channels.map((channel) => {
    const output = new Float32Array(totalFrames);
    boundaries.forEach((start, index) => {
      output.set(channel.subarray(start, start + lengths[index]), index * sliceFrames);
    });
    return output;
  });
}

export async function chopPad(pad, forceMono, { sliceCount, mode }) {
  const rendered = await renderPad(pad, forceMono);
  const frames = rendered.channels[0].length;
  const boundaries = mode === 'transient'
    ? detectOnsets(foldToMono(rendered.channels)[0], rendered.sampleRate, sliceCount)
    : equalBoundaries(frames, sliceCount);
  const channels = assembleSlices(rendered.channels, boundaries, frames);
  const layout = channels.length === 1 ? 'mono' : 'stereo';
  const signature = shortHash(`${pad.name}|${mode}|${boundaries.join(',')}|${rendered.sampleRate}`);

  return {
    name: `chop_${boundaries.length}slices_${rendered.sampleRate}Hz_${layout}_${signature}.wav`,
    source: { channels, sampleRate: rendered.sampleRate, frames: channels[0].length },
    peaks: computePeaks(channels, WAVEFORM_BUCKETS),
    sliceCount: boundaries.length,
  };
}
