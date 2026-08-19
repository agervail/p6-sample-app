import { PITCH_LIMIT_CENTS, PITCH_STEP_CENTS, SAMPLE_RATES } from '../constants.js';
import { formatSeconds } from '../format.js';
import { padMetrics } from '../audio/process.js';
import { drawWaveform, positionFromPointer, waveColor } from './waveform.js';

const EMPTY_LABEL = 'No sample';

function fillRateOptions(select) {
  for (const rate of SAMPLE_RATES) {
    const option = document.createElement('option');
    option.value = String(rate);
    option.textContent = `${rate} Hz`;
    select.append(option);
  }
}

function clampPitch(cents) {
  if (!Number.isFinite(cents)) return 0;
  return Math.max(-PITCH_LIMIT_CENTS, Math.min(PITCH_LIMIT_CENTS, Math.round(cents)));
}

export function createPadView(padIndex, handlers) {
  const template = document.getElementById('pad-template');
  const element = template.content.firstElementChild.cloneNode(true);

  const nameNode = element.querySelector('.pad__name');
  const canvas = element.querySelector('[data-wave]');
  const rateSelect = element.querySelector('[data-rate]');
  const monoInput = element.querySelector('[data-mono]');
  const pitchInput = element.querySelector('[data-pitch]');
  const playButton = element.querySelector('[data-play]');
  const clearButton = element.querySelector('[data-clear]');
  const chopButton = element.querySelector('[data-chop]');

  element.querySelector('.pad__id').textContent = `PAD ${padIndex + 1}`;
  fillRateOptions(rateSelect);
  pitchInput.step = String(PITCH_STEP_CENTS);

  element.addEventListener('pointerdown', () => handlers.onSelect(padIndex));
  element.querySelector('[data-load]').addEventListener('click', () => handlers.onLoad(padIndex));
  playButton.addEventListener('click', () => handlers.onPlay(padIndex, 0));
  clearButton.addEventListener('click', () => handlers.onClear(padIndex));
  chopButton.addEventListener('click', () => handlers.onChop(padIndex));
  canvas.addEventListener('click', (event) => handlers.onPlay(padIndex, positionFromPointer(canvas, event)));

  rateSelect.addEventListener('change', () => handlers.onChange(padIndex, { sampleRate: Number(rateSelect.value) }));
  monoInput.addEventListener('change', () => handlers.onChange(padIndex, { mono: monoInput.checked }));
  pitchInput.addEventListener('change', () => handlers.onChange(padIndex, { pitchCents: clampPitch(Number(pitchInput.value)) }));
  element.querySelector('[data-pitch-reset]').addEventListener('click', () => handlers.onChange(padIndex, { pitchCents: 0 }));
  element.querySelector('[data-pitch-down]').addEventListener('click', () => {
    handlers.onChange(padIndex, { pitchCents: clampPitch(Number(pitchInput.value) - PITCH_STEP_CENTS) });
  });
  element.querySelector('[data-pitch-up]').addEventListener('click', () => {
    handlers.onChange(padIndex, { pitchCents: clampPitch(Number(pitchInput.value) + PITCH_STEP_CENTS) });
  });

  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    element.classList.add('is-dropping');
  });
  element.addEventListener('dragleave', () => element.classList.remove('is-dropping'));
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    element.classList.remove('is-dropping');
    const [file] = event.dataTransfer.files;
    if (file) handlers.onDrop(padIndex, file);
  });

  function update({ pad, forceMono, isSelected, isPlaying, playhead }) {
    const isLoaded = pad.source !== null;
    const metrics = isLoaded ? padMetrics(pad, forceMono) : null;

    element.classList.toggle('is-selected', isSelected);
    element.classList.toggle('is-empty', !isLoaded);
    nameNode.textContent = isLoaded ? pad.name : EMPTY_LABEL;
    nameNode.title = isLoaded ? `${pad.name} — ${formatSeconds(metrics.seconds)}` : '';

    rateSelect.value = String(pad.sampleRate);
    monoInput.checked = pad.mono || forceMono;
    monoInput.disabled = forceMono;
    if (document.activeElement !== pitchInput) pitchInput.value = String(pad.pitchCents);

    playButton.disabled = !isLoaded;
    clearButton.disabled = !isLoaded;
    chopButton.disabled = !isLoaded;
    playButton.classList.toggle('is-playing', isPlaying);

    drawWaveform(canvas, {
      peaks: pad.peaks,
      color: waveColor(isLoaded),
      overflowStart: metrics?.isTruncated ? metrics.maxSeconds / metrics.seconds : null,
      playhead: isPlaying ? playhead : null,
      sliceCount: pad.sliceCount,
    });
  }

  return { element, update };
}
