export const BANK_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const PADS_PER_BANK = 6;

export const SAMPLE_RATES = [44100, 22050, 14700, 11025];
export const DEFAULT_SAMPLE_RATE = 44100;
export const BYTES_PER_FRAME_PER_CHANNEL = 2;
export const MAX_PAD_BYTES = 512 * 1024;

export const CENTS_PER_OCTAVE = 1200;
export const PITCH_STEP_CENTS = 10;
export const PITCH_LIMIT_CENTS = 1200;

export const WAVEFORM_BUCKETS = 1400;
export const TRIM_GRAB_PIXELS = 9;
export const TRIM_MIN_SPAN_RATIO = 0.005;

export const IMPORT_FOLDER_NAME = 'IMPORT';
export const BANK_FOLDER_PREFIX = 'BANK_';
export const PAD_FOLDER_PREFIX = 'PAD_';
export const WAV_EXTENSION = '.WAV';
export const PAD_SETTINGS_EXTENSION = '.PRM';
export const MAX_FILE_NAME_LENGTH = 48;

export const CHOP_SLICE_COUNTS = [2, 4, 8, 16];
export const CHOP_ENVELOPE_HOP_MS = 10;
export const CHOP_ONSET_RISE_FACTOR = 2.2;
export const CHOP_MIN_SLICE_MS = 60;
