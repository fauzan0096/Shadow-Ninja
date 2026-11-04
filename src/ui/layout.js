// Screen geometry shared by the play scene and the HUD scene.
//
// The game follows the shape of the panel, so the screen is split in two: a
// playfield at the top that the world camera draws into, and a band along the
// bottom reserved for the touch controls. Both scenes read their numbers from
// here so the viewport and the band can never disagree, and the phone's own safe
// areas — the notch and the home gesture — are kept clear of both.

import { padScale } from './settings.js';

export const VIEW = {
  // Never show more than this much world across the playfield, or the ninja
  // becomes a speck on a wide panel.
  maxWidth: 900,
  // The level is this tall in world units, and the camera will not show more
  // than that vertically, so no empty sky band ever appears under the floor.
  levelHeight: 720
};

function cssPixels(name, fallback) {
  if (typeof window === 'undefined' || !window.getComputedStyle) return fallback;

  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);

  return Number.isFinite(value) ? value : fallback;
}

/// The space the notch and the home gesture take, in pixels.
export function safeInsets() {
  return {
    top: cssPixels('--safe-top', 0),
    bottom: cssPixels('--safe-bottom', 0)
  };
}

export function computeLayout(width, height) {
  const insets = safeInsets();
  const room = Math.max(180, height - insets.top - insets.bottom);

  // The band follows the size of pad the player chose: large pads are given
  // more room and small ones hand the space back to the rooftops.
  const base = Math.min(Math.max(room * 0.2, 92), 176);
  const band = Math.round(Math.min(base * padScale(), room * 0.34));
  const playHeight = Math.max(120, height - band - insets.bottom);

  return {
    width,
    height,
    band,
    playWidth: width,
    playHeight,
    bandTop: playHeight,
    insets
  };
}

/// Radius of a round control pad for a band of this height.
export function padRadius(band) {
  return Math.min(Math.max(band * 0.34, 26), 52);
}
