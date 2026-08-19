let context = null;
let activeSource = null;
let activePadIndex = null;
let startedAt = 0;
let activeDuration = 0;

function audioContext() {
  context ??= new AudioContext();
  return context;
}

export function stop() {
  if (!activeSource) return;
  activeSource.onended = null;
  activeSource.stop();
  activeSource = null;
  activePadIndex = null;
}

export function playingPadIndex() {
  return activePadIndex;
}

export function progress() {
  if (activePadIndex === null) return null;
  return Math.min(1, (audioContext().currentTime - startedAt) / activeDuration);
}

export async function play(padIndex, channels, sampleRate, offsetRatio, onEnded) {
  stop();
  const engine = audioContext();
  await engine.resume();

  const buffer = engine.createBuffer(channels.length, channels[0].length, sampleRate);
  channels.forEach((channel, index) => buffer.copyToChannel(channel, index));

  const source = engine.createBufferSource();
  source.buffer = buffer;
  source.connect(engine.destination);
  source.onended = () => {
    if (activeSource !== source) return;
    activeSource = null;
    activePadIndex = null;
    onEnded();
  };

  const offsetSeconds = buffer.duration * offsetRatio;
  activeSource = source;
  activePadIndex = padIndex;
  startedAt = engine.currentTime - offsetSeconds;
  activeDuration = buffer.duration;
  source.start(0, offsetSeconds);
}
