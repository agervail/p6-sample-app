import {
  BYTES_PER_FRAME_PER_CHANNEL,
  MAX_PAD_BYTES,
  P6_MAX_CHOP,
  P6_MIN_CHOP,
  WAVEFORM_BUCKETS,
} from '../constants.js';
import { computePeaks } from './peaks.js';
import { foldToMono, resampleChannels } from './process.js';

const FILE_EXTENSION = /\.[^.]*$/;

export const MIN_KIT_SOURCES = P6_MIN_CHOP;
export const MAX_KIT_SOURCES = P6_MAX_CHOP;

function sectionCount(sourceCount) {
  if (sourceCount < MIN_KIT_SOURCES || sourceCount > MAX_KIT_SOURCES) return null;
  return sourceCount;
}

function kitChannelCount(sources, mono) {
  if (mono) return 1;
  return sources.reduce((most, source) => Math.max(most, source.channels.length), 1);
}

export function maxSectionSeconds({ sections, channelCount, sampleRate }) {
  const bytesPerFrame = channelCount * BYTES_PER_FRAME_PER_CHANNEL;
  return Math.floor(MAX_PAD_BYTES / bytesPerFrame / sections) / sampleRate;
}

export function kitMetrics(sources, { sliceSeconds, sampleRate, mono }) {
  const channelCount = kitChannelCount(sources, mono);
  const bytesPerFrame = channelCount * BYTES_PER_FRAME_PER_CHANNEL;
  const sections = sectionCount(sources.length);
  const sliceFrames = Math.max(1, Math.round(sliceSeconds * sampleRate));
  const frames = (sections ?? 0) * sliceFrames;
  const bytes = frames * bytesPerFrame;
  return {
    channelCount,
    sections,
    sliceFrames,
    sliceSeconds: sliceFrames / sampleRate,
    frames,
    seconds: frames / sampleRate,
    bytes,
    overflows: bytes > MAX_PAD_BYTES,
  };
}

function matchChannelCount(channels, channelCount) {
  if (channels.length === channelCount) return channels;
  if (channelCount === 1) return foldToMono(channels);
  return Array.from({ length: channelCount }, (unused, index) => channels[index] ?? channels[0]);
}

function kitName(sources, sections) {
  return `kit${sections}_${sources[0].name.replace(FILE_EXTENSION, '')}.wav`;
}

export async function combineIntoKit(sources, options) {
  const metrics = kitMetrics(sources, options);
  if (metrics.sections === null) throw new Error(`A kit holds ${MIN_KIT_SOURCES} to ${MAX_KIT_SOURCES} samples`);
  const channels = Array.from({ length: metrics.channelCount }, () => new Float32Array(metrics.frames));

  for (const [index, source] of sources.entries()) {
    const matched = matchChannelCount(source.channels, metrics.channelCount);
    const laidOut = await resampleChannels(matched, source.sampleRate, options.sampleRate);
    const keptFrames = Math.min(metrics.sliceFrames, laidOut[0].length);
    laidOut.forEach((channel, channelIndex) => {
      channels[channelIndex].set(channel.subarray(0, keptFrames), index * metrics.sliceFrames);
    });
  }

  return {
    name: kitName(sources, metrics.sections),
    source: { channels, sampleRate: options.sampleRate, frames: metrics.frames },
    peaks: computePeaks(channels, WAVEFORM_BUCKETS),
    sliceCount: metrics.sections,
    sampleRate: options.sampleRate,
    mono: metrics.channelCount === 1,
  };
}
