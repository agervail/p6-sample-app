const HATCH_SIZE = 7;
const CENTER_LINE_ALPHA = 0.3;
const SIGNAL_COLOR = '#4D8DFD';
const DIMMED_COLOR = '#39414F';
const OVERFLOW_FILL = 'rgba(229, 84, 75, 0.16)';
const OVERFLOW_STROKE = 'rgba(229, 84, 75, 0.55)';
const SLICE_STROKE = 'rgba(224, 165, 58, 0.55)';
const PLAYHEAD_STROKE = '#E8EAED';

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

export function drawWaveform(canvas, { peaks, color, overflowStart = null, playhead = null, sliceCount = 0 }) {
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
    const start = overflowStart * width;
    context.fillStyle = OVERFLOW_FILL;
    context.fillRect(start, 0, width - start, height);
    context.fillStyle = overflowPattern(context);
    context.fillRect(start, 0, width - start, height);
    drawVerticalLine(context, start, height, OVERFLOW_STROKE, 1);
  }

  for (let slice = 1; slice < sliceCount; slice += 1) {
    drawVerticalLine(context, (slice / sliceCount) * width, height, SLICE_STROKE, 1);
  }

  if (playhead !== null) {
    drawVerticalLine(context, playhead * width, height, PLAYHEAD_STROKE, 1.5);
  }
}

export function positionFromPointer(canvas, event) {
  const bounds = canvas.getBoundingClientRect();
  return Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
}
