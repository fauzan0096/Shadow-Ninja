// The game is built sideways: it always runs in a landscape space, however the
// panel is shaped.
//
// When the panel is taller than it is wide, the canvas is laid out landscape and
// turned a quarter turn with CSS so the game reads as a wide side screen. The
// pointer coordinates are un-turned to match, so a tap lands where it looks like
// it lands.

let rotated = false;

function panelSize() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight;
  return { width, height, portrait: height > width };
}

function styleCanvas(game, portrait, panelWidth, panelHeight) {
  const canvas = game.canvas;
  if (!canvas) return;

  canvas.style.position = 'fixed';
  canvas.style.left = '0px';
  canvas.style.top = '0px';
  canvas.style.margin = '0px';
  canvas.style.maxWidth = 'none';
  canvas.style.maxHeight = 'none';

  if (portrait) {
    // Laid out as a wide screen, then turned to fill the tall panel.
    canvas.style.width = `${panelHeight}px`;
    canvas.style.height = `${panelWidth}px`;
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = 'rotate(90deg) translateY(-100%)';
  } else {
    canvas.style.width = `${panelWidth}px`;
    canvas.style.height = `${panelHeight}px`;
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = 'none';
  }
}

export function isRotated() {
  return rotated;
}

export function applyOrientation(game) {
  if (!game || !game.canvas) return;

  const { width, height, portrait } = panelSize();
  if (!width || !height) return;

  rotated = portrait;

  // The game always thinks in landscape: the long side is the width.
  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);

  game.scale.resize(landscapeWidth, landscapeHeight);
  styleCanvas(game, portrait, width, height);

  // Phaser can rewrite the canvas style as part of the resize; settle it again.
  window.setTimeout(() => styleCanvas(game, portrait, width, height), 0);
}

/// Replaces the pointer transform so taps are un-rotated with the canvas.
function patchInput(game) {
  const manager = game.input && game.input.manager;
  if (!manager || manager.landscapePatched) return;

  manager.landscapePatched = true;
  const original = manager.transformPointer.bind(manager);

  manager.transformPointer = function transformPointer(pointer, pageX, pageY, wasMove) {
    if (!rotated) {
      original(pointer, pageX, pageY, wasMove);
      return;
    }

    const p0 = pointer.position;
    const p1 = pointer.prevPosition;

    p1.x = p0.x;
    p1.y = p0.y;

    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();

    // A quarter turn clockwise: screen x runs down the canvas, screen y runs
    // back along the canvas from its right edge.
    const x = (pageY - rect.top) * (canvas.width / rect.height);
    const y = (rect.width - (pageX - rect.left)) * (canvas.height / rect.width);

    const smooth = pointer.smoothFactor;

    if (!wasMove || smooth === 0) {
      p0.x = x;
      p0.y = y;
    } else {
      p0.x = x * smooth + p1.x * (1 - smooth);
      p0.y = y * smooth + p1.y * (1 - smooth);
    }
  };
}

export function watchOrientation(game) {
  const apply = () => {
    patchInput(game);
    if (game.isBooted) applyOrientation(game);
  };

  if (game.isBooted) apply();
  else game.events.once('ready', apply);

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(apply, 300);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', apply);
  }
}
