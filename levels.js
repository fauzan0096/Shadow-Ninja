// The twelve roofs of the game, in order of difficulty.
//
// Every level is the same shape of data the play scene reads: ground segments,
// floating ledges, solid blocks, spike strips, patrolling guards, an exit and a
// colour theme of its own. Levels that end with a chimney climb reuse `chimney()`,
// which is the wall pair and the gate ledge, measured so the climb is possible.
//
// Gap widths stay under a plain jump (about 200 pixels) except where the level is
// built around the dash, which crosses about 320.

export const GROUND_H = 40;
export const LEDGE_H = 22;

const GROUND_Y = 680;
const LEVEL_HEIGHT = 720;

const THEMES = {
  rooftops: {
    sky: ['#070a17', '#131029', '#231a3a', '#3a2340'],
    far: 0x0f0c1e,
    near: 0x181328,
    stone: 0xffffff,
    accent: 0xe8b34c,
    moon: 0xf6eed8
  },
  lanterns: {
    sky: ['#120a12', '#2a1520', '#48211f', '#6b3520'],
    far: 0x1c1018,
    near: 0x2a1620,
    stone: 0xffe6cf,
    accent: 0xffb066,
    moon: 0xffd7a8
  },
  bamboo: {
    sky: ['#05130f', '#0c231b', '#143a2a', '#1d5236'],
    far: 0x08170f,
    near: 0x10251a,
    stone: 0xd4e8d4,
    accent: 0x8fd6a0,
    moon: 0xdaf5e2
  },
  ice: {
    sky: ['#050c1a', '#0c1c33', '#143049', '#1d4a66'],
    far: 0x0a1725,
    near: 0x122437,
    stone: 0xd4e8ff,
    accent: 0x9fd8f0,
    moon: 0xe8f4ff
  },
  chains: {
    sky: ['#140b18', '#2a1330', '#3d1a44', '#5a2450'],
    far: 0x180f1e,
    near: 0x241430,
    stone: 0xe8dcf5,
    accent: 0xd98cff,
    moon: 0xf0dcff
  },
  bells: {
    sky: ['#141007', '#2b2110', '#42311a', '#5a4525'],
    far: 0x181209,
    near: 0x271d10,
    stone: 0xffeccb,
    accent: 0xffcf6a,
    moon: 0xffeec2
  },
  rain: {
    sky: ['#080b10', '#131c26', '#1e2b38', '#2b3d4c'],
    far: 0x0b1218,
    near: 0x14202b,
    stone: 0xd2dce8,
    accent: 0x8fb6d9,
    moon: 0xdce8f2
  },
  garden: {
    sky: ['#04100f', '#0a1f20', '#0f3230', '#14494a'],
    far: 0x071a19,
    near: 0x0d2a28,
    stone: 0xd0ece4,
    accent: 0x7fd9c6,
    moon: 0xd8fff2
  },
  fort: {
    sky: ['#120607', '#26090d', '#3d1116', '#5c1a20'],
    far: 0x160a0b,
    near: 0x261014,
    stone: 0xffd4d0,
    accent: 0xff8a6a,
    moon: 0xffd0c0
  },
  snow: {
    sky: ['#0a1018', '#16212e', '#22303f', '#334756'],
    far: 0x0d1620,
    near: 0x17232f,
    stone: 0xeef6ff,
    accent: 0xa8c8e8,
    moon: 0xf4fbff
  },
  lotus: {
    sky: ['#08060d', '#150d1c', '#22132b', '#301a3c'],
    far: 0x0c0812,
    near: 0x160e1f,
    stone: 0xe8d8f6,
    accent: 0xc07bff,
    moon: 0xf2e4ff
  },
  emperor: {
    sky: ['#0d0805', '#1d1208', '#2f1d0c', '#4a2c10'],
    far: 0x120c06,
    near: 0x1e1509,
    stone: 0xffe4b4,
    accent: 0xffd27a,
    moon: 0xffe9c0
  }
};

// The game paints everything in deep red and black. These replace the colours
// above, keeping each roof's own accent so they still read apart.
const RED_BLACK = {
  rooftops: {
    sky: ['#050307', '#0b0509', '#150609', '#22080d'],
    far: 0x120409,
    near: 0x1d0710,
    stone: 0xffe0e0,
    accent: 0xff2f45,
    moon: 0xffe6e6
  },
  lanterns: {
    sky: ['#070304', '#12070a', '#1e0a0c', '#2c1010'],
    far: 0x150507,
    near: 0x230a0c,
    stone: 0xffd9c8,
    accent: 0xff6a3d,
    moon: 0xffd7b0
  },
  bamboo: {
    sky: ['#050607', '#0a0c0d', '#121314', '#1a1a1c'],
    far: 0x0e1012,
    near: 0x16181b,
    stone: 0xffdede,
    accent: 0xff4757,
    moon: 0xffe8e8
  },
  ice: {
    sky: ['#04070b', '#081018', '#0d1a24', '#122430'],
    far: 0x0a1218,
    near: 0x121c24,
    stone: 0xffe6e6,
    accent: 0xff5f6d,
    moon: 0xfff0f0
  },
  chains: {
    sky: ['#0a0508', '#140a0e', '#1e0f14', '#2a151b'],
    far: 0x150a0f,
    near: 0x22121a,
    stone: 0xffe0e8,
    accent: 0xff3b57,
    moon: 0xffe4ee
  },
  bells: {
    sky: ['#0a0604', '#150c07', '#1f120a', '#2c1a0e'],
    far: 0x140a06,
    near: 0x22150c,
    stone: 0xffe2c2,
    accent: 0xffb347,
    moon: 0xffeec8
  },
  rain: {
    sky: ['#040608', '#080d10', '#0c1518', '#122024'],
    far: 0x0a0f12,
    near: 0x121a1d,
    stone: 0xffdcd8,
    accent: 0xff5a6a,
    moon: 0xffe8e8
  },
  garden: {
    sky: ['#040706', '#08100e', '#0c1614', '#12201c'],
    far: 0x080f0d,
    near: 0x0e1815,
    stone: 0xffded6,
    accent: 0xff6b4a,
    moon: 0xffe8e0
  },
  fort: {
    sky: ['#080304', '#140608', '#1e090c', '#2c0d11'],
    far: 0x120406,
    near: 0x1e080b,
    stone: 0xffd6d2,
    accent: 0xff2f45,
    moon: 0xffd8d8
  },
  snow: {
    sky: ['#05070a', '#0a0e13', '#0f151b', '#141c24'],
    far: 0x0a0e13,
    near: 0x121820,
    stone: 0xfff0f0,
    accent: 0xff8a8a,
    moon: 0xfff4f4
  },
  lotus: {
    sky: ['#060407', '#0c060c', '#140811', '#1e0c1a'],
    far: 0x0e070e,
    near: 0x180b16,
    stone: 0xffdce8,
    accent: 0xe02a5a,
    moon: 0xffe2ee
  },
  emperor: {
    sky: ['#070403', '#120805', '#1a0b06', '#26100a'],
    far: 0x120706,
    near: 0x1e0c09,
    stone: 0xffe0c4,
    accent: 0xffb347,
    moon: 0xffeed0
  }
};

Object.assign(THEMES, RED_BLACK);

/// The wall pair and gate ledge at the end of a level: walk under the first wall,
/// climb the chimney between them, and step onto the ledge holding the gate.
function chimney(x) {
  return {
    blocks: [
      [x, 440, 44, 160],
      [x + 140, 500, 44, 180],
      [x + 184, 500, 236, 30]
    ],
    exit: [x + 310, 500]
  };
}

/// Gems sit over the middle of every ledge, and a pair along each stretch of
/// ground, kept clear of the spike strips so a pickup is never a trap.
function buildGemList(config) {
  const gems = [];
  const spikes = (config.spikes || []).concat(
    (config.traps && config.traps.spikes) || []
  );

  const clearOfSpikes = (x) => {
    for (const spike of spikes) {
      if (Math.abs(spike - x) < 70) return false;
    }
    return true;
  };

  for (const [x, y, w] of config.ledges || []) {
    gems.push([x + w / 2, y - 28]);
  }

  for (const [x, w] of config.ground || []) {
    const low = x + w * 0.4;
    const high = x + w * 0.7;

    if (clearOfSpikes(low)) gems.push([low, 620]);
    if (clearOfSpikes(high)) gems.push([high, 560]);
  }

  return gems;
}

/// Throwing stars sit on the floor, one to a stretch of ground, so running out of
/// shuriken is only ever a short walk away.
function buildStarList(config) {
  const stars = [];
  const spikes = (config.spikes || []).concat(
    (config.traps && config.traps.spikes) || []
  );

  const clearOfSpikes = (x) => {
    for (const spike of spikes) {
      if (Math.abs(spike - x) < 70) return false;
    }
    return true;
  };

  for (const [x, w] of config.ground || []) {
    const spot = x + w * 0.26;
    if (clearOfSpikes(spot)) stars.push([spot, 630]);
  }

  return stars;
}

function buildEnemyList(config) {
  const list = (config.enemies || []).map(([x, patrol, speed, type]) => ({
    x,
    patrol,
    speed,
    type: type || 'guard'
  }));

  const combat = config.combat || {};

  for (const [x, patrol, speed] of combat.shields || []) {
    list.push({ x, patrol, speed, type: 'shield' });
  }
  for (const x of combat.archers || []) {
    list.push({ x, patrol: 0, speed: 0, type: 'archer' });
  }
  for (const x of combat.swords || []) {
    list.push({ x, patrol: 0, speed: 0, type: 'sword' });
  }

  return list;
}

function makeLevel(config) {
  return {
    name: config.name,
    theme: config.theme,
    width: config.width,
    height: LEVEL_HEIGHT,
    groundY: GROUND_Y,
    spawn: { x: 120, y: GROUND_Y },
    ground: config.ground.map(([x, w]) => ({ x, w })),
    ledges: (config.ledges || []).map(([x, y, w]) => ({ x, y, w })),
    blocks: (config.blocks || []).map(([x, y, w, h]) => ({ x, y, w, h })),
    spikes: config.spikes || [],
    enemies: buildEnemyList(config),
    gems: buildGemList(config),
    stars: buildStarList(config),
    isBoss: Boolean(config.boss),
    bossX: config.boss ? config.boss[0] : 0,
    trapSpikes: (config.traps && config.traps.spikes) || [],
    blades: (config.traps && config.traps.blades) || [],
    crumbles: (config.traps && config.traps.crumbles) || [],
    exit: {
      x: (config.exit || [config.width - 100, GROUND_Y])[0],
      y: (config.exit || [config.width - 100, GROUND_Y])[1]
    },
    lanterns: config.lanterns || []
  };
}
const roofOne = chimney(3780);
const roofSix = chimney(3560);
const roofNine = chimney(3620);
const roofTen = chimney(4020);
const roofTwelve = chimney(3900);

export const LEVELS = [
  makeLevel({
    name: 'Moonlit Rooftops',
    theme: THEMES.rooftops,
    width: 4200,
    ground: [
      [0, 640], [700, 380], [1150, 420], [1650, 300],
      [2030, 520], [2640, 380], [3110, 300], [3650, 550]
    ],
    ledges: [
      [540, 560, 130], [830, 520, 140], [1100, 470, 120], [1300, 560, 150],
      [1520, 480, 130], [1760, 555, 140], [1950, 470, 130], [2140, 560, 150],
      [2380, 470, 130], [2580, 530, 150], [2800, 470, 130], [3060, 540, 150],
      [3260, 470, 140]
    ],
    blocks: roofOne.blocks,
    spikes: [446, 846, 1256, 1826, 2276, 2906, 3346],
    enemies: [
      [360, 120, 55], [980, 70, 65], [1400, 110, 55], [1880, 60, 70],
      [2420, 100, 60], [2780, 110, 55], [3230, 90, 70]
    ],
    exit: roofOne.exit,
    lanterns: [200, 780, 1420, 2100, 2760, 3180, 3720]
  }),

  makeLevel({
    name: 'Lantern Alley',
    theme: THEMES.lanterns,
    width: 3200,
    ground: [[0, 560], [620, 420], [1120, 520], [1720, 380], [2180, 480], [2740, 460]],
    ledges: [[520, 560, 120], [980, 510, 140], [1440, 560, 120], [1850, 500, 130], [2320, 540, 140], [2900, 520, 130]],
    spikes: [420, 860, 1400, 1980, 2500, 3000],
    enemies: [[260, 90, 55], [800, 80, 60], [1350, 100, 55], [1900, 70, 65], [2400, 100, 60], [2900, 80, 65]],
    traps: {
      spikes: [250, 1200, 2300],
      blades: [[1800, 300, 330, 35, 2400, 0]],
      crumbles: [[1640, 680, 90]]
    },
    combat: {
      shields: [[1200, 80, 45]],
      archers: [2800]
    },
    exit: [3080, GROUND_Y],
    lanterns: [180, 700, 1200, 1800, 2280, 2850]
  }),

  makeLevel({
    name: 'Bamboo Grove',
    theme: THEMES.bamboo,
    width: 3400,
    ground: [[0, 480], [560, 520], [1160, 460], [1720, 600], [2400, 440], [2920, 480]],
    ledges: [[440, 540, 120], [900, 480, 140], [1350, 540, 130], [1800, 470, 140], [2250, 540, 120], [2750, 490, 130]],
    spikes: [360, 760, 1400, 2100, 2650, 3200],
    enemies: [[240, 80, 55], [800, 110, 60], [1400, 90, 55], [2000, 120, 60], [2600, 90, 65], [3100, 80, 55]],
    traps: {
      spikes: [620, 1800, 2950],
      blades: [[1000, 300, 330, 38, 2200, 400], [2200, 300, 330, 38, 2200, 1400]],
      crumbles: [[2320, 680, 90]]
    },
    combat: {
      shields: [[1300, 90, 45]],
      archers: [2650]
    },
    exit: [3280, GROUND_Y],
    lanterns: [160, 640, 1260, 1900, 2500, 3060]
  }),

  makeLevel({
    name: 'Frozen Steps',
    theme: THEMES.ice,
    width: 3600,
    ground: [[0, 520], [620, 360], [1060, 420], [1560, 520], [2160, 400], [2640, 420], [3140, 460]],
    ledges: [[480, 560, 110], [860, 500, 110], [1300, 560, 120], [1700, 500, 130], [2200, 560, 110], [2800, 520, 120], [3200, 540, 110]],
    spikes: [400, 740, 1300, 1900, 2400, 2900, 3400],
    enemies: [[260, 90, 55], [780, 70, 60], [1250, 90, 55], [1800, 100, 65], [2350, 80, 60], [2750, 90, 55], [3300, 90, 65]],
    traps: {
      spikes: [1700, 2200, 2700],
      blades: [[800, 300, 330, 36, 2000, 0]],
      crumbles: [[980, 680, 90], [1480, 680, 90]]
    },
    combat: {
      shields: [[1750, 90, 45]],
      archers: [3250]
    },
    exit: [3480, GROUND_Y],
    lanterns: [180, 700, 1180, 1740, 2340, 2740, 3300]
  }),

  makeLevel({
    name: 'Bridge of Chains',
    theme: THEMES.chains,
    width: 4000,
    ground: [[0, 520], [640, 420], [1260, 520], [1890, 460], [2550, 420], [3070, 430], [3700, 300]],
    ledges: [[470, 540, 110], [700, 480, 110], [1330, 540, 120], [1980, 480, 120], [2620, 540, 110], [3150, 490, 110]],
    spikes: [380, 820, 1560, 2180, 2780, 3300, 3790],
    enemies: [[240, 90, 55], [840, 90, 60], [1500, 110, 55], [2150, 90, 65], [2750, 90, 60], [3300, 80, 65], [3850, 80, 55]],
    traps: {
      spikes: [160, 1000, 2000, 3150],
      blades: [[1600, 300, 340, 40, 1900, 0], [2700, 300, 340, 40, 1900, 800]],
      crumbles: []
    },
    combat: {
      shields: [[2100, 90, 50]],
      archers: [3350]
    },
    exit: [3880, GROUND_Y],
    lanterns: [160, 740, 1380, 2020, 2680, 3200, 3760]
  }),

  makeLevel({
    name: 'Palace of Bells',
    theme: THEMES.bells,
    width: 4000,
    ground: [[0, 560], [660, 480], [1240, 520], [1860, 460], [2420, 520], [3040, 400], [3540, 460]],
    ledges: [[500, 540, 120], [1000, 480, 130], [1600, 540, 120], [2300, 470, 130], [2800, 520, 120], [3300, 540, 110]],
    blocks: roofSix.blocks,
    spikes: [420, 900, 1500, 2100, 2700, 3250],
    enemies: [[260, 90, 55], [800, 100, 60], [1400, 110, 55], [2050, 90, 65], [2600, 110, 60], [3150, 70, 55]],
    traps: {
      spikes: [700, 1700, 2500],
      blades: [[900, 300, 330, 36, 2000, 0], [2100, 300, 330, 36, 2000, 1000]],
      crumbles: [[1140, 680, 90]]
    },
    combat: {
      shields: [[1800, 90, 45]],
      archers: [700, 3200]
    },
    exit: roofSix.exit,
    lanterns: [200, 720, 1320, 2020, 2560, 3100, 3700]
  }),

  makeLevel({
    name: 'Rain on Tiles',
    theme: THEMES.rain,
    width: 4200,
    ground: [[0, 540], [640, 360], [1080, 420], [1580, 400], [2060, 460], [2600, 380], [3060, 420], [3560, 640]],
    ledges: [[490, 540, 110], [700, 470, 100], [1150, 540, 110], [1650, 480, 110], [2120, 540, 120], [2680, 480, 110], [3130, 540, 110], [3660, 500, 120]],
    spikes: [400, 800, 1300, 1800, 2300, 2800, 3300, 3900],
    enemies: [[240, 90, 55], [760, 70, 60], [1240, 90, 55], [1740, 80, 65], [2260, 100, 60], [2760, 70, 55], [3220, 90, 65], [3900, 90, 60]],
    traps: {
      spikes: [150, 1150, 2100, 3150, 4100],
      blades: [[760, 300, 330, 34, 1800, 0], [2300, 300, 330, 34, 1800, 900]],
      crumbles: [[1500, 680, 90], [2520, 680, 90]]
    },
    combat: {
      shields: [[1700, 80, 50], [2700, 80, 45]],
      archers: [900, 3400]
    },
    exit: [4080, GROUND_Y],
    lanterns: [180, 680, 1180, 1680, 2180, 2700, 3180, 3800]
  }),

  makeLevel({
    name: 'Silent Garden',
    theme: THEMES.garden,
    width: 4300,
    ground: [[0, 520], [620, 520], [1240, 460], [1800, 520], [2420, 480], [3000, 420], [3500, 800]],
    ledges: [[440, 540, 110], [760, 470, 110], [1400, 540, 110], [1960, 470, 120], [2560, 540, 110], [3140, 480, 110], [3760, 530, 120]],
    spikes: [360, 700, 900, 1400, 2000, 2600, 3100, 3700, 3900, 4100],
    enemies: [[240, 90, 55], [1000, 70, 60], [1500, 80, 55], [2200, 70, 65], [2750, 60, 60], [3300, 80, 55], [4100, 90, 65]],
    traps: {
      spikes: [150, 1050, 1600, 3300, 3560],
      blades: [
        [1000, 300, 330, 36, 1800, 0],
        [2200, 300, 330, 36, 1800, 700],
        [3300, 300, 330, 36, 1800, 1300]
      ],
      crumbles: [[520, 680, 110], [1700, 680, 110]]
    },
    combat: {
      shields: [[1900, 90, 50], [3200, 80, 50]],
      archers: [800, 3900],
      swords: [2650]
    },
    exit: [4180, GROUND_Y],
    lanterns: [160, 700, 1300, 1900, 2500, 3100, 3700, 4100]
  }),

  makeLevel({
    name: 'Red Fort',
    theme: THEMES.fort,
    width: 4400,
    ground: [[0, 520], [640, 480], [1220, 520], [1840, 440], [2400, 400], [2900, 300], [3420, 980]],
    ledges: [[460, 540, 110], [720, 470, 110], [1300, 540, 110], [1950, 480, 110], [2500, 540, 110], [3040, 460, 100], [4360, 540, 110]],
    blocks: roofNine.blocks,
    spikes: [380, 800, 1400, 2100, 2600, 3050, 3450, 4300],
    enemies: [[240, 90, 55], [820, 90, 60], [1420, 110, 55], [2000, 90, 65], [2500, 90, 60], [3050, 70, 55], [4200, 90, 60]],
    traps: {
      spikes: [150, 1000, 1700],
      blades: [[800, 300, 330, 36, 1700, 0], [2500, 300, 330, 36, 1700, 900]],
      crumbles: [[1740, 680, 110], [2800, 680, 110]]
    },
    combat: {
      shields: [[2000, 80, 50], [2650, 70, 55]],
      archers: [900, 3550]
    },
    exit: roofNine.exit,
    lanterns: [180, 700, 1280, 1900, 2480, 3000, 3500, 4250]
  }),

  makeLevel({
    name: 'Snow Gate',
    theme: THEMES.snow,
    width: 4500,
    ground: [[0, 500], [600, 420], [1120, 480], [1700, 420], [2220, 480], [2800, 380], [3380, 380], [3960, 540]],
    ledges: [[440, 540, 110], [700, 470, 110], [1230, 540, 110], [1850, 470, 110], [2340, 540, 110], [2900, 470, 110], [3480, 540, 110]],
    blocks: roofTen.blocks,
    spikes: [380, 780, 1350, 1900, 2450, 3000, 3550, 3700],
    enemies: [[240, 90, 55], [760, 90, 60], [1320, 110, 55], [1900, 80, 65], [2400, 100, 60], [2950, 80, 55], [3500, 70, 65]],
    traps: {
      spikes: [150, 1000, 1750, 2250],
      blades: [[760, 300, 330, 35, 1700, 0], [2450, 300, 330, 35, 1700, 800]],
      crumbles: [[1020, 680, 110], [2120, 680, 110]]
    },
    combat: {
      shields: [[1850, 80, 50], [2950, 70, 55]],
      archers: [900, 3450],
      swords: [2400]
    },
    exit: roofTen.exit,
    lanterns: [170, 680, 1220, 1800, 2340, 2900, 3450, 4200]
  }),

  makeLevel({
    name: 'Black Lotus',
    theme: THEMES.lotus,
    width: 4600,
    ground: [
      [0, 480], [580, 420], [1080, 380], [1520, 420], [2000, 360],
      [2440, 420], [2920, 400], [3380, 340], [3780, 400], [4240, 360]
    ],
    ledges: [[420, 540, 100], [700, 470, 100], [1180, 540, 100], [1620, 470, 100], [2100, 540, 100], [2540, 470, 100], [3020, 540, 100], [3460, 470, 100], [3880, 540, 100]],
    spikes: [360, 700, 1200, 1700, 2150, 2600, 3100, 3550, 3950, 4350],
    enemies: [[220, 80, 55], [760, 80, 60], [1220, 80, 55], [1720, 90, 65], [2150, 70, 60], [2600, 80, 55], [3100, 70, 65], [3520, 60, 60], [4000, 80, 55], [4420, 70, 60]],
    traps: {
      spikes: [150, 900, 1900, 2300, 2750, 4100],
      blades: [
        [700, 300, 340, 38, 1600, 0],
        [2150, 300, 340, 38, 1600, 600],
        [3520, 300, 340, 38, 1600, 1100]
      ],
      crumbles: [[1000, 680, 90], [3720, 680, 70]]
    },
    combat: {
      shields: [[1650, 80, 50], [2500, 70, 55], [3900, 80, 60]],
      archers: [850, 3100, 4300],
      swords: [2650]
    },
    exit: [4480, GROUND_Y],
    lanterns: [150, 620, 1140, 1600, 2060, 2500, 2980, 3440, 3840, 4300]
  }),

  makeLevel({
    name: "The Emperor's Roof",
    theme: THEMES.emperor,
    width: 4600,
    ground: [
      [0, 460], [560, 380], [1040, 360], [1480, 420], [1980, 340],
      [2400, 300], [2760, 200], [3180, 460], [3740, 860]
    ],
    ledges: [[400, 540, 100], [680, 470, 100], [1120, 540, 100], [1580, 470, 100], [2080, 540, 100], [2480, 470, 100], [2840, 520, 100], [3300, 470, 100], [3680, 540, 100]],
    blocks: roofTwelve.blocks,
    spikes: [340, 700, 1200, 1700, 2200, 2550, 2850, 3400, 3800],
    enemies: [[220, 80, 55], [760, 80, 60], [1200, 80, 55], [1650, 80, 65], [2150, 70, 60], [2550, 60, 55], [2850, 50, 65], [3400, 90, 60], [4300, 90, 55]],
    traps: {
      spikes: [150, 900, 1550, 2050, 3250, 4150],
      blades: [
        [760, 300, 340, 40, 1500, 0],
        [2200, 300, 340, 40, 1500, 700],
        [3400, 300, 340, 40, 1500, 1200]
      ],
      crumbles: [[940, 680, 110], [2700, 680, 70]]
    },
    combat: {
      shields: [[1750, 80, 50], [3300, 80, 60]],
      archers: [800, 2550, 4200],
      swords: [2050]
    },
    exit: roofTwelve.exit,
    lanterns: [140, 660, 1160, 1620, 2100, 2520, 2880, 3300, 3760, 4400]
  }),

  makeLevel({
    name: "The Warlord's Hall",
    theme: THEMES.emperor,
    width: 1800,
    ground: [[0, 1800]],
    ledges: [[380, 540, 130], [900, 500, 130], [1380, 540, 130]],
    spikes: [],
    enemies: [],
    combat: {
      swords: [1000]
    },
    boss: [1440],
    exit: [1700, GROUND_Y],
    lanterns: [160, 600, 1100, 1660]
  })
];
