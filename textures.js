// The non-character art: stone, spikes, the exit door, the night sky, lanterns,
// the slash arc and the round control pads. All of it is painted onto canvas
// textures when the level starts, so the game carries no image files and works
// completely offline.

function canvasOf(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeStone(scene) {
  if (scene.textures.exists('stone')) return;
  const size = 64;
  const canvas = canvasOf(size, size);
  const ctx = canvas.getContext('2d');

  // Deep red-black rock, lit softly from above.
  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, '#1a070c');
  base.addColorStop(1, '#0a0305');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Two courses of rounded blocks with their own subtle shading.
  for (let row = 0; row < 2; row += 1) {
    const y = row * 32;
    const offset = row === 0 ? 0 : 16;

    for (let bx = -32; bx < size; bx += 32) {
      const x = bx + offset;

      const shade = ctx.createLinearGradient(x, y, x, y + 30);
      shade.addColorStop(0, 'rgba(96,26,42,0.55)');
      shade.addColorStop(1, 'rgba(16,6,9,0.7)');

      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, 28, 28, 5);
      ctx.fill();

      // Soft lit edge on every block.
      ctx.strokeStyle = 'rgba(255,120,130,0.13)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, 28, 28, 5);
      ctx.stroke();
    }
  }

  // A few darker pits so the stone is not perfectly flat.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 14; i += 1) {
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  scene.textures.addCanvas('stone', canvas);
}

function makeSpike(scene) {
  if (scene.textures.exists('spike')) return;
  const canvas = canvasOf(52, 22);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#171122';
  ctx.fillRect(0, 17, 52, 5);

  for (let i = 0; i < 3; i += 1) {
    const x = 3 + i * 16;
    const gradient = ctx.createLinearGradient(x, 20, x + 8, 2);
    gradient.addColorStop(0, '#5b6478');
    gradient.addColorStop(1, '#e2e9f4');

    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x + 7, 1);
    ctx.lineTo(x + 14, 20);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  scene.textures.addCanvas('spike', canvas);
}

function makeDoor(scene) {
  if (scene.textures.exists('door')) return;
  const canvas = canvasOf(64, 96);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#120d1c';
  ctx.beginPath();
  ctx.roundRect(0, 0, 64, 96, 8);
  ctx.fill();

  const glow = ctx.createLinearGradient(0, 8, 0, 90);
  glow.addColorStop(0, '#ffe6a8');
  glow.addColorStop(0.45, '#e79a35');
  glow.addColorStop(1, '#7c3411');

  ctx.beginPath();
  ctx.roundRect(8, 8, 48, 84, 5);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.fillStyle = 'rgba(24,14,26,0.55)';
  ctx.fillRect(8, 32, 48, 5);
  ctx.fillRect(8, 60, 48, 5);

  ctx.fillStyle = '#e8b34c';
  ctx.fillRect(27, 0, 10, 7);

  scene.textures.addCanvas('door', canvas);
}

function makeGlow(scene) {
  if (scene.textures.exists('glow')) return;
  const canvas = canvasOf(128, 128);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,240,196,0.95)');
  gradient.addColorStop(0.45, 'rgba(255,198,104,0.35)');
  gradient.addColorStop(1, 'rgba(255,176,74,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  scene.textures.addCanvas('glow', canvas);
}

function makeLantern(scene) {
  if (scene.textures.exists('lantern')) return;
  const canvas = canvasOf(16, 24);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#140f1e';
  ctx.fillRect(6, 0, 4, 4);
  ctx.fillRect(5, 20, 6, 3);

  const body = ctx.createLinearGradient(0, 4, 0, 20);
  body.addColorStop(0, '#ffd489');
  body.addColorStop(0.5, '#f0a63c');
  body.addColorStop(1, '#b45f1c');

  ctx.beginPath();
  ctx.ellipse(8, 12, 6, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(8, 12, 2, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,248,220,0.9)';
  ctx.fill();

  scene.textures.addCanvas('lantern', canvas);
}

function makeMoon(scene) {
  if (scene.textures.exists('moon')) return;
  const canvas = canvasOf(128, 128);
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
  halo.addColorStop(0, 'rgba(246,238,216,1)');
  halo.addColorStop(0.62, 'rgba(246,238,216,0.95)');
  halo.addColorStop(0.86, 'rgba(246,238,216,0.16)');
  halo.addColorStop(1, 'rgba(246,238,216,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);
  scene.textures.addCanvas('moon', canvas);
}

/// A vertical gradient sky under its own key, so every roof can have its own
/// colours without any image files.
export function buildSky(scene, key, stops) {
  if (scene.textures.exists(key)) return;

  const canvas = canvasOf(8, 256);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  const span = Math.max(1, stops.length - 1);

  stops.forEach((color, index) => {
    gradient.addColorStop(index / span, color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 256);
  scene.textures.addCanvas(key, canvas);
}

function makeSlash(scene) {
  if (scene.textures.exists('slash')) return;
  const canvas = canvasOf(96, 96);
  const ctx = canvas.getContext('2d');

  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(48, 48, 33, -1.18, 1.18);
  ctx.strokeStyle = 'rgba(255,246,226,0.95)';
  ctx.lineWidth = 9;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(48, 48, 43, -1.02, 1.02);
  ctx.strokeStyle = 'rgba(255,206,120,0.55)';
  ctx.lineWidth = 4;
  ctx.stroke();

  scene.textures.addCanvas('slash', canvas);
}

function makePad(scene) {
  if (scene.textures.exists('pad')) return;
  const canvas = canvasOf(128, 128);
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14,4,8,0.95)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,47,69,0.55)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,47,69,0.22)';
  ctx.stroke();

  // A soft gloss across the top half reads as a lit stone disc.
  const gloss = ctx.createLinearGradient(0, 14, 0, 114);
  gloss.addColorStop(0, 'rgba(255,255,255,0.12)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(64, 64, 58, Math.PI, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();

  scene.textures.addCanvas('pad', canvas);
}

function makeShield(scene) {
  if (scene.textures.exists('shield')) return;
  const canvas = canvasOf(64, 64);
  const ctx = canvas.getContext('2d');

  const face = ctx.createRadialGradient(26, 22, 4, 32, 32, 30);
  face.addColorStop(0, '#8d95a8');
  face.addColorStop(0.7, '#4a4f60');
  face.addColorStop(1, '#2a2d3a');

  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#e8b34c';
  ctx.stroke();

  // Rim studs and a centre boss.
  ctx.fillStyle = 'rgba(232,179,76,0.8)';
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(32 + Math.cos(angle) * 21, 32 + Math.sin(angle) * 21, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(32, 32, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#d9a24a';
  ctx.fill();

  scene.textures.addCanvas('shield', canvas);
}

function makeArrow(scene) {
  if (scene.textures.exists('arrow')) return;
  const canvas = canvasOf(44, 10);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6b4a24';
  ctx.fillRect(2, 4, 32, 2);
  ctx.fillStyle = '#c6cfe0';
  ctx.beginPath();
  ctx.moveTo(34, 1);
  ctx.lineTo(44, 5);
  ctx.lineTo(34, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9374f';
  ctx.fillRect(2, 2, 6, 6);

  scene.textures.addCanvas('arrow', canvas);
}

function makeShuriken(scene) {
  if (scene.textures.exists('shuriken')) return;
  const canvas = canvasOf(32, 32);
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(16, 16);

  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(4, -4);
  ctx.lineTo(14, 0);
  ctx.lineTo(4, 4);
  ctx.lineTo(0, 14);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-4, -4);
  ctx.closePath();

  const steel = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
  steel.addColorStop(0, '#eef4ff');
  steel.addColorStop(0.6, '#aab6cc');
  steel.addColorStop(1, '#5f6a80');

  ctx.fillStyle = steel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0b0912';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#e8b34c';
  ctx.fill();

  ctx.restore();

  scene.textures.addCanvas('shuriken', canvas);
}

function makeRaindrop(scene) {
  if (scene.textures.exists('raindrop')) return;
  const canvas = canvasOf(4, 18);
  const ctx = canvas.getContext('2d');

  const streak = ctx.createLinearGradient(0, 0, 0, 18);
  streak.addColorStop(0, 'rgba(255,225,230,0)');
  streak.addColorStop(0.5, 'rgba(255,214,222,0.9)');
  streak.addColorStop(1, 'rgba(255,190,205,0.15)');

  ctx.fillStyle = streak;
  ctx.fillRect(1, 0, 2, 18);

  scene.textures.addCanvas('raindrop', canvas);
}

function makeLeaf(scene) {
  if (scene.textures.exists('leaf')) return;
  const canvas = canvasOf(14, 10);
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.quadraticCurveTo(7, -1, 14, 5);
  ctx.quadraticCurveTo(7, 11, 0, 5);
  ctx.closePath();
  ctx.fillStyle = '#c9374f';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(1, 5);
  ctx.lineTo(12, 5);
  ctx.strokeStyle = 'rgba(90,12,24,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();

  scene.textures.addCanvas('leaf', canvas);
}

function makeVignette(scene) {
  if (scene.textures.exists('vignette')) return;
  const canvas = canvasOf(128, 128);
  const ctx = canvas.getContext('2d');

  const shade = ctx.createRadialGradient(64, 64, 20, 64, 64, 78);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(0.62, 'rgba(4,1,2,0.22)');
  shade.addColorStop(1, 'rgba(2,0,1,0.72)');

  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 128, 128);

  scene.textures.addCanvas('vignette', canvas);
}

function makeMist(scene) {
  if (scene.textures.exists('mist')) return;
  const canvas = canvasOf(256, 64);
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(128, 32);
  ctx.scale(1, 0.26);

  const blob = ctx.createRadialGradient(0, 0, 6, 0, 0, 126);
  blob.addColorStop(0, 'rgba(224,230,255,0.5)');
  blob.addColorStop(0.6, 'rgba(200,208,246,0.2)');
  blob.addColorStop(1, 'rgba(190,198,240,0)');

  ctx.beginPath();
  ctx.arc(0, 0, 126, 0, Math.PI * 2);
  ctx.fillStyle = blob;
  ctx.fill();
  ctx.restore();

  scene.textures.addCanvas('mist', canvas);
}

function makeGem(scene) {
  if (scene.textures.exists('gem')) return;
  const canvas = canvasOf(28, 32);
  const ctx = canvas.getContext('2d');

  const body = ctx.createLinearGradient(6, 4, 22, 28);
  body.addColorStop(0, '#d8fbff');
  body.addColorStop(0.45, '#5fd3f0');
  body.addColorStop(1, '#1f6f9c');

  ctx.beginPath();
  ctx.moveTo(14, 1);
  ctx.lineTo(26, 12);
  ctx.lineTo(14, 31);
  ctx.lineTo(2, 12);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0d2a3c';
  ctx.stroke();

  // Facets catching the light.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.moveTo(14, 4);
  ctx.lineTo(21, 12);
  ctx.lineTo(14, 20);
  ctx.lineTo(7, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(11, 5, 3, 3);

  scene.textures.addCanvas('gem', canvas);
}

function makeBlade(scene) {
  if (scene.textures.exists('blade')) return;
  const canvas = canvasOf(30, 96);
  const ctx = canvas.getContext('2d');

  // Guard at the top, where the chain holds it.
  ctx.fillStyle = '#e8b34c';
  ctx.fillRect(2, 8, 26, 6);
  ctx.fillStyle = '#8a6a2a';
  ctx.fillRect(2, 14, 26, 2);

  // A long blade tapering to a point, drawn pointing down the chain.
  const steel = ctx.createLinearGradient(0, 16, 0, 92);
  steel.addColorStop(0, '#e6edf7');
  steel.addColorStop(0.55, '#a9b6cc');
  steel.addColorStop(1, '#dfe7f2');

  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(9, 16);
  ctx.lineTo(21, 16);
  ctx.lineTo(17, 78);
  ctx.lineTo(15, 93);
  ctx.lineTo(13, 78);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(19, 18);
  ctx.lineTo(16, 74);
  ctx.stroke();

  scene.textures.addCanvas('blade', canvas);
}

export function buildWorldTextures(scene) {
  makeStone(scene);
  makeSpike(scene);
  makeDoor(scene);
  makeGlow(scene);
  makeLantern(scene);
  makeMoon(scene);
  makeSlash(scene);
  makePad(scene);
  makeBlade(scene);
  makeShield(scene);
  makeArrow(scene);
  makeGem(scene);
  makeMist(scene);
  makeShuriken(scene);
  makeVignette(scene);
  makeRaindrop(scene);
  makeLeaf(scene);
}
