import { BANK_IDS, IMPORT_FOLDER_NAME, PADS_PER_BANK } from '../constants.js';
import { bankPath, padPath } from './usb.js';
import { unzipEntries, zipArchive } from './zip.js';

const PRESET_NAME_PREFIX = 'p6-preset-';
const PRESET_EXTENSION = '.zip';
const PAD_ENTRY = /BANK_([A-H])\/PAD_([1-6])\/([^/]+\.WAV)$/i;
const MAC_JUNK = /(^|\/)(__MACOSX\/|\._)/;

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function importTree() {
  return BANK_IDS.flatMap((bankId) => [
    { path: `${IMPORT_FOLDER_NAME}/${bankPath(bankId)}/` },
    ...Array.from(
      { length: PADS_PER_BANK },
      (unused, padIndex) => ({ path: `${IMPORT_FOLDER_NAME}/${padPath(bankId, padIndex)}/` }),
    ),
  ]);
}

export function presetFileName(now) {
  const day = `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
  const time = `${twoDigits(now.getHours())}${twoDigits(now.getMinutes())}`;
  return `${PRESET_NAME_PREFIX}${day}_${time}${PRESET_EXTENSION}`;
}

function padEntries(pad) {
  const folder = `${IMPORT_FOLDER_NAME}/${padPath(pad.bankId, pad.padIndex)}`;
  const sample = { path: `${folder}/${pad.fileName}`, blob: pad.blob };
  if (!pad.settings) return [sample];
  return [sample, { path: `${folder}/${pad.settings.fileName}`, blob: pad.settings.blob }];
}

export function buildPreset(pads, now) {
  return zipArchive([...importTree(), ...pads.flatMap(padEntries)], now);
}

export async function readPreset(archive) {
  const pads = [];
  for (const entry of await unzipEntries(archive)) {
    if (MAC_JUNK.test(entry.path)) continue;
    const match = entry.path.match(PAD_ENTRY);
    if (!match) continue;
    const [, bankId, padNumber, fileName] = match;
    pads.push({
      bankId: bankId.toUpperCase(),
      padIndex: Number(padNumber) - 1,
      file: new File([entry.blob], fileName),
    });
  }
  return pads;
}
