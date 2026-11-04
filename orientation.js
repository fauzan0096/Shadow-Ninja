// The game is built sideways: it always runs in a landscape space, however the
// panel is shaped.
//
// First it asks the phone for a landscape screen. Where the browser allows that
// (`screen.orientation.lock`), the whole screen turns and the game simply fills
// it. Where it does not — iOS never allows it — the canvas itself is laid out
// landscape and turned a quarter turn with CSS, so the game still reads as a
// wide side screen instead of being squeezed into a tall one. The pointer
// coordinates are un-turned to match, so a tap lands where it looks like it
// lands.

let rotated = false;
let styled = false;

function panelSize() {
  const view = window.visualViewport;

  const width = Math.round(
    view && view.width ? view.width : window.innerWidth || document.documentElement.clientWidth
  );
  const height = Math.round(
    view && view.height ? view.height : window.innerHeight || document.documentElement.clientHeight
  );

  return { width, height, portrait: height > width };
}

/// The one place the canvas box is described. A stylesheet rule with
/// `!important` wins over the inline width and height Phaser sets on resize.
function injectStyle() {
  if (styled || !document.head) return;
  styled = true;

  const style = document.createElement('style');
  style.textContent = [
    '#stage canvas {',
    '  position: fixed !important;',
    '  left: 0 !important;',
    '  top: 0 !important;',
    '  margin: 0 !important;',
    '  max-width: none !important;',
    '  max-height: none !important;',
    '  width: var(--game-width, 100%) !important;',
    '  height: var(--game-height, 100%) !important;',
    '  transform-origin: 0 0 !important;',
    '  transform: var(--game-turn, none) !important;',
    '}'
  ].join('\n');

  document.head.appendChild(style);
}

function styleCanvas(turned, cssWidth, cssHeight) {
  const root = document.documentElement.style;
  root.setProperty('--game-width', `${cssWidth}px`);
  root.setProperty('--game-height', `${cssHeight}px`);
  root.setProperty('--game-turn', turned ? 'rotate(90deg) translateY(-100%)' : 'none');
}

export function isRotated() {
  return rotated;
}

/// Asks the phone to turn the whole screen, where the browser supports it.
function lockLandscape() {
  try {
    const orientation = window.screen && window.screen.orientation;
    if (!orientation || typeof orientation.lock !== 'function') return;

    const result = orientation.lock('landscape');
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        // Refused (iOS, or not full screen): the CSS turn covers it below.
      });
    }
  } catch (error) {
    // No orientation lock here; the canvas turn is the fallback.
  }
}

export function applyOrientation(game) {
  if (!game || !game.canvas) return;

  const { width, height, portrait } = panelSize();
  if (!width || !height) return;

  lockLandscape();

  rotated = portrait;

  // The game always thinks in landscape: the long side is the width.
  const landscapeWidth = Math.round(Math.max(width, height));
  const landscapeHeight = Math.round(Math.min(width, height));

  injectStyle();

  const size = game.scale.gameSize;
  if (size.width !== landscapeWidth || size.height !== landscapeHeight) {
    game.scale.resize(landscapeWidth, landscapeHeight);
  }

  // The canvas is always laid out at its landscape size; the CSS turn is what
  // makes it fill a tall panel.
  styleCanvas(portrait, landscapeWidth, landscapeHeight);
}

/// Where a page point falls inside the canvas, undoing the CSS turn.
export function gamePoint(game, pageX, pageY) {
  const canvas = game.canvas;
  const rect = canvas.getBoundingClientRect();

  const cssWidth = canvas.offsetWidth || rect.width || 1;
  const cssHeight = canvas.offsetHeight || rect.height || 1;
  const scaleX = canvas.width / cssWidth;
  const scaleY = canvas.height / cssHeight;

  const computed = window.getComputedStyle(canvas);
  const turn = computed ? computed.transform : 'none';
  const turned = Boolean(turn && turn !== 'none');

  if (turned && typeof DOMMatrixReadOnly === 'function') {
    // The browser's own matrix already holds the turn and its translation, so
    // inverting it is exact. The canvas sits at the page's top left corner.
    const inverse = new DOMMatrixReadOnly(turn).invert();
    const local = inverse.transformPoint({ x: pageX, y: pageY });

    return { x: local.x * scaleX, y: local.y * scaleY };
  }

  if (!turned) {
    return {
      x: (pageX - rect.left) * scaleX,
      y: (pageY - rect.top) * scaleY
    };
  }

  return {
    x: (pageY - rect.top) * (canvas.width / Math.max(1, rect.height)),
    y: (rect.width - (pageX - rect.left)) * (canvas.height / Math.max(1, rect.width))
  };
}

/// Replaces the pointer transform so taps are un-turned with the canvas.
function patchInput(game) {
  const manager =
    game.input && typeof game.input.transformPointer === 'function'
      ? game.input
      : game.input && game.input.manager;

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

    const point = gamePoint(game, pageX, pageY);
    const smooth = pointer.smoothFactor;

    if (!wasMove || smooth === 0) {
      p0.x = point.x;
      p0.y = point.y;
    } else {
      p0.x = point.x * smooth + p1.x * (1 - smooth);
      p0.y = point.y * smooth + p1.y * (1 - smooth);
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

  // The manager only exists once the game has booted; these catch it whatever
  // order the boot and the ready event arrive in.
  window.setTimeout(apply, 60);
  window.setTimeout(apply, 400);

  // Phaser rewrites the canvas box whenever it resizes; the turn is settled
  // again right after, so the sideways layout never comes loose.
  if (game.scale) {
    game.scale.on('resize', () => {
      if (!rotated || !game.canvas) return;
      styleCanvas(true, game.scale.gameSize.width, game.scale.gameSize.height);
    });
  }

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(apply, 300);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', apply);
  }
}
