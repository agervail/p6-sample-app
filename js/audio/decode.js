import { WAVEFORM_BUCKETS } from '../constants.js';
import { computePeaks } from './peaks.js';

const RIFF_TAG = 'RIFF';
const WAVE_TAG = 'WAVE';
const FORMAT_TAG = 'fmt ';
const HEADER_TAG_LENGTH = 4;
const CHUNK_HEADER_LENGTH = 8;
const FIRST_CHUNK_OFFSET = 12;
const CHANNEL_COUNT_OFFSET = 2;
const SAMPLE_RATE_OFFSET = 4;

function readTag(view, offset) {
  let tag = '';
  for (let index = 0; index < HEADER_TAG_LENGTH; index += 1) {
    tag += String.fromCharCode(view.getUint8(offset + index));
  }
  return tag;
}

function findFormatChunkOffset(view) {
  let offset = FIRST_CHUNK_OFFSET;
  while (offset + CHUNK_HEADER_LENGTH <= view.byteLength) {
    const size = view.getUint32(offset + HEADER_TAG_LENGTH, true);
    if (readTag(view, offset) === FORMAT_TAG) return offset + CHUNK_HEADER_LENGTH;
    offset += CHUNK_HEADER_LENGTH + size + (size % 2);
  }
  return -1;
}

export function readWavFormat(bytes) {
  const view = new DataView(bytes);
  if (view.byteLength < FIRST_CHUNK_OFFSET) throw new Error('File too short to be a WAV');
  if (readTag(view, 0) !== RIFF_TAG || readTag(view, 8) !== WAVE_TAG) {
    throw new Error('This file is not a WAV');
  }
  const formatOffset = findFormatChunkOffset(view);
  if (formatOffset < 0) throw new Error('Incomplete WAV header (fmt chunk missing)');
  return {
    channelCount: view.getUint16(formatOffset + CHANNEL_COUNT_OFFSET, true),
    sampleRate: view.getUint32(formatOffset + SAMPLE_RATE_OFFSET, true),
  };
}

function extractChannels(audioBuffer) {
  const channels = [];
  for (let index = 0; index < audioBuffer.numberOfChannels; index += 1) {
    channels.push(audioBuffer.getChannelData(index));
  }
  return channels;
}

export async function decodeWavFile(file) {
  const bytes = await file.arrayBuffer();
  const format = readWavFormat(bytes);
  const decoder = new OfflineAudioContext(format.channelCount, 1, format.sampleRate);
  const audioBuffer = await decoder.decodeAudioData(bytes);
  const channels = extractChannels(audioBuffer);
  return {
    name: file.name,
    source: { channels, sampleRate: audioBuffer.sampleRate, frames: audioBuffer.length },
    peaks: computePeaks(channels, WAVEFORM_BUCKETS),
  };
}
