// Saved progress, kept in localStorage so it survives closing the game and works
// with no network at all. An in-memory copy is kept too, so a device that refuses
// storage still remembers the session it is in.
//
// It holds the cleared roofs, the best run on each of them (fastest time, most
// gems), the gems banked for the stall, the three upgrades bought there, and the
// best endless run.

const STORAGE_KEY = 'shadow-ninja-progress';

export const MAX_UPGRADE_LEVEL = 3;
export const UPGRADE_PRICES = [20, 40, 60];

let cache = null;

function emptyProgress() {
  return {
    cleared: [],
    records: {},
    gems: 0,
    upgrades: { lives: 0, dash: 0, reach: 0 },
    hero: 'ninja',
    endless: { score: 0, roofs: 0, metres: 0 }
  };
}

function clampLevel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(number)));
}

function cloneProgress(progress) {
  const records = {};
  Object.keys(progress.records).forEach((key) => {
    records[key] = {
      time: progress.records[key].time,
      gems: progress.records[key].gems,
      deaths: progress.records[key].deaths || 0
    };
  });

  return {
    cleared: [...progress.cleared],
    records,
    gems: progress.gems,
    upgrades: { ...progress.upgrades },
    hero: progress.hero,
    endless: { ...(progress.endless || { score: 0, roofs: 0, metres: 0 }) }
  };
}

function parseProgress(raw) {
  const progress = emptyProgress();
  if (!raw) return progress;

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    return progress;
  }

  if (!data || typeof data !== 'object') return progress;

  if (Array.isArray(data.cleared)) {
    progress.cleared = data.cleared.filter((index) => Number.isInteger(index));
  }
  if (data.records && typeof data.records === 'object') {
    progress.records = data.records;
  }

  progress.gems = Math.max(0, Math.floor(Number(data.gems) || 0));

  const upgrades = data.upgrades || {};
  progress.upgrades.lives = clampLevel(upgrades.lives);
  progress.upgrades.dash = clampLevel(upgrades.dash);
  progress.upgrades.reach = clampLevel(upgrades.reach);

  progress.hero = data.hero === 'kunoichi' ? 'kunoichi' : 'ninja';

  const endless = data.endless || {};
  progress.endless = {
    score: Math.max(0, Math.floor(Number(endless.score) || 0)),
    roofs: Math.max(0, Math.floor(Number(endless.roofs) || 0)),
    metres: Math.max(0, Math.floor(Number(endless.metres) || 0))
  };

  return progress;
}

function persist() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cleared: cache.cleared,
        records: cache.records,
        gems: cache.gems,
        upgrades: cache.upgrades,
        hero: cache.hero,
        endless: cache.endless
      })
    );
  } catch (error) {
    // Storage unavailable: this session still counts.
  }
}

export function loadProgress() {
  if (cache) return cloneProgress(cache);

  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    raw = null;
  }

  cache = parseProgress(raw);
  return cloneProgress(cache);
}

/// Records a finished level. Returns the whole updated list.
export function markCleared(index) {
  const progress = loadProgress();

  if (!progress.cleared.includes(index)) {
    progress.cleared.push(index);
    progress.cleared.sort((a, b) => a - b);
    cache = progress;
    persist();
  }

  return cloneProgress(progress);
}

/// Files a finished run against the level's best, keeping the fastest time, the
/// highest gem count, and the deaths of the run that set that time.
export function recordRun(index, run) {
  const progress = loadProgress();
  const key = String(index);
  const previous = progress.records[key] || null;

  const faster = !previous || run.time < previous.time;
  const time = faster ? run.time : previous.time;
  const gems = previous ? Math.max(previous.gems, run.gems) : run.gems;
  const deaths = faster
    ? Math.max(0, Math.floor(Number(run.deaths) || 0))
    : Math.max(0, Math.floor(Number(previous.deaths) || 0));

  progress.records[key] = { time, gems, deaths };
  cache = progress;
  persist();

  return {
    time,
    gems,
    deaths,
    newTime: faster,
    newGems: !previous || run.gems > previous.gems
  };
}

/// Puts a collected gem into the bank the stall spends from.
export function addGems(count) {
  const progress = loadProgress();
  progress.gems = Math.max(0, progress.gems + Math.floor(count));
  cache = progress;
  persist();
  return progress.gems;
}

/// Buys the next level of an upgrade. Returns the updated progress, or null when
/// it is already maxed or there are not enough gems.
export function buyUpgrade(key) {
  const progress = loadProgress();
  const level = progress.upgrades[key];

  if (level === undefined || level >= MAX_UPGRADE_LEVEL) return null;

  const cost = UPGRADE_PRICES[level];
  if (progress.gems < cost) return null;

  progress.gems -= cost;
  progress.upgrades[key] = level + 1;
  cache = progress;
  persist();

  return cloneProgress(progress);
}

/// Chooses the fighter for the next run.
export function setHero(hero) {
  const progress = loadProgress();
  progress.hero = hero === 'kunoichi' ? 'kunoichi' : 'ninja';
  cache = progress;
  persist();
  return cloneProgress(progress);
}

/// Files an endless run against the best one, keeping the higher score.
export function recordEndless(run) {
  const progress = loadProgress();
  const score = Math.max(0, Math.floor(Number(run.score) || 0));
  const isBest = score > progress.endless.score;

  if (isBest) {
    progress.endless = {
      score,
      roofs: Math.max(0, Math.floor(Number(run.roofs) || 0)),
      metres: Math.max(0, Math.floor(Number(run.metres) || 0))
    };
    cache = progress;
    persist();
  }

  return { ...progress.endless, isBest };
}

/// Wipes everything: cleared roofs, every best record, the bank and upgrades.
export function resetProgress() {
  cache = emptyProgress();
  persist();
  return cloneProgress(cache);
}

/// The first level is always open; every other one needs the one before it.
export function isUnlocked(index, cleared) {
  if (index <= 0) return true;
  return cleared.includes(index - 1);
}
