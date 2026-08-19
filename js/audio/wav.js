const HEADER_LENGTH = 44;
const PCM_FORMAT = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const POSITIVE_PEAK = 32767;
const NEGATIVE_PEAK = -32768;

function writeTag(view, offset, tag) {
  for (let index = 0; index < tag.length; index += 1) view.setUint8(offset + index, tag.charCodeAt(index));
}

function toSixteenBit(value) {
  const clamped = Math.max(-1, Math.min(1, value));
  return clamped < 0 ? Math.round(clamped * -NEGATIVE_PEAK) : Math.round(clamped * POSITIVE_PEAK);
}

export function encodeWav(channels, sampleRate) {
  const frames = channels[0].length;
  const channelCount = channels.length;
  const dataLength = frames * channelCount * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(HEADER_LENGTH + dataLength);
  const view = new DataView(buffer);

  writeTag(view, 0, 'RIFF');
  view.setUint32(4, HEADER_LENGTH - 8 + dataLength, true);
  writeTag(view, 8, 'WAVE');
  writeTag(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * BYTES_PER_SAMPLE, true);
  view.setUint16(32, channelCount * BYTES_PER_SAMPLE, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeTag(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = HEADER_LENGTH;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      view.setInt16(offset, toSixteenBit(channels[channel][frame]), true);
      offset += BYTES_PER_SAMPLE;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
