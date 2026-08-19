const LOCAL_SIGNATURE = 0x04034b50;
const DIRECTORY_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const DIRECTORY_ENTRY_SIZE = 46;
const END_RECORD_SIZE = 22;
const DEFLATED = 8;
const MAX_END_RECORD_SEARCH = END_RECORD_SIZE + 0xffff;
const VERSION = 20;
const STORED = 0;
const MS_DOS_DIRECTORY = 0x10;
const DOS_EPOCH_YEAR = 1980;
const EMPTY = new Uint8Array(0);
const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < table.length; byte += 1) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit += 1) {
      remainder = remainder & 1 ? 0xedb88320 ^ (remainder >>> 1) : remainder >>> 1;
    }
    table[byte] = remainder >>> 0;
  }
  return table;
}

function crc32(bytes) {
  let remainder = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    remainder = CRC_TABLE[(remainder ^ bytes[index]) & 0xff] ^ (remainder >>> 8);
  }
  return (remainder ^ 0xffffffff) >>> 0;
}

function dosStamp(date) {
  return {
    time: (Math.floor(date.getSeconds() / 2)) | (date.getMinutes() << 5) | (date.getHours() << 11),
    date: date.getDate() | ((date.getMonth() + 1) << 5) | ((date.getFullYear() - DOS_EPOCH_YEAR) << 9),
  };
}

function localHeader(name, bytes, crc, stamp) {
  const header = new DataView(new ArrayBuffer(LOCAL_HEADER_SIZE));
  header.setUint32(0, LOCAL_SIGNATURE, true);
  header.setUint16(4, VERSION, true);
  header.setUint16(8, STORED, true);
  header.setUint16(10, stamp.time, true);
  header.setUint16(12, stamp.date, true);
  header.setUint32(14, crc, true);
  header.setUint32(18, bytes.length, true);
  header.setUint32(22, bytes.length, true);
  header.setUint16(26, name.length, true);
  return new Uint8Array(header.buffer);
}

function directoryEntry(name, bytes, crc, stamp, offset, isFolder) {
  const entry = new DataView(new ArrayBuffer(DIRECTORY_ENTRY_SIZE));
  entry.setUint32(0, DIRECTORY_SIGNATURE, true);
  entry.setUint16(4, VERSION, true);
  entry.setUint16(6, VERSION, true);
  entry.setUint16(10, STORED, true);
  entry.setUint16(12, stamp.time, true);
  entry.setUint16(14, stamp.date, true);
  entry.setUint32(16, crc, true);
  entry.setUint32(20, bytes.length, true);
  entry.setUint32(24, bytes.length, true);
  entry.setUint16(28, name.length, true);
  entry.setUint32(38, isFolder ? MS_DOS_DIRECTORY : 0, true);
  entry.setUint32(42, offset, true);
  return new Uint8Array(entry.buffer);
}

function endRecord(count, directorySize, directoryOffset) {
  const record = new DataView(new ArrayBuffer(END_RECORD_SIZE));
  record.setUint32(0, END_SIGNATURE, true);
  record.setUint16(8, count, true);
  record.setUint16(10, count, true);
  record.setUint32(12, directorySize, true);
  record.setUint32(16, directoryOffset, true);
  return new Uint8Array(record.buffer);
}

export async function zipArchive(files, modifiedAt) {
  const encoder = new TextEncoder();
  const stamp = dosStamp(modifiedAt);
  const body = [];
  const directory = [];
  let offset = 0;
  let directorySize = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const bytes = file.blob ? new Uint8Array(await file.blob.arrayBuffer()) : EMPTY;
    const crc = crc32(bytes);
    body.push(localHeader(name, bytes, crc, stamp), name, bytes);
    directory.push(directoryEntry(name, bytes, crc, stamp, offset, file.path.endsWith('/')), name);
    offset += LOCAL_HEADER_SIZE + name.length + bytes.length;
    directorySize += DIRECTORY_ENTRY_SIZE + name.length;
  }

  return new Blob([...body, ...directory, endRecord(files.length, directorySize, offset)], { type: 'application/zip' });
}

function findEndRecord(view) {
  const earliest = Math.max(0, view.byteLength - MAX_END_RECORD_SEARCH);
  for (let offset = view.byteLength - END_RECORD_SIZE; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === END_SIGNATURE) return offset;
  }
  throw new Error('This file is not a ZIP archive');
}

function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).blob();
}

async function entryBlob(path, bytes, method) {
  if (method === STORED) return new Blob([bytes]);
  if (method === DEFLATED) return inflate(bytes);
  throw new Error(`Unsupported compression in ${path}`);
}

export async function unzipEntries(archive) {
  const bytes = new Uint8Array(await archive.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const end = findEndRecord(view);
  const decoder = new TextDecoder();
  const count = view.getUint16(end + 10, true);
  const entries = [];
  let cursor = view.getUint32(end + 16, true);

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== DIRECTORY_SIGNATURE) throw new Error('Damaged ZIP directory');
    const method = view.getUint16(cursor + 10, true);
    const storedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += DIRECTORY_ENTRY_SIZE + nameLength + extraLength + commentLength;
    if (path.endsWith('/')) continue;
    const dataStart = localOffset + LOCAL_HEADER_SIZE
      + view.getUint16(localOffset + 26, true)
      + view.getUint16(localOffset + 28, true);
    entries.push({ path, blob: await entryBlob(path, bytes.subarray(dataStart, dataStart + storedSize), method) });
  }
  return entries;
}
