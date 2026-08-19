import { IMPORT_FOLDER_NAME, MAX_FILE_NAME_LENGTH, WAV_EXTENSION } from '../constants.js';

const READ_WRITE = { mode: 'readwrite' };
const DIACRITICS = /[\u0300-\u036f]/g;
const UNSAFE_CHARACTERS = /[^A-Za-z0-9._-]/g;
const EXTENSION = /\.[^.]+$/;
const PAD_PREFIX = /^([A-D])([1-6])_/i;

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
  return destination.getDirectoryHandle(IMPORT_FOLDER_NAME, { create: true });
}

export function sanitizeFileName(name) {
  return name
    .replace(EXTENSION, '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(UNSAFE_CHARACTERS, '_')
    .slice(0, MAX_FILE_NAME_LENGTH) || 'sample';
}

export function outputFileName(bankId, padIndex, padName, taken) {
  const base = `${bankId}${padIndex + 1}_${sanitizeFileName(padName)}`;
  let candidate = base;
  let duplicate = 2;
  while (taken.has(`${candidate}${WAV_EXTENSION}`)) {
    candidate = `${base}_${duplicate}`;
    duplicate += 1;
  }
  const fileName = `${candidate}${WAV_EXTENSION}`;
  taken.add(fileName);
  return fileName;
}

export function parsePadPrefix(fileName) {
  const match = fileName.match(PAD_PREFIX);
  if (!match) return null;
  return { bankId: match[1].toUpperCase(), padIndex: Number(match[2]) - 1 };
}

export async function listWavFiles(folder) {
  const files = [];
  for await (const [name, handle] of folder.entries()) {
    if (handle.kind !== 'file' || !name.toLowerCase().endsWith(WAV_EXTENSION)) continue;
    files.push({ name, handle });
  }
  return files.sort((left, right) => left.name.localeCompare(right.name));
}

export async function writeSequentially(folder, files, onProgress) {
  for (const [index, file] of files.entries()) {
    const handle = await folder.getFileHandle(file.name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file.blob);
    await writable.close();
    onProgress(index + 1, files.length, file.name);
  }
}

export async function removeFiles(folder, names) {
  for (const name of names) await folder.removeEntry(name);
}
