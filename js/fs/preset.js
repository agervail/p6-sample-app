import { BANK_IDS, IMPORT_FOLDER_NAME, PADS_PER_BANK, WAV_EXTENSION } from '../constants.js';
import { readChop } from './padSettings.js';
import { bankPath, padPath } from './usb.js';
import { unzipEntries, zipArchive } from './zip.js';

const PRESET_NAME_PREFIX = 'p6-preset-';
const PRESET_EXTENSION = '.zip';
const PAD_ENTRY = /BANK_([A-H])\/PAD_([1-6])\/([^/]+)(\.WAV|\.PRM)$/i;
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
  const samples = new Map();
  const chops = new Map();

  for (const entry of await unzipEntries(archive)) {
    if (MAC_JUNK.test(entry.path)) continue;
    const match = entry.path.match(PAD_ENTRY);
    if (!match) continue;
    const [, bankId, padNumber, baseName, extension] = match;
    const pad = `${bankId.toUpperCase()}/${padNumber}/${baseName.toUpperCase()}`;
    if (extension.toUpperCase() === WAV_EXTENSION) {
      samples.set(pad, {
        bankId: bankId.toUpperCase(),
        padIndex: Number(padNumber) - 1,
        file: new File([entry.blob], `${baseName}${extension}`),
      });
    } else {
      chops.set(pad, readChop(await entry.blob.text()));
    }
  }

  return [...samples].map(([pad, sample]) => ({ ...sample, sliceCount: chops.get(pad) ?? 0 }));
}
