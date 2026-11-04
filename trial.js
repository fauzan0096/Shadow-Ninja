// The daily trial: one roof a day, with a time and a gem target to beat in a
// single run. Hitting both marks pays a purse of gems straight into the stall
// bank, once a day only, and the roof changes with the calendar.
//
// The roof for a day is picked the first time that day is looked at and stored,
// so clearing another roof partway through the day can never move the target.
// The pick is a hash of the date, so every player sees the same trial on the same
// day, and it is nudged away from yesterday's roof so two days never run the same
// trial back to back.

import { LEVELS } from './levels.js';
import { loadProgress, isUnlocked } from './progress.js';

const STORAGE_KEY = 'shadow-ninja-trial';

const EMPTY_RECORD = { day: null, index: null, claimed: false };

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/// A small, stable hash so the day string picks the same roof every time.
function hashDay(key) {
  let hash = 2166136261;

  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash);
}

export function readTrialRecord() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_RECORD };

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { ...EMPTY_RECORD };

    return {
      day: typeof data.day === 'string' ? data.day : null,
      index: Number.isInteger(data.index) ? data.index : null,
      claimed: Boolean(data.claimed)
    };
  } catch (error) {
    return { ...EMPTY_RECORD };
  }
}

function writeTrialRecord(record) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ day: record.day, index: record.index, claimed: record.claimed })
    );
  } catch (error) {
    // Storage unavailable: the day is still playable, it just cannot be claimed.
  }
}

/// The targets and the purse for one roof's trial.
function trialFor(day, index, claimed) {
  const roof = Math.max(0, Math.min(LEVELS.length - 2, index));
  const level = LEVELS[roof];

  // A time that a clean run can beat and a careless one cannot, and seven gems
  // out of every ten on the roof.
  const timeTarget = Math.max(40, Math.round(level.width / 80) + 8);
  const gemTarget = Math.max(1, Math.ceil(level.gems.length * 0.7));
  const reward = 20 + roof * 5;

  return {
    day,
    index: roof,
    name: level.name,
    timeTarget,
    gemTarget,
    reward,
    claimed: Boolean(claimed)
  };
}

/// Which roof today's trial runs on: any roof the player has open, never the
/// warlord's hall.
function pickRoof(day, previousIndex) {
  const progress = loadProgress();
  const open = [];

  for (let index = 0; index < LEVELS.length - 1; index += 1) {
    if (isUnlocked(index, progress.cleared)) open.push(index);
  }

  const pool = open.length ? open : [0];
  const pick = hashDay(day) % pool.length;
  let index = pool[pick];

  if (index === previousIndex && pool.length > 1) {
    index = pool[(pick + 1) % pool.length];
  }

  return index;
}

/// Today's trial, with its roof settled for the rest of the day.
export function todayTrial(date = new Date()) {
  const day = dayKey(date);
  const record = readTrialRecord();

  if (record.day === day && record.index !== null) {
    if (record.index < LEVELS.length - 1) return trialFor(day, record.index, record.claimed);
  }

  const index = pickRoof(day, record.index);
  writeTrialRecord({ day, index, claimed: false });

  return trialFor(day, index, false);
}

/// Marks the day's purse as taken. Returns false when it already was, which is
/// what keeps the reward from being farmed.
export function claimTrial(trial) {
  if (!trial || !trial.day) return false;

  const record = readTrialRecord();
  if (record.day === trial.day && record.claimed) return false;

  writeTrialRecord({ day: trial.day, index: trial.index, claimed: true });
  return true;
}
