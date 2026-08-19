import { BANK_IDS, P6_CHOP_VALUES, PADS_PER_BANK } from '../constants.js';

const ASSIGNMENT = '\t= ';
const LINE_END = '\n';
const NO_CHOP = P6_CHOP_VALUES[0];

const PAD_FIELDS = new Map([
  ['PHRASE', null],
  ['GATE', 0],
  ['LOOP', 0],
  ['REVERSE', 0],
  ['START_POS', 0],
  ['SIZE', null],
  ['LOOP_SIZE', null],
  ['C.TUNE', 0],
  ['F.TUNE', 0],
  ['DETUNE', 0],
  ['LO-FI_SW', 0],
  ['LO-FI', 70],
  ['ENV_MODE', 4],
  ['PENV_MODE', 1],
  ['PENV_ATTACK', 0],
  ['PENV_DECAY', 20],
  ['PENV_SUSTAIN', 255],
  ['PENV_RELEASE', 25],
  ['PENV_TIME_KEYF', 255],
  ['PENV_VELO_SENS', 0],
  ['PENV_DEPTH', 0],
  ['TENV_MODE', 1],
  ['TENV_ATTACK', 3],
  ['TENV_DECAY', 0],
  ['TENV_SUSTAIN', 255],
  ['TENV_RELEASE', 3],
  ['TENV_TIME_KEYF', 255],
  ['TVF_TYPE', 0],
  ['TVF_CUTOFF', 255],
  ['TVF_RESO', 0],
  ['TVF_KEYF', 255],
  ['TVF_VELO_SENS', 0],
  ['TVF_ENV_DEPTH', 0],
  ['TVA_SW', 1],
  ['LEVEL', 100],
  ['PAN_MODE', 0],
  ['PAN', 64],
  ['OUTPUT_SEL', 2],
  ['SEND_DELAY', 0],
  ['SEND_REVERB', 0],
  ['TM_STR_MODE', 0],
  ['TM_STR_WINDOW', 30],
  ['TM_STR_SPEED', 100],
  ['MONO_POLY', 0],
  ['CHOP', null],
  ['MUTE_GROUP', 0],
  ['PRM1', 0],
  ['PRM2', 0],
  ['PRM3', 0],
  ['PRM4', 0],
  ['PRM5', 0],
  ['PRM6', 0],
  ['PRM7', 0],
  ['PRM8', 0],
  ['PRM9', 0],
  ['PRM10', 0],
  ['PRM11', 0],
  ['PRM12', 0],
  ['PRM13', 0],
  ['PRM14', 0],
  ['PRM15', 0],
  ['PRM16', 0],
]);

export function isChopped(sliceCount) {
  return sliceCount > NO_CHOP;
}

export function isChopValue(sliceCount) {
  return P6_CHOP_VALUES.includes(sliceCount);
}

function phraseIndex(bankId, padIndex) {
  return BANK_IDS.indexOf(bankId) * PADS_PER_BANK + padIndex;
}

export function padSettings({ bankId, padIndex, frames, sliceCount }) {
  const written = new Map(PAD_FIELDS);
  written.set('PHRASE', phraseIndex(bankId, padIndex));
  written.set('SIZE', frames);
  written.set('LOOP_SIZE', frames);
  written.set('CHOP', sliceCount);
  const lines = [...written].map(([key, value]) => `${key}${ASSIGNMENT}${value}`);
  return new Blob([`${lines.join(LINE_END)}${LINE_END}`], { type: 'text/plain' });
}
