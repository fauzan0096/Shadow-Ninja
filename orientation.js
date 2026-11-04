// The game follows the panel: it is laid out in whatever shape the screen is —
// upright on a phone held in portrait, wide when the phone is turned.
//
// Nothing is rotated with CSS: a turned canvas confuses the pointer hit test on
// this runtime, which leaves every button dead, so the canvas always fills the
// panel exactly as it is. Turn the phone and the web view turns with it, and the
// game lays itself out again on the resize.

let styled = false;

function panelSize() {
  const view = window.visualViewport;

  const width = Math.round(
    view && view.width ? view.width : window.innerWidth || document.documentElement.clientWidth
  );
  const height = Math.round(
    view && view.height ? view.height : window.innerHeight || document.documentElement.clientHeight
  );

  return { width, height };
}

/// The one place the canvas box is described. It is pinned to the panel's top
/// left so Phaser's own inline sizing cannot leave a letterboxed strip behind.
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
    '  transform: none !important;',
    '}'
  ].join('\n');

  document.head.appendChild(style);
}

function styleCanvas(width, height) {
  const root = document.documentElement.style;
  root.setProperty('--game-width', `${width}px`);
  root.setProperty('--game-height', `${height}px`);
}

/// Makes the game exactly the size of the panel, whichever way up it is.
export function applyOrientation(game) {
  if (!game || !game.canvas) return;

  const { width, height } = panelSize();
  if (!width || !height) return;

  injectStyle();

  const size = game.scale.gameSize;
  if (size.width !== width || size.height !== height) {
    game.scale.resize(width, height);
  }

  styleCanvas(width, height);
}

/// Where a page point falls inside the canvas.
export function gamePoint(game, pageX, pageY) {
  const canvas = game.canvas;
  const rect = canvas.getBoundingClientRect();

  const cssWidth = canvas.offsetWidth || rect.width || 1;
  const cssHeight = canvas.offsetHeight || rect.height || 1;

  const scaleX = canvas.width / cssWidth;
  const scaleY = canvas.height / cssHeight;

  return {
    x: (pageX - rect.left) * scaleX,
    y: (pageY - rect.top) * scaleY
  };
}

export function watchOrientation(game) {
  const apply = () => {
    if (game.isBooted) applyOrientation(game);
  };

  if (game.isBooted) apply();
  else game.events.once('ready', apply);

  // The game only has a canvas once it has booted; these catch it whatever
  // order the boot and the ready event arrive in.
  window.setTimeout(apply, 60);
  window.setTimeout(apply, 400);

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(apply, 250);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', apply);
  }
}
