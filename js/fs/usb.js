import {
  BANK_FOLDER_PREFIX,
  BANK_IDS,
  IMPORT_FOLDER_NAME,
  MAX_FILE_NAME_LENGTH,
  PAD_FOLDER_PREFIX,
  PAD_SETTINGS_EXTENSION,
  PADS_PER_BANK,
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

async function existingDirectory(parent, name) {
  try {
    return await parent.getDirectoryHandle(name);
  } catch (error) {
    if (error.name === 'NotFoundError') return null;
    throw error;
  }
}

async function existingPadFolders(importFolder) {
  const found = [];
  for (const bankId of BANK_IDS) {
    const bankFolder = await existingDirectory(importFolder, `${BANK_FOLDER_PREFIX}${bankId}`);
    if (!bankFolder) continue;
    for (let padIndex = 0; padIndex < PADS_PER_BANK; padIndex += 1) {
      const folder = await existingDirectory(bankFolder, `${PAD_FOLDER_PREFIX}${padIndex + 1}`);
      if (folder) found.push({ bankId, padIndex, folder });
    }
  }
  return found;
}

async function padFolder(importFolder, bankId, padIndex) {
  const bankFolder = await importFolder.getDirectoryHandle(`${BANK_FOLDER_PREFIX}${bankId}`, CREATE);
  return bankFolder.getDirectoryHandle(`${PAD_FOLDER_PREFIX}${padIndex + 1}`, CREATE);
}

async function dropPreviousSample(folder) {
  for (const name of await fileNames(folder, isPadFile)) await folder.removeEntry(name);
}

export async function writePads(importFolder, pads, onProgress) {
  for (const [index, pad] of pads.entries()) {
    const folder = await padFolder(importFolder, pad.bankId, pad.padIndex);
    await dropPreviousSample(folder);
    const handle = await folder.getFileHandle(pad.fileName, CREATE);
    const writable = await handle.createWritable();
    await writable.write(pad.blob);
    await writable.close();
    onProgress(index + 1, pads.length, padPath(pad.bankId, pad.padIndex));
  }
}

export async function listPadFiles(importFolder) {
  const locations = [{ folder: importFolder }, ...await existingPadFolders(importFolder)];
  const files = [];
  for (const { folder } of locations) {
    for (const name of await fileNames(folder, isPadFile)) files.push({ folder, name });
  }
  return files;
}

export async function removeFiles(files) {
  for (const file of files) await file.folder.removeEntry(file.name);
}
