// The painted backdrop: two parallax layers of silhouettes drawn with the game's
// own shapes, chosen by the kind of place each roof is.
//
// Far layers move slowly and near ones faster, which is what gives a flat level
// its depth. Everything here is Graphics and soft canvas textures, so it costs
// nothing to download and works offline.

const SCENERY_BY_LEVEL = [
  'rooftops',
  'village',
  'bamboo',
  'palace',
  'rooftops',
  'palace',
  'village',
  'bamboo',
  'palace',
  'rooftops',
  'palace',
  'rooftops',
  'palace'
];

function paintRooftops(g, width, baseY, scale, color, accent, mid) {
  g.fillStyle(color, 1);
  let x = -200;

  while (x < width) {
    const w = (120 + Math.random() * 160) * scale;
    const h = (90 + Math.random() * 140) * scale;
    g.fillRect(x, baseY - h, w, h);
    g.fillTriangle(
      x - 18 * scale,
      baseY - h,
      x + w + 18 * scale,
      baseY - h,
      x + w / 2,
      baseY - h - 56 * scale
    );
    x += w + (30 + Math.random() * 70) * scale;
  }

  if (mid) {
    g.fillStyle(accent, 0.22);
    for (let i = 0; i < width / 240; i += 1) {
      const wx = Math.random() * width;
      const wy = baseY - 40 - Math.random() * 100;
      g.fillRect(wx, wy, 6 * scale, 8 * scale);
    }
  }
}

function paintVillage(g, width, baseY, scale, color, accent, mid) {
  g.fillStyle(color, 1);
  let x = -160;

  while (x < width) {
    const w = (90 + Math.random() * 110) * scale;
    const h = (70 + Math.random() * 100) * scale;
    g.fillRect(x, baseY - h, w, h);
    g.fillTriangle(
      x - 16 * scale,
      baseY - h,
      x + w + 16 * scale,
      baseY - h,
      x + w / 2,
      baseY - h - 42 * scale
    );
    x += w + (26 + Math.random() * 70) * scale;
  }

  if (mid) {
    g.fillStyle(accent, 0.3);
    for (let i = 0; i < width / 170; i += 1) {
      const wx = Math.random() * width;
      const wy = baseY - 30 - Math.random() * 60;
      g.fillRect(wx, wy, 7 * scale, 9 * scale);
    }
  }
}

function paintPalace(g, width, baseY, scale, color, accent, mid) {
  g.fillStyle(color, 1);
  let x = -180;

  while (x < width) {
    const w = (44 + Math.random() * 36) * scale;
    const h = (250 + Math.random() * 170) * scale;
    const span = (130 + Math.random() * 120) * scale;
    g.fillRect(x, baseY - h, w, h);
    g.fillRect(x, baseY - h, span, 14 * scale);
    g.fillRect(x, baseY - h * 0.55, span, 8 * scale);
    x += span + (90 + Math.random() * 110) * scale;
  }

  if (mid) {
    g.fillStyle(accent, 0.28);
    for (let i = 0; i < width / 260; i += 1) {
      const lx = Math.random() * width;
      const ly = baseY - 150 - Math.random() * 150;
      g.fillRect(lx, ly, 5 * scale, 9 * scale);
    }
  }
}

function paintBamboo(g, width, baseY, scale, color, accent, mid) {
  g.fillStyle(color, 1);
  let x = -140;

  while (x < width) {
    const h = (320 + Math.random() * 280) * scale;
    const w = (8 + Math.random() * 10) * scale;
    g.fillRect(x, baseY - h, w, h);

    for (let leaf = 0; leaf < 3; leaf += 1) {
      const ly = baseY - h + Math.random() * h * 0.7;
      g.fillTriangle(
        x + w / 2,
        ly,
        x + w / 2 + 30 * scale,
        ly - 12 * scale,
        x + w / 2 + 12 * scale,
        ly + 8 * scale
      );
    }

    x += w + (46 + Math.random() * 90) * scale;
  }

  if (mid) {
    g.fillStyle(accent, 0.16);
    for (let i = 0; i < width / 220; i += 1) {
      const gx = Math.random() * width;
      const gy = baseY - 80 - Math.random() * 220;
      g.fillCircle(gx, gy, 2 * scale);
    }
  }
}

function drawLayer(kind, g, width, baseY, scale, color, accent, mid) {
  if (kind === 'village') paintVillage(g, width, baseY, scale, color, accent, mid);
  else if (kind === 'palace') paintPalace(g, width, baseY, scale, color, accent, mid);
  else if (kind === 'bamboo') paintBamboo(g, width, baseY, scale, color, accent, mid);
  else paintRooftops(g, width, baseY, scale, color, accent, mid);
}

/// Three silhouette layers behind the level, each at its own distance, with a
/// shaft of moonlight and a haze lying on the roofs between them. The depth is
/// the point: the furthest layer is hazier and slower, so the rooftops read as
/// space rather than a painted wall behind the ninja.
export function paintScenery(scene, level, levelIndex) {
  const kind = SCENERY_BY_LEVEL[levelIndex] || 'rooftops';
  const theme = level.theme;

  const distant = scene.add.graphics().setDepth(-97).setScrollFactor(0.16);
  const far = scene.add.graphics().setDepth(-96).setScrollFactor(0.28);
  const mid = scene.add.graphics().setDepth(-92).setScrollFactor(0.55);

  drawLayer(kind, distant, level.width * 0.16 + 1600, 600, 0.8, theme.far, theme.accent, false);
  distant.setAlpha(0.5);

  drawLayer(kind, far, level.width * 0.28 + 1600, 620, 1, theme.far, theme.accent, false);
  drawLayer(kind, mid, level.width * 0.55 + 1600, 690, 1.4, theme.near, theme.accent, true);

  const shaft = scene.add.graphics().setDepth(-95).setScrollFactor(0.45);
  shaft.fillStyle(theme.moon, 0.055);
  shaft.fillTriangle(level.width * 0.22, -80, level.width * 0.34, -80, level.width * 0.04, 760);
  shaft.fillStyle(theme.moon, 0.035);
  shaft.fillTriangle(level.width * 0.3, -80, level.width * 0.42, -80, level.width * 0.14, 760);

  scene.add
    .tileSprite(level.width / 2, level.groundY - 70, level.width, 240, 'mist')
    .setDepth(-55)
    .setScrollFactor(0.7)
    .setAlpha(0.14)
    .setTint(theme.accent);
}

/// Slow banks of mist drifting across the middle distance.
export function addMist(scene, level) {
  const count = Math.max(4, Math.round(level.width / 700));

  for (let i = 0; i < count; i += 1) {
    const x = (i + 0.5) * (level.width / count);
    const mist = scene.add
      .image(x, 430 + Math.random() * 150, 'mist')
      .setDepth(-60)
      .setScrollFactor(0.75)
      .setAlpha(0.09 + Math.random() * 0.07)
      .setScale(2.2 + Math.random() * 1.6, 1 + Math.random() * 0.7);

    scene.tweens.add({
      targets: mist,
      x: x + 110 + Math.random() * 140,
      alpha: 0.16 + Math.random() * 0.06,
      duration: 9000 + Math.random() * 6000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}

/// Red embers drifting up out of the dark, the game's own colour in the air.
export function addEmbers(scene, level) {
  const count = 14 + Math.round(level.width / 600);

  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * level.width;
    const y = 420 + Math.random() * 260;

    const ember = scene.add
      .image(x, y, 'glow')
      .setDepth(3)
      .setScale(0.03 + Math.random() * 0.02)
      .setAlpha(0.5)
      .setTint(Math.random() < 0.5 ? 0xff6a4a : 0xff2f45);

    scene.tweens.add({
      targets: ember,
      y: y - 120 - Math.random() * 140,
      x: x + (Math.random() - 0.5) * 80,
      alpha: 0,
      duration: 4200 + Math.random() * 4000,
      repeat: -1,
      delay: Math.random() * 3000,
      ease: 'Sine.easeOut'
    });
  }
}

/// Little glowing insects wandering the rooftops, each on its own loops.
export function addFireflies(scene, level) {
  const count = 16 + Math.round(level.width / 400);

  for (let i = 0; i < count; i += 1) {
    const x = 100 + Math.random() * (level.width - 200);
    const y = 330 + Math.random() * 300;

    const fly = scene.add
      .image(x, y, 'glow')
      .setDepth(3)
      .setScale(0.04 + Math.random() * 0.03)
      .setAlpha(0.45 + Math.random() * 0.35)
      .setTint(Math.random() < 0.5 ? 0xffe08a : level.theme.accent);

    scene.tweens.add({
      targets: fly,
      x: x + (Math.random() - 0.5) * 170,
      y: y + (Math.random() - 0.5) * 130,
      duration: 3000 + Math.random() * 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.tweens.add({
      targets: fly,
      alpha: 0.12,
      duration: 900 + Math.random() * 1200,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 1400
    });
  }
}
