const HATCH_SIZE = 7;
const CENTER_LINE_ALPHA = 0.3;
const SIGNAL_COLOR = '#4D8DFD';
const DIMMED_COLOR = '#2E2E36';
const OVERFLOW_FILL = 'rgba(242, 84, 74, 0.16)';
const OVERFLOW_STROKE = 'rgba(242, 84, 74, 0.55)';
const SLICE_STROKE = 'rgba(240, 227, 28, 0.55)';
const PLAYHEAD_STROKE = '#EDEDEF';
const TRIM_MASK_FILL = 'rgba(7, 7, 8, 0.72)';
const TRIM_STROKE = '#9A9AA2';
const TRIM_GRIP_WIDTH = 5;
const TRIM_GRIP_HEIGHT = 14;

export const FULL_WINDOW = { start: 0, end: 1 };

function withinWindow(trim, ratio) {
  return trim.start + ratio * (trim.end - trim.start);
}

export function waveColor(isLoaded) {
  return isLoaded ? SIGNAL_COLOR : DIMMED_COLOR;
}

let hatchPattern = null;

function overflowPattern(context) {
  if (hatchPattern) return hatchPattern;
  const tile = document.createElement('canvas');
  tile.width = HATCH_SIZE;
  tile.height = HATCH_SIZE;
  const tileContext = tile.getContext('2d');
  tileContext.strokeStyle = OVERFLOW_STROKE;
  tileContext.lineWidth = 1;
  tileContext.beginPath();
  tileContext.moveTo(0, HATCH_SIZE);
  tileContext.lineTo(HATCH_SIZE, 0);
  tileContext.stroke();
  hatchPattern = context.createPattern(tile, 'repeat');
  return hatchPattern;
}

function fitToDisplaySize(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function drawSignal(context, peaks, width, height, color) {
  const middle = height / 2;
  const bucketCount = peaks.maximums.length;
  context.fillStyle = color;
  for (let column = 0; column < width; column += 1) {
    const bucket = Math.min(bucketCount - 1, Math.floor((column / width) * bucketCount));
    const top = middle - peaks.maximums[bucket] * middle;
    const bottom = middle - peaks.minimums[bucket] * middle;
    context.fillRect(column, top, 1, Math.max(1, bottom - top));
  }
}

function drawVerticalLine(context, x, height, color, width) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, height);
  context.stroke();
}

function drawGrip(context, edgeX, height, inwardSign) {
  const left = inwardSign > 0 ? edgeX : edgeX - TRIM_GRIP_WIDTH;
  context.fillRect(left, 0, TRIM_GRIP_WIDTH, TRIM_GRIP_HEIGHT);
  context.fillRect(left, height - TRIM_GRIP_HEIGHT, TRIM_GRIP_WIDTH, TRIM_GRIP_HEIGHT);
}

function drawTrim(context, trim, width, height, withGrips) {
  const startX = trim.start * width;
  const endX = trim.end * width;
  context.fillStyle = TRIM_MASK_FILL;
  context.fillRect(0, 0, startX, height);
  context.fillRect(endX, 0, width - endX, height);
  if (trim.start > 0) drawVerticalLine(context, startX, height, TRIM_STROKE, 1);
  if (trim.end < 1) drawVerticalLine(context, endX, height, TRIM_STROKE, 1);
  if (!withGrips) return;
  context.fillStyle = TRIM_STROKE;
  drawGrip(context, startX, height, 1);
  drawGrip(context, endX, height, -1);
}

export function drawWaveform(canvas, {
  peaks,
  color,
  trim = FULL_WINDOW,
  overflowStart = null,
  playhead = null,
  sliceCount = 0,
  trimGrips = false,
}) {
  const { context, width, height } = fitToDisplaySize(canvas);
  if (!peaks) return;

  context.strokeStyle = color;
  context.globalAlpha = CENTER_LINE_ALPHA;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
  context.globalAlpha = 1;

  drawSignal(context, peaks, width, height, color);

  if (overflowStart !== null) {
    const start = withinWindow(trim, overflowStart) * width;
    context.fillStyle = OVERFLOW_FILL;
    context.fillRect(start, 0, width - start, height);
    context.fillStyle = overflowPattern(context);
    context.fillRect(start, 0, width - start, height);
    drawVerticalLine(context, start, height, OVERFLOW_STROKE, 1);
  }

  for (let slice = 1; slice < sliceCount; slice += 1) {
    drawVerticalLine(context, (slice / sliceCount) * width, height, SLICE_STROKE, 1);
  }

  drawTrim(context, trim, width, height, trimGrips);

  if (playhead !== null) {
    drawVerticalLine(context, withinWindow(trim, playhead) * width, height, PLAYHEAD_STROKE, 1.5);
  }
}

export function positionFromPointer(canvas, event) {
  const bounds = canvas.getBoundingClientRect();
  return Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
}
