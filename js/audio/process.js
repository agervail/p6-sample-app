import {
  BYTES_PER_FRAME_PER_CHANNEL,
  CENTS_PER_OCTAVE,
  MAX_PAD_BYTES,
} from '../constants.js';

export function pitchRatio(cents) {
  return 2 ** (cents / CENTS_PER_OCTAVE);
}

export function foldToMono(channels) {
  if (channels.length === 1) return channels;
  const folded = new Float32Array(channels[0].length);
  for (const channel of channels) {
    for (let frame = 0; frame < folded.length; frame += 1) folded[frame] += channel[frame];
  }
  for (let frame = 0; frame < folded.length; frame += 1) folded[frame] /= channels.length;
  return [folded];
}

export async function resampleChannels(channels, sourceRate, targetRate) {
  if (targetRate === sourceRate) return channels;
  const frames = channels[0].length;
  const targetFrames = Math.max(1, Math.round((frames * targetRate) / sourceRate));
  const renderer = new OfflineAudioContext(channels.length, targetFrames, targetRate);
  const buffer = renderer.createBuffer(channels.length, frames, sourceRate);
  channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
  const player = renderer.createBufferSource();
  player.buffer = buffer;
  player.connect(renderer.destination);
  player.start();
  const rendered = await renderer.startRendering();
  return Array.from({ length: rendered.numberOfChannels }, (unused, index) => rendered.getChannelData(index));
}

export function trimWindow(pad) {
  return { start: pad.trimStart, end: pad.trimEnd };
}

export function offsetWithinTrim(sourceRatio, trim) {
  const span = trim.end - trim.start;
  return Math.min(1, Math.max(0, (sourceRatio - trim.start) / span));
}

function trimBounds(pad) {
  const firstFrame = Math.floor(pad.trimStart * pad.source.frames);
  const lastFrame = Math.max(firstFrame + 1, Math.round(pad.trimEnd * pad.source.frames));
  return { firstFrame, lastFrame, frames: lastFrame - firstFrame };
}

function trimmedChannels(pad) {
  const { firstFrame, lastFrame } = trimBounds(pad);
  return pad.source.channels.map((channel) => channel.subarray(firstFrame, lastFrame));
}

export function outputChannelCount(pad, forceMono) {
  return pad.mono || forceMono ? 1 : pad.source.channels.length;
}

export function padMetrics(pad, forceMono) {
  const channelCount = outputChannelCount(pad, forceMono);
  const bytesPerFrame = channelCount * BYTES_PER_FRAME_PER_CHANNEL;
  const seconds = trimBounds(pad).frames / pad.source.sampleRate / pitchRatio(pad.pitchCents);
  const frames = Math.max(1, Math.round(seconds * pad.sampleRate));
  const maxFrames = Math.floor(MAX_PAD_BYTES / bytesPerFrame);
  const keptFrames = Math.min(frames, maxFrames);
  return {
    channelCount,
    seconds,
    maxSeconds: maxFrames / pad.sampleRate,
    frames,
    keptFrames,
    isTruncated: frames > maxFrames,
    bytes: keptFrames * bytesPerFrame,
  };
}

function truncate(channels, frames) {
  if (channels[0].length <= frames) return channels;
  return channels.map((channel) => channel.subarray(0, frames));
}

export async function renderPad(pad, forceMono) {
  const metrics = padMetrics(pad, forceMono);
  const trimmed = trimmedChannels(pad);
  const folded = metrics.channelCount === 1 ? foldToMono(trimmed) : trimmed;
  const renderRate = Math.round(pad.sampleRate / pitchRatio(pad.pitchCents));
  const resampled = await resampleChannels(folded, pad.source.sampleRate, renderRate);
  return { channels: truncate(resampled, metrics.keptFrames), sampleRate: pad.sampleRate };
}
