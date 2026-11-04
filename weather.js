// Weather per roof. It never changes a level's layout, only how the stone feels
// underfoot and how the air looks: rain makes the ground slick, snow slows the
// ninja a little while it settles, and clear windy nights just send leaves
// across the screen.
//
// The strength of a roof's weather swells and fades over the run, so a storm
// rolls in, eases, and comes back.

const WEATHER_BY_LEVEL = [
  'wind',
  'rain',
  'wind',
  'snow',
  'wind',
  'wind',
  'rain',
  'wind',
  'wind',
  'snow',
  'wind',
  'snow',
  'wind'
];

export function weatherForLevel(levelIndex) {
  return WEATHER_BY_LEVEL[levelIndex] || 'wind';
}

/// 0..1, drifting in and out across the run.
export function weatherIntensity(kind, time) {
  if (!kind || kind === 'none') return 0;

  const wave = Math.sin(time * 0.00042) * 0.5 + Math.sin(time * 0.0011 + 1.7) * 0.25;
  return Math.max(0.15, Math.min(1, 0.6 + wave));
}
