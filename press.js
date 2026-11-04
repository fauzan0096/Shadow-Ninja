// Menu presses straight from the browser.
//
// The game is drawn sideways, so a tap has to be un-turned before it can be
// matched to a button. Rather than depend on Phaser's own pointer hit testing
// for the menus, each menu scene listens for the raw press on the canvas, turns
// it with the same helper the game uses, and checks its own button rectangles.
// A button fires once either way: the two paths are debounced in the scenes.

import { gamePoint } from './orientation.js';

const watched = new WeakSet();

/// Calls `handler(gameX, gameY)` for every press on the game canvas.
export function watchPress(scene, handler) {
  if (watched.has(scene)) return;

  const game = scene.sys.game;
  const canvas = game && game.canvas;
  if (!canvas) return;

  watched.add(scene);

  let last = 0;

  const onDown = (event) => {
    const touch = (event.changedTouches && event.changedTouches[0]) || event;
    const pageX = typeof touch.pageX === 'number' ? touch.pageX : touch.clientX;
    const pageY = typeof touch.pageY === 'number' ? touch.pageY : touch.clientY;

    if (typeof pageX !== 'number' || typeof pageY !== 'number') return;

    // Safari can deliver the pointer and the compatibility mouse event for the
    // same finger; only the first of the pair counts.
    const now = Date.now();
    if (now - last < 40) return;
    last = now;

    const point = gamePoint(game, pageX, pageY);
    handler(point.x, point.y);
  };

  const options = { passive: true };
  canvas.addEventListener(window.PointerEvent ? 'pointerdown' : 'touchstart', onDown, options);
  canvas.addEventListener('mousedown', onDown);

  scene.events.once('shutdown', () => {
    canvas.removeEventListener('pointerdown', onDown, options);
    canvas.removeEventListener('touchstart', onDown, options);
    canvas.removeEventListener('mousedown', onDown);
    watched.delete(scene);
  });
}

/// A rectangle given as { x, y, w, h } with its top left corner.
export function inRect(x, y, rect, pad = 0) {
  if (!rect) return false;

  return (
    x >= rect.x - pad &&
    x <= rect.x + rect.w + pad &&
    y >= rect.y - pad &&
    y <= rect.y + rect.h + pad
  );
}

/// True when the point is inside a round button, with a little slack.
export function inCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;

  return dx * dx + dy * dy <= radius * radius;
}
