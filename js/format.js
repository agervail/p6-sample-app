const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export function formatBytes(bytes) {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(2)} Mo`;
  return `${Math.round(bytes / KILOBYTE)} Ko`;
}

export function formatSeconds(seconds) {
  return `${seconds.toFixed(2)}s`;
}
