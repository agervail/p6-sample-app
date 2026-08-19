import { TRIM_GRAB_PIXELS, TRIM_MIN_SPAN_RATIO } from '../constants.js';
import { positionFromPointer } from './waveform.js';

const START_EDGE = 'start';
const END_EDGE = 'end';

function edgeUnderPointer(canvas, event, trim) {
  const bounds = canvas.getBoundingClientRect();
  const pointerX = event.clientX - bounds.left;
  const toStart = Math.abs(trim.start * bounds.width - pointerX);
  const toEnd = Math.abs(trim.end * bounds.width - pointerX);
  if (Math.min(toStart, toEnd) > TRIM_GRAB_PIXELS) return null;
  return toStart <= toEnd ? START_EDGE : END_EDGE;
}

function edgeMovedTo(edge, trim, ratio) {
  if (edge === START_EDGE) {
    return { start: Math.min(ratio, trim.end - TRIM_MIN_SPAN_RATIO), end: trim.end };
  }
  return { start: trim.start, end: Math.max(ratio, trim.start + TRIM_MIN_SPAN_RATIO) };
}

export function createTrimControl(canvas, { trimOf, onTrimBegin, onTrimContinue, onScrub }) {
  let draggedEdge = null;
  let hasMoved = false;

  function dragTo(event) {
    const trim = edgeMovedTo(draggedEdge, trimOf(), positionFromPointer(canvas, event));
    if (hasMoved) onTrimContinue(trim);
    else onTrimBegin(trim);
    hasMoved = true;
  }

  canvas.addEventListener('pointerdown', (event) => {
    hasMoved = false;
    const trim = trimOf();
    if (!trim) return;
    draggedEdge = edgeUnderPointer(canvas, event, trim);
    if (!draggedEdge) return;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (draggedEdge) {
      dragTo(event);
      return;
    }
    const trim = trimOf();
    canvas.style.cursor = trim && edgeUnderPointer(canvas, event, trim) ? 'ew-resize' : '';
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!draggedEdge) return;
    canvas.releasePointerCapture(event.pointerId);
    draggedEdge = null;
  });

  canvas.addEventListener('click', (event) => {
    if (hasMoved) return;
    onScrub(positionFromPointer(canvas, event));
  });
}
