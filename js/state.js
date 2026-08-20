import { BANK_IDS, PADS_PER_BANK, DEFAULT_SAMPLE_RATE } from './constants.js';

const HISTORY_LIMIT = 40;

function createPad() {
  return {
    name: '',
    source: null,
    peaks: null,
    sampleRate: DEFAULT_SAMPLE_RATE,
    mono: false,
    trimStart: 0,
    trimEnd: 1,
    sliceCount: 0,
  };
}

function createBank() {
  return { forceMono: false, pads: Array.from({ length: PADS_PER_BANK }, createPad) };
}

function copyBanks(banks) {
  const copy = {};
  for (const bankId of BANK_IDS) {
    copy[bankId] = {
      forceMono: banks[bankId].forceMono,
      pads: banks[bankId].pads.map((pad) => ({ ...pad })),
    };
  }
  return copy;
}

const state = {
  currentBankId: BANK_IDS[0],
  selectedPadIndex: 0,
  banks: Object.fromEntries(BANK_IDS.map((bankId) => [bankId, createBank()])),
};

const listeners = new Set();
const undoStack = [];
const redoStack = [];

function notify() {
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(state);
}

export function getState() {
  return state;
}

export function currentBank() {
  return state.banks[state.currentBankId];
}

export function currentPad() {
  return currentBank().pads[state.selectedPadIndex];
}

export function isPadLoaded(pad) {
  return pad.source !== null;
}

function commit(mutate) {
  undoStack.push(copyBanks(state.banks));
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  mutate(state.banks);
  notify();
}

export function editPad(padIndex, changes) {
  commit((banks) => Object.assign(banks[state.currentBankId].pads[padIndex], changes));
}

export function continuePadEdit(padIndex, changes) {
  Object.assign(state.banks[state.currentBankId].pads[padIndex], changes);
  notify();
}

export function loadPad(padIndex, sample) {
  editPad(padIndex, {
    name: sample.name,
    source: sample.source,
    peaks: sample.peaks,
    sliceCount: sample.sliceCount ?? 0,
    trimStart: 0,
    trimEnd: 1,
  });
}

export function resetPad(padIndex) {
  commit((banks) => {
    banks[state.currentBankId].pads[padIndex] = createPad();
  });
}

export function setForceMono(forceMono) {
  commit((banks) => {
    banks[state.currentBankId].forceMono = forceMono;
  });
}

export function clearCurrentBank() {
  commit((banks) => {
    banks[state.currentBankId] = createBank();
  });
}

export function replaceAllBanks(loadedPadsByBank) {
  commit((banks) => {
    for (const bankId of BANK_IDS) {
      banks[bankId] = createBank();
      for (const [padIndex, sample] of loadedPadsByBank[bankId] ?? []) {
        Object.assign(banks[bankId].pads[padIndex], {
          name: sample.name,
          source: sample.source,
          peaks: sample.peaks,
          sampleRate: sample.source.sampleRate,
          mono: sample.source.channels.length === 1,
          sliceCount: sample.sliceCount ?? 0,
        });
      }
    }
  });
}

export function selectBank(bankId) {
  state.currentBankId = bankId;
  state.selectedPadIndex = 0;
  notify();
}

export function selectPad(padIndex) {
  state.selectedPadIndex = padIndex;
  notify();
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}

export function undo() {
  if (!canUndo()) return;
  redoStack.push(copyBanks(state.banks));
  state.banks = undoStack.pop();
  notify();
}

export function redo() {
  if (!canRedo()) return;
  undoStack.push(copyBanks(state.banks));
  state.banks = redoStack.pop();
  notify();
}
