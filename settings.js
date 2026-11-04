// What a player can change about the game itself, kept between sessions.
//
// One setting so far: how big the round touch pads are. The band along the
// bottom of the playfield grows with the pads, and ui/layout.js reads the
// number back so the playfield and the controls always agree.

const KEY = 'shadow-knight-settings';

const DEFAULTS = { padSize: 'medium' };

export const PAD_SIZES = [
  { id: 'small', label: 'SMALL', scale: 0.82 },
  { id: 'medium', label: 'MEDIUM', scale: 1 },
  { id: 'large', label: 'LARGE', scale: 1.22 }
];

let cache = null;

export function loadSettings() {
  if (cache) return cache;

  let stored = {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw) || {};
  } catch (error) {
    stored = {};
  }

  cache = { ...DEFAULTS, ...stored };
  return cache;
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (error) {
    // Storage can be unavailable; the setting still holds for this session.
  }
}

export function padSizeId() {
  const settings = loadSettings();
  const known = PAD_SIZES.some((option) => option.id === settings.padSize);
  return known ? settings.padSize : DEFAULTS.padSize;
}

/// The multiplier the choice stands for: 0.82, 1 or 1.22.
export function padScale() {
  const option = PAD_SIZES.find((entry) => entry.id === padSizeId());
  return option ? option.scale : 1;
}

export function setPadSize(id) {
  if (!PAD_SIZES.some((option) => option.id === id)) return padSizeId();

  const settings = loadSettings();
  settings.padSize = id;
  save();

  return id;
}
