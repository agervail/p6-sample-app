import {
  BANK_FOLDER_PREFIX,
  IMPORT_FOLDER_NAME,
  MAX_FILE_NAME_LENGTH,
  PAD_FOLDER_PREFIX,
  PAD_SETTINGS_EXTENSION,
  WAV_EXTENSION,
} from '../constants.js';

const READ_WRITE = { mode: 'readwrite' };
const DIACRITICS = /[\u0300-\u036f]/g;
const UNSAFE_CHARACTERS = /[^A-Za-z0-9._-]/g;
const EXTENSION = /\.[^.]+$/;
const CREATE = { create: true };

export function isSupported() {
  return typeof window.showDirectoryPicker === 'function';
}

export function pickDestination() {
  return window.showDirectoryPicker({ id: 'p6-destination', mode: 'readwrite', startIn: 'desktop' });
}

export async function hasPermission(handle) {
  return (await handle.queryPermission(READ_WRITE)) === 'granted';
}

export async function requestPermission(handle) {
  return (await handle.requestPermission(READ_WRITE)) === 'granted';
}

export function importFolder(destination) {
  return destination.getDirectoryHandle(IMPORT_FOLDER_NAME, CREATE);
}

export function bankPath(bankId) {
  return `${BANK_FOLDER_PREFIX}${bankId}`;
}

export function padPath(bankId, padIndex) {
  return `${bankPath(bankId)}/${PAD_FOLDER_PREFIX}${padIndex + 1}`;
}

export function sanitizeFileName(name) {
  return name
    .replace(EXTENSION, '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(UNSAFE_CHARACTERS, '_')
    .slice(0, MAX_FILE_NAME_LENGTH) || 'sample';
}

export function outputFileName(padName) {
  return `${sanitizeFileName(padName)}${WAV_EXTENSION}`;
}

export function settingsFileName(padName) {
  return `${sanitizeFileName(padName)}${PAD_SETTINGS_EXTENSION}`;
}

function hasExtension(name, extension) {
  return name.toUpperCase().endsWith(extension);
}

function isSample(name) {
  return hasExtension(name, WAV_EXTENSION);
}

function isPadFile(name) {
  return isSample(name) || hasExtension(name, PAD_SETTINGS_EXTENSION);
}

async function fileNames(folder, matches) {
  const names = [];
  for await (const [name, handle] of folder.entries()) {
    if (handle.kind === 'file' && matches(name)) names.push(name);
  }
  return names.sort((left, right) => left.localeCompare(right));
}

async function padFolder(importFolder, bankId, padIndex) {
  const bankFolder = await importFolder.getDirectoryHandle(`${BANK_FOLDER_PREFIX}${bankId}`, CREATE);
  return bankFolder.getDirectoryHandle(`${PAD_FOLDER_PREFIX}${padIndex + 1}`, CREATE);
}

async function dropPreviousSample(folder) {
  for (const name of await fileNames(folder, isPadFile)) await folder.removeEntry(name);
}

async function writeFile(folder, name, blob) {
  const handle = await folder.getFileHandle(name, CREATE);
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function writePads(importFolder, pads, onProgress) {
  for (const [index, pad] of pads.entries()) {
    const folder = await padFolder(importFolder, pad.bankId, pad.padIndex);
    await dropPreviousSample(folder);
    await writeFile(folder, pad.fileName, pad.blob);
    if (pad.settings) await writeFile(folder, pad.settings.fileName, pad.settings.blob);
    onProgress(index + 1, pads.length, padPath(pad.bankId, pad.padIndex));
  }
}
