// Smooth, shaded characters drawn with the canvas API instead of pixel grids.
//
// Everything here is paths, gradients and rim light, so at gameplay size the
// figures read as rounded and lit rather than blocky. The palette is the game's
// deep red and black: cloth falls from crimson into near-black, steel catches a
// cold highlight, and the eyes and lantern trims glow warm.

const OUTLINE = 'rgba(5,2,3,0.9)';
const CLOTH_LIGHT = '#4d0f1b';
const CLOTH = '#2a0810';
const CLOTH_DARK = '#120407';
const RED = '#ff2f45';
const RED_DIM = '#7a0d1c';
const GOLD = '#ffb347';
const STEEL_LIGHT = '#ffe6ea';
const STEEL = '#b9838f';
const STEEL_DARK = '#5c3a44';

function linear(ctx, y0, y1, top, bottom) {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

function fillRound(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function rim(ctx, x, y, w, h, r, color, width = 1.2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function stroke(ctx, points, width, color) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

function shadow(ctx, x, y, rx, ry, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------- ninja

const NINJA_LEGS = [
  [
    [[21, 37], [20, 47], [20, 56]],
    [[27, 37], [28, 47], [28, 56]]
  ],
  [
    [[21, 37], [17, 45], [13, 53]],
    [[27, 37], [31, 46], [36, 54]]
  ],
  [
    [[21, 37], [25, 46], [31, 56]],
    [[27, 37], [24, 46], [18, 54]]
  ],
  [
    [[21, 36], [15, 42], [13, 49]],
    [[27, 36], [31, 42], [34, 49]]
  ]
];

function drawNinja(ctx, frame) {
  const legs = NINJA_LEGS[frame];
  const lean = frame === 1 ? 1.4 : frame === 2 ? -1 : 0;

  shadow(ctx, 24, 58, 11, 2.6, 0.4);

  // Katana across the back.
  stroke(ctx, [[30, 27], [40, 11]], 2.8, linear(ctx, 11, 27, STEEL_LIGHT, STEEL_DARK));
  stroke(ctx, [[29, 28], [33, 23]], 2.4, GOLD);

  // Legs.
  for (const leg of legs) {
    stroke(ctx, leg, 8, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));
    stroke(ctx, leg, 3, 'rgba(255,90,110,0.15)');
  }

  // Torso and sash.
  const torsoY = 20 + lean;
  fillRound(ctx, 16, torsoY, 16, 20, 5, linear(ctx, torsoY, torsoY + 20, CLOTH_LIGHT, CLOTH_DARK));
  rim(ctx, 16, torsoY, 16, 20, 5, 'rgba(255,90,110,0.32)');
  fillRound(ctx, 16, torsoY + 12, 16, 3, 1.5, linear(ctx, torsoY + 12, torsoY + 15, RED, RED_DIM));

  // Leading arm.
  stroke(ctx, [[31, torsoY + 5], [34, torsoY + 11], [32, torsoY + 16]], 4.6, CLOTH);
  stroke(ctx, [[31, torsoY + 5], [34, torsoY + 11], [32, torsoY + 16]], 1.6, 'rgba(255,90,110,0.22)');

  // Scarf knot at the neck.
  fillRound(ctx, 18, torsoY - 1, 12, 3, 1.5, RED);

  // Hood, crest, mask band and eyes.
  const headY = 12 + lean;
  ctx.beginPath();
  ctx.ellipse(24, headY, 8.6, 9.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, headY - 10, headY + 10, CLOTH_LIGHT, CLOTH_DARK);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,90,110,0.38)';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(18, headY - 6);
  ctx.lineTo(13, headY - 12);
  ctx.lineTo(20, headY - 9);
  ctx.closePath();
  ctx.fillStyle = CLOTH_LIGHT;
  ctx.fill();

  fillRound(ctx, 17, headY - 2, 14, 6, 2.5, linear(ctx, headY - 2, headY + 4, '#3a0b14', '#170409'));

  ctx.save();
  ctx.shadowColor = RED;
  ctx.shadowBlur = 5;
  fillRound(ctx, 20.5, headY + 0.5, 2.8, 2.2, 1.2, '#ffe9ea');
  fillRound(ctx, 25.5, headY + 0.5, 3.4, 2.2, 1.2, '#ffe9ea');
  ctx.restore();
}

// ------------------------------------------------------------------- guard

function drawGuard(ctx, frame) {
  const step = frame === 1 ? 1 : 0;
  shadow(ctx, 24, 58, 12, 2.8, 0.42);

  // Spear.
  stroke(ctx, [[39, 12], [39, 56]], 2.6, linear(ctx, 12, 56, '#6b4020', '#2a170a'));
  ctx.beginPath();
  ctx.moveTo(39, 3);
  ctx.lineTo(37, 12);
  ctx.lineTo(41, 12);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 2, 12, STEEL_LIGHT, STEEL);
  ctx.fill();

  // Legs.
  stroke(ctx, [[21, 38], [19 - step * 2, 48], [18 - step * 2, 56]], 9, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));
  stroke(ctx, [[27, 38], [29 + step * 2, 48], [30 + step * 2, 56]], 9, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));

  // Torso in bronze plate.
  fillRound(ctx, 13, 20, 22, 22, 6, linear(ctx, 20, 42, '#8a5a20', '#2a1508'));
  rim(ctx, 13, 20, 22, 22, 6, 'rgba(255,190,110,0.4)');

  // Breastplate and belt.
  fillRound(ctx, 16, 23, 16, 12, 3, linear(ctx, 23, 35, '#c98b34', '#5a3410'));
  rim(ctx, 16, 23, 16, 12, 3, 'rgba(255,220,150,0.45)');
  fillRound(ctx, 14, 36, 20, 3.4, 1.6, linear(ctx, 36, 40, GOLD, '#7a4a12'));

  // Shoulders.
  for (const sx of [13, 35]) {
    ctx.beginPath();
    ctx.ellipse(sx, 24, 5.4, 5.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 19, 29, '#d9a24a', '#4a2a0c');
    ctx.fill();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(255,220,160,0.35)';
    ctx.stroke();
  }

  // Helmet with a dark visor and a red plume.
  fillRound(ctx, 16, 8, 16, 13, 5, linear(ctx, 8, 21, '#b9838f', '#3d2028'));
  rim(ctx, 16, 8, 16, 13, 5, 'rgba(255,230,235,0.35)');
  fillRound(ctx, 18, 12.5, 12, 3.4, 1.6, '#0a0304');
  stroke(ctx, [[24, 7.5], [21.5, 2]], 2.2, RED);
}

// ------------------------------------------------------------------ archer

function drawArcher(ctx, frame) {
  const step = frame === 1 ? 1 : 0;
  shadow(ctx, 24, 58, 10, 2.4, 0.38);

  // Bow held out front.
  ctx.beginPath();
  ctx.moveTo(35, 17);
  ctx.quadraticCurveTo(44, 31, 35, 45);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = linear(ctx, 17, 45, '#8a5a20', '#2a170a');
  ctx.stroke();
  stroke(ctx, [[35, 17], [34.4, 45]], 0.9, 'rgba(255,230,235,0.6)');

  // Legs.
  stroke(ctx, [[22, 38], [20 - step, 48], [19 - step, 56]], 8, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));
  stroke(ctx, [[26, 38], [28 + step, 48], [29 + step, 56]], 8, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));

  // Torso.
  fillRound(ctx, 17, 20, 14, 20, 5, linear(ctx, 20, 40, CLOTH_LIGHT, CLOTH_DARK));
  rim(ctx, 17, 20, 14, 20, 5, 'rgba(255,90,110,0.3)');
  fillRound(ctx, 18, 33, 12, 2.6, 1.3, RED_DIM);

  // Arm reaching to the bow.
  stroke(ctx, [[28, 25], [34, 28]], 3.8, CLOTH_LIGHT);

  // Quiver.
  stroke(ctx, [[17, 30], [13, 22]], 4.4, '#3a1c0c');

  // Hood and eyes.
  ctx.beginPath();
  ctx.ellipse(24, 13, 7.6, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, 4, 22, CLOTH_LIGHT, CLOTH_DARK);
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(255,90,110,0.35)';
  ctx.stroke();
  fillRound(ctx, 18, 11, 12, 5, 2.2, '#170409');

  ctx.save();
  ctx.shadowColor = RED;
  ctx.shadowBlur = 4;
  fillRound(ctx, 21, 12.4, 2.6, 2, 1, '#ffe9ea');
  fillRound(ctx, 25.6, 12.4, 2.6, 2, 1, '#ffe9ea');
  ctx.restore();
}

// ----------------------------------------------------------------- warlord

function drawWarlord(ctx, frame) {
  const step = frame === 1 ? 2 : 0;
  shadow(ctx, 36, 88, 22, 4.4, 0.5);

  // Great blade.
  ctx.beginPath();
  ctx.moveTo(60, 18);
  ctx.lineTo(66, 22);
  ctx.lineTo(64, 74);
  ctx.lineTo(61, 82);
  ctx.lineTo(58, 74);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 18, 82, STEEL_LIGHT, STEEL_DARK);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  fillRound(ctx, 56, 14, 12, 4.4, 2, linear(ctx, 14, 18, GOLD, '#7a4a12'));

  // Legs.
  stroke(ctx, [[29, 60], [26 - step, 74], [25 - step, 86]], 14, linear(ctx, 58, 88, CLOTH, CLOTH_DARK));
  stroke(ctx, [[43, 60], [46 + step, 74], [47 + step, 86]], 14, linear(ctx, 58, 88, CLOTH, CLOTH_DARK));

  // Torso.
  fillRound(ctx, 20, 30, 32, 32, 9, linear(ctx, 30, 62, '#3d0c16', '#0d0406'));
  rim(ctx, 20, 30, 32, 32, 9, 'rgba(255,90,110,0.4)');

  // Plate and belt.
  fillRound(ctx, 25, 34, 22, 14, 4, linear(ctx, 34, 48, '#8a5a20', '#3a2210'));
  rim(ctx, 20 + 5, 34, 22, 14, 4, 'rgba(255,200,130,0.4)');
  fillRound(ctx, 21, 56, 30, 5, 2.4, linear(ctx, 56, 61, GOLD, '#6a3e10'));

  // Pauldrons.
  for (const sx of [18, 54]) {
    ctx.beginPath();
    ctx.ellipse(sx, 34, 9, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 26, 42, '#a86a24', '#2a1508');
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(255,200,140,0.35)';
    ctx.stroke();
  }

  // Horned helmet.
  fillRound(ctx, 25, 8, 22, 20, 8, linear(ctx, 8, 28, '#8d5a68', '#22101a'));
  rim(ctx, 25, 8, 20, 20, 7, 'rgba(255,225,230,0.35)');
  fillRound(ctx, 27, 16, 18, 5, 2.2, '#0a0304');

  stroke(ctx, [[24, 12], [14, 2]], 3.4, linear(ctx, 2, 12, '#ffe6ea', STEEL_DARK));
  stroke(ctx, [[48, 12], [58, 2]], 3.4, linear(ctx, 2, 12, '#ffe6ea', STEEL_DARK));

  ctx.save();
  ctx.shadowColor = RED;
  ctx.shadowBlur = 8;
  fillRound(ctx, 30, 17, 4, 3, 1.5, '#ff2f45');
  fillRound(ctx, 38, 17, 4, 3, 1.5, '#ff2f45');
  ctx.restore();
}

// ------------------------------------------------------------------- swordmaster

function drawSwordmaster(ctx, frame) {
  const step = frame === 1 ? 1 : 0;

  shadow(ctx, 24, 58, 11, 2.6, 0.4);

  // A long straight blade, held out level with the shoulder.
  stroke(ctx, [[30, 30], [45, 15]], 2.4, linear(ctx, 15, 30, STEEL_LIGHT, STEEL_DARK));
  stroke(ctx, [[29, 31], [33, 27]], 2.2, GOLD);

  // Legs in a duellist's stance.
  stroke(ctx, [[22, 38], [20 - step, 48], [19 - step, 56]], 7.5, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));
  stroke(ctx, [[26, 38], [28 + step, 48], [29 + step, 56]], 7.5, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));

  // Robe.
  fillRound(ctx, 16, 20, 16, 21, 5, linear(ctx, 20, 41, '#5a1020', '#0e0407'));
  rim(ctx, 16, 20, 16, 21, 5, 'rgba(255,90,110,0.35)');
  fillRound(ctx, 16, 36, 16, 3, 1.5, linear(ctx, 36, 39, RED, RED_DIM));

  // Arm along the blade.
  stroke(ctx, [[31, 25], [36, 28]], 3.6, CLOTH_LIGHT);

  // Hood, then the pale mask that marks him out.
  ctx.beginPath();
  ctx.ellipse(24, 13, 8.4, 9.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, 4, 22, CLOTH, CLOTH_DARK);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,60,80,0.55)';
  ctx.stroke();

  fillRound(ctx, 19, 9.5, 10, 9.5, 4, linear(ctx, 9, 19, '#f2dfd6', '#8a6a6a'));
  rim(ctx, 19, 9.5, 10, 9.5, 4, 'rgba(20,3,6,0.6)', 1);

  ctx.save();
  ctx.shadowColor = RED;
  ctx.shadowBlur = 5;
  fillRound(ctx, 21, 12.5, 2.4, 2, 1, '#5a0a12');
  fillRound(ctx, 25.2, 12.5, 2.4, 2, 1, '#5a0a12');
  ctx.restore();
}

// ---------------------------------------------------------------- kunoichi

function drawKunoichi(ctx, frame) {
  const legs = NINJA_LEGS[frame];
  const lean = frame === 1 ? 1.4 : frame === 2 ? -1 : 0;

  shadow(ctx, 24, 58, 11, 2.6, 0.4);

  // Twin short blades, one at each hip.
  stroke(ctx, [[14, 30], [8, 41]], 2.4, linear(ctx, 30, 41, STEEL_LIGHT, STEEL_DARK));
  stroke(ctx, [[34, 30], [40, 41]], 2.4, linear(ctx, 30, 41, STEEL_LIGHT, STEEL_DARK));

  // Legs.
  for (const leg of legs) {
    stroke(ctx, leg, 7.6, linear(ctx, 36, 58, CLOTH, CLOTH_DARK));
    stroke(ctx, leg, 2.6, 'rgba(255,90,110,0.15)');
  }

  // Slimmer torso with a red sash.
  const torsoY = 20 + lean;
  fillRound(ctx, 17, torsoY, 14, 20, 5, linear(ctx, torsoY, torsoY + 20, CLOTH_LIGHT, CLOTH_DARK));
  rim(ctx, 17, torsoY, 14, 20, 5, 'rgba(255,90,110,0.32)');
  fillRound(ctx, 17, torsoY + 12, 14, 3, 1.5, linear(ctx, torsoY + 12, torsoY + 15, RED, RED_DIM));

  // Leading arm.
  stroke(ctx, [[30, torsoY + 5], [33, torsoY + 11], [31, torsoY + 16]], 4.2, CLOTH);

  // Ponytail streaming behind.
  stroke(ctx, [[19, 13 + lean], [12, 20 + lean], [11, 29 + lean]], 3.2, linear(ctx, 13, 29, RED, RED_DIM));

  // Hood, mask band and eyes.
  const headY = 12 + lean;
  ctx.beginPath();
  ctx.ellipse(24, headY, 8, 9.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, headY - 10, headY + 10, CLOTH_LIGHT, CLOTH_DARK);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,90,110,0.38)';
  ctx.stroke();

  fillRound(ctx, 17, headY - 2, 14, 6, 2.5, linear(ctx, headY - 2, headY + 4, '#3a0b14', '#170409'));

  ctx.save();
  ctx.shadowColor = RED;
  ctx.shadowBlur = 5;
  fillRound(ctx, 20.5, headY + 0.5, 2.8, 2.2, 1.2, '#ffe9ea');
  fillRound(ctx, 25.5, headY + 0.5, 3.4, 2.2, 1.2, '#ffe9ea');
  ctx.restore();
}

// -------------------------------------------------------------- sheet build

const CHARACTERS = {
  ninja: { frames: 4, width: 48, height: 60, draw: drawNinja },
  kunoichi: { frames: 4, width: 48, height: 60, draw: drawKunoichi },
  guard: { frames: 2, width: 48, height: 60, draw: drawGuard },
  archer: { frames: 2, width: 48, height: 60, draw: drawArcher },
  swordmaster: { frames: 2, width: 48, height: 60, draw: drawSwordmaster },
  warlord: { frames: 2, width: 72, height: 90, draw: drawWarlord }
};

export function buildSmoothCharacters(scene) {
  for (const key of Object.keys(CHARACTERS)) {
    if (scene.textures.exists(key)) continue;

    const spec = CHARACTERS[key];
    const canvas = document.createElement('canvas');
    canvas.width = spec.width * spec.frames;
    canvas.height = spec.height;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;

    for (let frame = 0; frame < spec.frames; frame += 1) {
      ctx.save();
      ctx.translate(frame * spec.width, 0);
      spec.draw(ctx, frame);
      ctx.restore();
    }

    scene.textures.addSpriteSheet(key, canvas, {
      frameWidth: spec.width,
      frameHeight: spec.height
    });
  }
}
