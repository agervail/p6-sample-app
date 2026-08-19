const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export function formatBytes(bytes) {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(2)} MB`;
  return `${Math.round(bytes / KILOBYTE)} KB`;
}

export function formatSeconds(seconds) {
  return `${seconds.toFixed(2)}s`;
}
