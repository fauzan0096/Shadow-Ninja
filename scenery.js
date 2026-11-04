// The painted backdrop: five parallax layers of silhouettes drawn with the game's
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

// ---------------------------------------------------------------- helpers

function seeded(seed) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 16807) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

function hexToInt(hex) {
  return parseInt(String(hex).replace('#', ''), 16);
}

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function poly(g, points) {
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) g.lineTo(points[i][0], points[i][1]);
  g.closePath();
  g.fillPath();
}

// A roof whose eaves sweep up at the corners, the shape that makes a silhouette
// read as East Asian architecture at a glance.
function curvedRoof(g, cx, y, w, h) {
  const half = w / 2;
  poly(g, [
    [cx - half - w * 0.1, y - h * 0.55],
    [cx - half * 0.55, y - h * 0.08],
    [cx - half * 0.2, y - h],
    [cx + half * 0.2, y - h],
    [cx + half * 0.55, y - h * 0.08],
    [cx + half + w * 0.1, y - h * 0.55],
    [cx + half * 0.92, y + h * 0.1],
    [cx - half * 0.92, y + h * 0.1]
  ]);
}

function pagoda(g, cx, baseY, tiers, width, tierH, light, rand) {
  let w = width;
  let y = baseY;
  g.fillRect(cx - w * 0.62, y - 8, w * 1.24, 8);
  for (let i = 0; i < tiers; i += 1) {
    const bodyH = tierH * 0.62;
    g.fillRect(cx - w * 0.36, y - bodyH, w * 0.72, bodyH);
    y -= bodyH;
    curvedRoof(g, cx, y, w, tierH * 0.42);
    y -= tierH * 0.3;
    w *= 0.8;
  }
  g.fillRect(cx - 2, y - tierH * 0.9, 4, tierH * 0.9);
  g.fillCircle(cx, y - tierH * 0.9, 4);
  if (light) {
    // A lit window on the lower tiers.
    g.fillStyle(light, 0.75);
    let wy = baseY - tierH * 0.45;
    let ww = width;
    for (let i = 0; i < Math.min(tiers, 3); i += 1) {
      if (rand() < 0.85) g.fillRect(cx - 3, wy - 5, 6, 10);
      wy -= tierH * 0.92;
      ww *= 0.8;
    }
    g.fillStyle(g._ink, 1);
  }
}

function house(g, x, baseY, w, h, light, rand) {
  g.fillRect(x, baseY - h, w, h);
  curvedRoof(g, x + w / 2, baseY - h, w * 1.25, h * 0.55);
  if (light && rand() < 0.7) {
    g.fillStyle(light, 0.8);
    g.fillRect(x + w * 0.3, baseY - h * 0.62, w * 0.16, h * 0.22);
    g.fillRect(x + w * 0.58, baseY - h * 0.62, w * 0.16, h * 0.22);
    g.fillStyle(g._ink, 1);
  }
}

function torii(g, cx, baseY, h, tint) {
  const w = h * 0.95;
  const post = Math.max(5, h * 0.07);
  g.fillStyle(tint, 1);
  g.fillRect(cx - w / 2, baseY - h, post, h);
  g.fillRect(cx + w / 2 - post, baseY - h, post, h);
  poly(g, [
    [cx - w * 0.68, baseY - h * 1.02],
    [cx + w * 0.68, baseY - h * 1.02],
    [cx + w * 0.58, baseY - h * 0.9],
    [cx - w * 0.58, baseY - h * 0.9]
  ]);
  g.fillRect(cx - w * 0.52, baseY - h * 0.78, w * 1.04, post * 0.8);
  g.fillRect(cx - post * 0.6, baseY - h * 0.95, post * 1.2, h * 0.17);
  g.fillStyle(g._ink, 1);
}

function pine(g, x, baseY, h) {
  g.fillRect(x - 3, baseY - h * 0.35, 6, h * 0.35);
  for (let i = 0; i < 4; i += 1) {
    const ty = baseY - h * (0.3 + i * 0.2);
    const tw = h * (0.34 - i * 0.06);
    g.fillTriangle(x - tw, ty, x + tw, ty, x, ty - h * 0.3);
  }
}

function ridge(g, width, baseY, amp, rand) {
  const pts = [[-50, baseY + 400]];
  let x = -50;
  let y = baseY - amp * 0.5;
  while (x < width + 100) {
    y = baseY - amp * (0.25 + rand() * 0.75);
    pts.push([x, y]);
    x += 60 + rand() * 120;
  }
  pts.push([width + 100, baseY + 400]);
  poly(g, pts);
}

function paintKind(kind, g, width, baseY, scale, color, accent, mid, rand) {
  g._ink = color;
  g.fillStyle(color, 1);
  const light = mid ? accent : 0;
  let x = -160;

  if (kind === 'palace') {
    while (x < width) {
      const span = (130 + rand() * 130) * scale;
      const tiers = 3 + Math.floor(rand() * 3);
      pagoda(g, x + span / 2, baseY, tiers, (90 + rand() * 40) * scale, (60 + rand() * 18) * scale, light, rand);
      // Battlemented wall running to the next tower.
      const wallH = (50 + rand() * 30) * scale;
      g.fillRect(x + span, baseY - wallH, span * 0.5, wallH);
      for (let b = 0; b < span * 0.5; b += 22 * scale) g.fillRect(x + span + b, baseY - wallH - 9 * scale, 12 * scale, 9 * scale);
      x += span * 1.5 + (60 + rand() * 90) * scale;
    }
  } else if (kind === 'bamboo') {
    while (x < width) {
      const h = (320 + rand() * 280) * scale;
      const w = (7 + rand() * 9) * scale;
      g.fillRect(x, baseY - h, w, h);
      for (let n = 1; n < 6; n += 1) g.fillRect(x - 1, baseY - h * (n / 6), w + 2, 2);
      for (let leaf = 0; leaf < 5; leaf += 1) {
        const ly = baseY - h + rand() * h * 0.6;
        const dir = rand() < 0.5 ? -1 : 1;
        g.fillTriangle(x + w / 2, ly, x + w / 2 + dir * 44 * scale, ly - 14 * scale, x + w / 2 + dir * 16 * scale, ly + 9 * scale);
      }
      x += w + (40 + rand() * 80) * scale;
      if (mid && rand() < 0.07) pine(g, x, baseY, 160 * scale);
    }
  } else if (kind === 'village') {
    while (x < width) {
      const w = (80 + rand() * 90) * scale;
      const h = (60 + rand() * 70) * scale;
      house(g, x, baseY, w, h, light, rand);
      x += w + (24 + rand() * 60) * scale;
      if (rand() < 0.22) { pine(g, x, baseY, (120 + rand() * 80) * scale); x += 50 * scale; }
      if (mid && rand() < 0.1) { torii(g, x + 40 * scale, baseY, 120 * scale, mix(color, 0x7a1626, 0.55)); x += 130 * scale; }
    }
  } else {
    while (x < width) {
      const roll = rand();
      if (roll < 0.28) {
        const span = 90 * scale;
        pagoda(g, x + span / 2, baseY, 3 + Math.floor(rand() * 2), span, 58 * scale, light, rand);
        x += span + (40 + rand() * 70) * scale;
      } else {
        const w = (120 + rand() * 150) * scale;
        const h = (80 + rand() * 120) * scale;
        house(g, x, baseY, w, h, light, rand);
        x += w + (26 + rand() * 60) * scale;
      }
      if (mid && rand() < 0.08) { torii(g, x + 40 * scale, baseY, 130 * scale, mix(color, 0x7a1626, 0.55)); x += 140 * scale; }
    }
  }

  if (mid) {
    g.fillStyle(accent, 0.2);
    for (let i = 0; i < width / 260; i += 1) g.fillCircle(rand() * width, baseY - 60 - rand() * 220, 1.6 * scale);
  }
}

function hazeOf(theme) {
  // The haze is a lifted version of the horizon colour, so far shapes sit
  // clearly lighter than near ones.
  return mix(hexToInt(theme.sky[3]), 0xffffff, 0.2);
}

/// Five layers behind the level. The farther a layer, the more it takes on the
/// colour of the sky haze, which is what makes the distance read as distance.
export function paintScenery(scene, level, levelIndex) {
  const kind = SCENERY_BY_LEVEL[levelIndex] || 'rooftops';
  const theme = level.theme;
  const haze = hazeOf(theme);
  const rand = seeded(9001 + levelIndex * 131);

  const mountains = scene.add.graphics().setDepth(-97).setScrollFactor(0.1);
  mountains.fillStyle(mix(theme.far, haze, 0.8), 1);
  ridge(mountains, level.width * 0.1 + 1600, 560, 260, rand);
  mountains.fillStyle(mix(theme.far, haze, 0.62), 1);
  ridge(mountains, level.width * 0.1 + 1600, 600, 190, rand);

  const far = scene.add.graphics().setDepth(-96).setScrollFactor(0.28);
  paintKind(kind, far, level.width * 0.28 + 1600, 620, 1, mix(theme.far, haze, 0.46), theme.accent, false, rand);

  const mid = scene.add.graphics().setDepth(-92).setScrollFactor(0.55);
  paintKind(kind, mid, level.width * 0.55 + 1600, 690, 1.4, mix(theme.near, haze, 0.04), theme.accent, true, rand);

  addFlowerField(scene, level, rand);
}

/// A band of red spider lilies along the foot of the world, drifting in a breeze.
function addFlowerField(scene, level, rand) {
  const g = scene.add.graphics().setDepth(-70).setScrollFactor(0.9);
  const reach = level.width * 0.9 + 1600;
  const bloom = [0xc9374f, 0xe0455f, 0x9d2338];

  g.fillStyle(0x07040a, 0.9);
  g.fillRect(-100, 662, reach + 200, 140);

  for (let x = -60; x < reach; x += 5 + rand() * 8) {
    const h = 20 + rand() * 38;
    const lean = (rand() - 0.5) * 12;
    const y = 672 + rand() * 18;
    g.lineStyle(1.4, 0x0d1a12, 1);
    g.lineBetween(x, y, x + lean, y - h);
    g.fillStyle(bloom[Math.floor(rand() * bloom.length)], 0.92);
    g.fillCircle(x + lean, y - h, 3.6);
    g.lineStyle(1, 0xe0455f, 0.8);
    for (let p = -2; p <= 2; p += 1) g.lineBetween(x + lean, y - h, x + lean + p * 4, y - h - 7);
  }
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
