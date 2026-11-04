// Screen geometry shared by the play scene and the HUD scene.
//
// The game is played in a phone-shaped panel whose size can change, so the
// screen is split in two: a playfield on top that the world camera draws into,
// and a band along the bottom reserved for the touch controls. Both scenes read
// their numbers from here so the viewport and the band can never disagree.

export const VIEW = {
  // Never show more than this much world across the playfield, or the ninja
  // becomes a speck on a wide panel.
  maxWidth: 900,
  // The level is this tall in world units, and the camera will not show more
  // than that vertically, so no empty sky band ever appears under the floor.
  levelHeight: 720
};

export function computeLayout(width, height) {
  const band = Math.round(Math.min(Math.max(height * 0.2, 88), 150));
  const playHeight = Math.max(120, height - band);
  return { width, height, band, playWidth: width, playHeight };
}

/// Radius of a round control pad for a band of this height.
export function padRadius(band) {
  return Math.min(Math.max(band * 0.34, 26), 52);
}
