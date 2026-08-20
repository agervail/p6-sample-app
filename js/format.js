const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export function formatBytes(bytes) {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(2)} MB`;
  return `${Math.round(bytes / KILOBYTE)} KB`;
}

export function formatSeconds(seconds) {
  return `${seconds.toFixed(2)}s`;
}

export function formatPadNumber(padIndex) {
  return String(padIndex + 1).padStart(2, '0');
}

export function formatDecibels(gain) {
  const decibels = 20 * Math.log10(gain);
  return `${decibels >= 0 ? '+' : ''}${decibels.toFixed(1)} dB`;
}

export function formatLevel(peak) {
  return `${(20 * Math.log10(peak)).toFixed(1)} dB`;
}
