// The playable level. A hooded ninja runs the rooftops of a palace at night:
// he jumps the pits, cuts down the guards with his sword, dies on the spikes and
// at the hands of a guard, and clears the level by reaching the glowing door.
//
// Three lives, a short death animation, an instant restart from the HUD.
//
// The camera is given only the playfield viewport (the screen above the control
// band), so the controls can never sit on top of the action.

import { LEVELS, GROUND_H, LEDGE_H } from './levels.js';
import { markCleared, recordRun, recordEndless, loadProgress, addGems } from './progress.js';
import { todayTrial, claimTrial } from './trial.js';
import { buildSpriteTextures, createAnimations } from './sprites.js';
import { buildWorldTextures, buildSky } from './textures.js';
import { paintScenery, addMist, addFireflies, addEmbers } from './scenery.js';
import { weatherForLevel, weatherIntensity } from './weather.js';
import { computeLayout, VIEW } from './layout.js';
import { sound } from './sound.js';

const RUN_SPEED = 260;
const RUN_ACCELERATION = 2600;
const PLAYER_DRAG = 1600;
const JUMP_SPEED = 780;
const GRAVITY = 2000;
const COYOTE_MS = 90;
const JUMP_BUFFER_MS = 130;
const ATTACK_WINDOW_MS = 200;
const ATTACK_COOLDOWN_MS = 380;
const WALL_SLIDE_SPEED = 130;
const WALL_JUMP_X = 330;
const WALL_JUMP_Y = 740;
const WALL_JUMP_LOCK_MS = 175;
const WALL_COYOTE_MS = 110;
const DASH_SPEED = 560;
const DASH_MS = 210;
const DASH_RECOVERY_MS = 120;
const THROW_SPEED = 620;
const THROW_COOLDOWN_MS = 260;

const BOSS_PHASES = {
  1: { walk: 60, windup: 520, recover: 700, chargeSpeed: 360, chargeEvery: 4200, reach: 150 },
  2: { walk: 90, windup: 430, recover: 560, chargeSpeed: 470, chargeEvery: 3400, reach: 165 },
  3: { walk: 120, windup: 340, recover: 420, chargeSpeed: 580, chargeEvery: 2700, reach: 180 }
};
const SPAWN_LIVES = 3;
const PLAYER_BODY_W = 26;
const PLAYER_BODY_H = 54;
const PLAYER_BODY_X = 11;
const PLAYER_BODY_Y = 6;

const NO_INPUT = {
  left: false,
  right: false,
  blockHeld: false,
  dashPressed: false,
  shurikenPressed: false,
  jumpPressed: false,
  attackPressed: false,
  jumpHeld: false
};

function makeRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

// The warlord's hall is a fight, not a rooftop, so an endless run keeps to the
// twelve roofs before it and starts the loop again one step harder.
const ENDLESS_ROOFS = LEVELS.length - 1;

function nearAnything(x, level, enemies) {
  for (const def of enemies) {
    if (Math.abs(def.x - x) < 110) return true;
  }
  for (const spike of level.spikes) {
    if (Math.abs(spike - x) < 90) return true;
  }
  for (const spike of level.trapSpikes) {
    if (Math.abs(spike - x) < 90) return true;
  }
  for (const block of level.blocks) {
    if (x > block.x - 60 && x < block.x + block.w + 60) return true;
  }
  return false;
}

/// A roof with one guard added for every roof already crossed, each of them
/// standing on solid ground well clear of the spawn and the far door.
function endlessLevel(base, stage) {
  if (stage <= 0) return base;

  const extra = Math.min(6, stage);
  const enemies = base.enemies.map((def) => ({ ...def }));
  const random = makeRandom(base.width * 7 + stage * 131);

  for (let i = 0; i < extra; i += 1) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const span = base.ground[Math.floor(random() * base.ground.length)];
      if (!span) break;

      const x = span.x + 130 + random() * Math.max(1, span.w - 260);

      if (x < 430 || x > base.width - 220) continue;
      if (nearAnything(x, base, enemies)) continue;

      enemies.push({
        x,
        patrol: Math.min(70, Math.max(30, (span.w - 260) / 2)),
        speed: 55 + stage * 5,
        type: 'guard'
      });
      break;
    }
  }

  return { ...base, enemies };
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  // The roof to play, passed in when a node on the map is tapped. An endless
  // run passes the roof it has reached and the metres it has already covered.
  init(data) {
    const payload = data || {};

    this.endless = Boolean(payload.endless);
    this.endlessRoof = Math.max(0, Math.floor(Number(payload.roof) || 0));
    this.endlessMetres = Math.max(0, Number(payload.metres) || 0);

    if (this.endless) {
      this.levelIndex = this.endlessRoof % ENDLESS_ROOFS;
    } else {
      const index = typeof payload.level === 'number' ? payload.level : 0;
      this.levelIndex = Phaser.Math.Clamp(index, 0, LEVELS.length - 1);
    }

    this.level = LEVELS[this.levelIndex];

    // A daily trial run carries the day's targets, and pays out once they are
    // both met.
    this.trial = Boolean(payload.trial) && !this.endless;
    this.trialInfo = this.trial ? todayTrial() : null;
  }

  create() {
    buildWorldTextures(this);
    buildSky(this, `sky-${this.levelIndex}`, this.level.theme.sky);
    buildSpriteTextures(this);
    createAnimations(this);

    // A roof that followed straight from another keeps its music running.
    this.carryingMusic = false;

    // An endless run sends the same roofs past a little quicker every time, with
    // one more guard standing on each.
    this.pace = 1 + Math.min(0.8, this.endlessRoof * 0.06);
    if (this.endless) this.level = endlessLevel(this.level, this.endlessRoof);

    this.physics.world.setBounds(0, 0, this.level.width, this.level.height);
    this.physics.world.gravity.y = GRAVITY;

    // The stall's upgrades carry into every roof.
    const save = loadProgress();
    const upgrades = save.upgrades;
    this.maxLives = SPAWN_LIVES + upgrades.lives;
    this.lives = this.endless ? 1 : this.maxLives;
    this.dashRecoveryMs = Math.max(0, DASH_RECOVERY_MS - upgrades.dash * 40);
    this.reachBonus = upgrades.reach * 8;

    // The kunoichi runs faster and jumps higher, but cannot hold a block.
    this.hero = save.hero === 'kunoichi' ? 'kunoichi' : 'ninja';
    this.animPrefix = this.hero;
    this.jumpScale = this.hero === 'kunoichi' ? 1.1 : 1;
    this.runSpeed = RUN_SPEED * (this.hero === 'kunoichi' ? 1.12 : 1);
    this.jumpSpeed = JUMP_SPEED * this.jumpScale;
    this.shurikenMax = this.hero === 'kunoichi' ? 2 : 3;
    this.canBlock = this.hero === 'ninja';

    this.state = 'play';
    this.facing = 1;
    this.jumpQueuedAt = -9999;
    this.lastGroundAt = -9999;
    this.attackUntil = 0;
    this.attackReadyAt = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.airDashUsed = false;
    this.wallLockUntil = 0;
    this.lastWallAt = -9999;
    this.lastWallDir = 0;
    this.wallSliding = false;
    this.comboStep = 0;
    this.comboExpiresAt = 0;
    this.attackHeavy = false;
    this.blocking = false;
    this.blockSoundAt = 0;

    this.boss = null;
    this.bossAlive = false;
    this.bossHealth = 0;
    this.bossMaxHealth = 15;
    this.bossPhase = 1;
    this.bossMode = 'walk';
    this.bossModeUntil = 0;
    this.bossNextChargeAt = 0;
    this.bossNextSwingAt = 0;
    this.bossFacing = -1;
    this.guardsSummoned = false;
    this.swingId = 0;
    this.bossHitSwing = -1;

    this.paintBackdrop();
    this.buildLevel();
    this.buildGems();
    this.buildStars();
    this.buildTraps();
    this.buildPlayer();
    this.buildEnemies();
    this.connectPhysics();

    if (this.level.isBoss) this.buildBoss();

    this.registry.set('lives', this.lives);
    // An endless run has no lives to show: the HUD puts the score there instead.
    this.registry.set('maxLives', this.endless ? 0 : this.maxLives);
    this.registry.set('canBlock', this.canBlock);
    this.registry.set('endless', this.endless);
    this.registry.set('state', 'play');
    this.registry.set(
      'levelName',
      this.endless
        ? `ROOF ${this.endlessRoof + 1} — ${this.level.name}`
        : this.level.isBoss
          ? 'THE WARLORD'
          : this.level.name
    );

    // Every roof has its own weather; the HUD paints it.
    this.weatherKind = weatherForLevel(this.levelIndex);
    this.registry.set('weather', this.weatherKind);

    sound.playMusic('roof');

    this.scene.launch('Hud');

    this.layout(this.scale.gameSize);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      if (!this.carryingMusic) sound.stopMusic();
      if (this.scene.isActive('Hud')) this.scene.stop('Hud');
    });

    this.cameras.main.fadeIn(450, 6, 8, 16);
  }

  // ---------------------------------------------------------------- layout

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const geometry = computeLayout(width, height);
    const camera = this.cameras.main;

    camera.setViewport(0, 0, geometry.playWidth, geometry.playHeight);

    // Show at most VIEW.maxWidth of world across and never more than the level
    // is tall, so at any panel shape the playfield is full of game and the floor
    // always sits inside it.
    const zoom = Math.max(
      geometry.playWidth / VIEW.maxWidth,
      geometry.playHeight / VIEW.levelHeight
    );
    camera.setZoom(zoom);
    camera.setBounds(0, 0, this.level.width, this.level.height);
  }

  // ----------------------------------------------------------- background

  paintBackdrop() {
    const random = makeRandom(1337);
    const theme = this.level.theme;

    this.add
      .image(0, 0, `sky-${this.levelIndex}`)
      .setOrigin(0, 0)
      .setDisplaySize(this.level.width, this.level.height)
      .setDepth(-100);

    this.add
      .image(this.level.width * 0.26, 130, 'moon')
      .setScale(2.4)
      .setDepth(-99)
      .setAlpha(0.95)
      .setTint(theme.moon);

    const stars = this.add.graphics().setDepth(-98);
    stars.fillStyle(0xffffff, 0.75);
    for (let i = 0; i < 110; i += 1) {
      const x = random() * this.level.width;
      const y = random() * 430;
      const r = random() < 0.82 ? 0.9 : 1.7;
      stars.fillCircle(x, y, r);
    }

    // Two parallax layers of silhouette scenery, mist drifting between them, and
    // fireflies hanging in the air.
    paintScenery(this, this.level, this.levelIndex);
    addMist(this, this.level);
    addFireflies(this, this.level);
    addEmbers(this, this.level);
  }

  // ---------------------------------------------------------------- world

  addPlatform(x, topY, width, height) {
    this.add
      .tileSprite(x, topY, width, height, 'stone')
      .setOrigin(0, 0)
      .setDepth(2)
      .setTint(this.level.theme.stone);

    // A lit top lip so the walkable surface reads at a glance.
    this.add
      .rectangle(x, topY, width, 2, this.level.theme.accent, 0.32)
      .setOrigin(0, 0)
      .setDepth(3);
    this.add.rectangle(x, topY + height - 3, width, 3, 0x08060d, 0.55).setOrigin(0, 0).setDepth(3);

    const body = this.platforms.create(x + width / 2, topY + height / 2, 'stone');
    body.setVisible(false);
    body.setDisplaySize(width, height);
    body.refreshBody();
  }

  buildLevel() {
    this.platforms = this.physics.add.staticGroup();

    for (const segment of this.level.ground) {
      this.addPlatform(segment.x, this.level.groundY, segment.w, GROUND_H);
    }
    for (const ledge of this.level.ledges) {
      this.addPlatform(ledge.x, ledge.y, ledge.w, LEDGE_H);
    }
    for (const block of this.level.blocks) {
      this.addPlatform(block.x, block.y, block.w, block.h);
    }

    // Spikes: three steel points on a strip, dead on contact.
    this.spikes = this.physics.add.staticGroup();
    for (const centre of this.level.spikes) {
      const spike = this.spikes.create(centre, this.level.groundY, 'spike');
      spike.setOrigin(0.5, 1).setDepth(6);
      spike.refreshBody();
    }

    // Lanterns on posts along the rooftops.
    for (const lanternX of this.level.lanterns) {
      this.add
        .rectangle(lanternX, this.level.groundY - 52, 5, 104, 0x140f1e)
        .setDepth(1);
      this.add
        .image(lanternX, this.level.groundY - 112, 'glow')
        .setDepth(0)
        .setScale(1.3)
        .setAlpha(0.3)
        .setTint(0xffc86a);
      this.add.image(lanternX, this.level.groundY - 112, 'lantern').setDepth(1);

      // A pool of warm light spilled across the stone.
      this.add
        .image(lanternX, this.level.groundY - 18, 'glow')
        .setDepth(3)
        .setScale(3.4, 1.5)
        .setAlpha(0.22)
        .setTint(0xff5f6a)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    // The exit door, glowing so it is visible from a distance. The boss hall has
    // no door: the fight is the only way out.
    if (!this.level.isBoss) {
      this.exitGlow = this.add
        .image(this.level.exit.x, this.level.exit.y - 54, 'glow')
        .setDepth(4)
        .setScale(3)
        .setAlpha(0.45)
        .setTint(0xffd27a);
      this.pulseExitGlow();

      this.exit = this.physics.add.staticImage(this.level.exit.x, this.level.exit.y, 'door');
      this.exit.setOrigin(0.5, 1).setDepth(5);
      this.exit.refreshBody();
    }
  }

  pulseExitGlow() {
    this.tweens.add({
      targets: this.exitGlow,
      alpha: 0.85,
      scale: 3.7,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ------------------------------------------------------------------ gems

  /// Every gem in the level, bobbing in place, plus the clock the run is timed by.
  buildGems() {
    this.gemGroup = this.physics.add.staticGroup();
    this.gemList = [];
    this.gemsCollected = 0;
    this.deaths = 0;
    this.startedAt = this.time.now;
    this.finishedAt = 0;

    for (const [x, y] of this.level.gems) {
      const gem = this.gemGroup.create(x, y, 'gem');
      gem.setDepth(7);
      gem.homeX = x;
      gem.homeY = y;

      this.bobGem(gem);
      this.gemList.push(gem);
    }

    this.gemTotal = this.gemList.length;
  }

  bobGem(gem) {
    gem.setScale(0.8);
    this.tweens.add({
      targets: gem,
      y: gem.y - 8,
      scale: 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: (gem.homeX % 400) / 4
    });
  }

  collectGem(gem) {
    if (!gem.active) return;

    this.gemsCollected += 1;
    addGems(1);
    sound.play('gem');

    gem.disableBody(true, false);

    this.tweens.killTweensOf(gem);
    this.tweens.add({
      targets: gem,
      alpha: 0,
      scale: 1.8,
      duration: 220,
      onComplete: () => gem.setVisible(false)
    });
  }

  /// What the HUD reads each frame: the run's gems, clock and deaths.
  getRunStats() {
    const end = this.finishedAt || this.time.now;
    return {
      gems: this.gemsCollected,
      total: this.gemTotal,
      seconds: Math.max(0, (end - this.startedAt) / 1000),
      deaths: this.deaths,
      shurikens: this.shurikens,
      endless: this.endless ? this.getEndlessScore() : null
    };
  }

  // -------------------------------------------------------------- shuriken

  /// Throwing stars on the floor, and the pool the thrown ones fly from.
  buildStars() {
    this.starGroup = this.physics.add.staticGroup();
    this.starList = [];
    this.shurikenGroup = this.physics.add.group({ allowGravity: false });
    this.shurikens = this.shurikenMax;
    this.throwReadyAt = 0;

    for (const [x, y] of this.level.stars) {
      const star = this.starGroup.create(x, y, 'shuriken');
      star.setDepth(7).setScale(0.62);
      star.homeX = x;
      star.homeY = y;

      this.spinStar(star);
      this.starList.push(star);
    }
  }

  spinStar(star) {
    star.rotation = Math.random() * Math.PI;
    this.tweens.add({
      targets: star,
      rotation: star.rotation + Math.PI * 2,
      duration: 6000,
      repeat: -1
    });
  }

  collectStar(star) {
    if (!star.active) return;
    if (this.shurikens >= this.shurikenMax) return;

    this.shurikens = Math.min(this.shurikenMax, this.shurikens + 1);
    sound.play('gem');

    star.disableBody(true, false);
    this.tweens.killTweensOf(star);
    this.tweens.add({
      targets: star,
      alpha: 0,
      scale: 1.05,
      duration: 200,
      onComplete: () => star.setVisible(false)
    });
  }

  throwShuriken(time) {
    if (this.shurikens <= 0) return;
    if (time < this.throwReadyAt) return;

    this.shurikens -= 1;
    this.throwReadyAt = time + THROW_COOLDOWN_MS;

    const shuriken = this.shurikenGroup.create(
      this.player.x + this.facing * 20,
      this.player.y - 34,
      'shuriken'
    );

    shuriken.setDepth(10).setScale(0.55);
    shuriken.body.setAllowGravity(false);
    shuriken.setVelocityX(this.facing * THROW_SPEED);
    shuriken.spinSpeed = 0.45 * this.facing;

    sound.play('swing');

    this.time.delayedCall(1500, () => {
      if (shuriken.active) shuriken.destroy();
    });
  }

  shurikenHitsEnemy(shuriken, enemy) {
    if (!shuriken.active || !enemy.alive) return;

    shuriken.destroy();

    if (enemy.type === 'shield' && enemy.guarding) {
      enemy.guarding = false;
      enemy.reguardAt = this.time.now + 1100;
      enemy.setTint(0xffcf6a);
      this.time.delayedCall(180, () => {
        if (enemy.alive) enemy.clearTint();
      });

      this.spawnSparks(enemy.x + enemy.facing * 22, enemy.y - 36, true);
      this.cameras.main.shake(80, 0.005);
      sound.play('hit');
      return;
    }

    this.strikeEnemy(enemy);
  }

  shurikenHitsBoss(shuriken) {
    if (!shuriken.active) return;
    shuriken.destroy();
    this.damageBoss(2);
  }

  // ----------------------------------------------------------------- traps

  buildTraps() {
    this.shootingSpikes = [];
    this.bladeList = [];
    this.crumbleList = [];
    this.crumbles = this.physics.add.staticGroup();

    this.level.trapSpikes.forEach((x, index) => {
      this.createShootingSpikes(x, index);
    });

    for (const blade of this.level.blades) {
      this.createBlade(blade[0], blade[1], blade[2], blade[3], blade[4] / this.pace, blade[5]);
    }

    for (const ledge of this.level.crumbles) {
      this.createCrumble(ledge[0], ledge[1], ledge[2]);
    }
  }

  /// Floor spikes: a socket in the stone, a warning glow, then the points shoot
  /// up, hold for a moment and sink away again.
  createShootingSpikes(x, index) {
    const y = this.level.groundY;
    const accent = this.level.theme.accent;

    this.add.rectangle(x, y, 58, 8, 0x0f0a16, 1).setOrigin(0.5, 1).setDepth(4);

    const glow = this.add
      .rectangle(x, y - 3, 58, 5, accent, 0)
      .setOrigin(0.5, 1)
      .setDepth(4);

    const spikes = this.add
      .image(x, y - 2, 'spike')
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setAlpha(0)
      .setScale(1, 0.22);

    const trap = { x, y, spikes, glow, dangerous: false };

    this.time.addEvent({
      delay: 2600,
      startAt: 500 + index * 420,
      loop: true,
      callback: () => this.fireSpikeTrap(trap)
    });

    this.shootingSpikes.push(trap);
  }

  fireSpikeTrap(trap) {
    if (this.state !== 'play') return;

    sound.play('trap');

    // The socket glows twice before the points come up.
    trap.glow.setAlpha(0);
    this.tweens.add({
      targets: trap.glow,
      alpha: 0.9,
      duration: 130,
      yoyo: true,
      repeat: 1,
      onComplete: () => trap.glow.setAlpha(0)
    });

    this.time.delayedCall(280, () => {
      trap.dangerous = true;

      this.tweens.add({
        targets: trap.spikes,
        alpha: 1,
        scaleY: 1,
        duration: 90,
        ease: 'Back.easeOut'
      });

      this.time.delayedCall(520, () => {
        trap.dangerous = false;

        this.tweens.add({
          targets: trap.spikes,
          alpha: 0,
          scaleY: 0.22,
          duration: 180
        });
      });
    });
  }

  /// A blade on a chain, swinging across the corridor.
  createBlade(x, y, length, swing, period, phase) {
    const rig = this.add.container(x, y).setDepth(7);

    const chain = this.add.graphics();
    chain.lineStyle(3, 0x39314e, 0.95);
    chain.lineBetween(0, 0, 0, length - 30);
    chain.lineStyle(2, 0x5b5372, 0.9);
    for (let ring = 18; ring < length - 30; ring += 16) {
      chain.strokeCircle(0, ring, 3.5);
    }
    chain.lineStyle(2, 0x39314e, 0.95);
    chain.lineBetween(0, length - 30, 0, length - 18);

    const hub = this.add.circle(0, 0, 6, 0x241c33);
    hub.setStrokeStyle(2, this.level.theme.accent, 0.7);

    const blade = this.add.image(0, length, 'blade');

    rig.add([chain, hub, blade]);

    // The swing runs from one side to the other and back for ever.
    rig.angle = -swing;

    this.tweens.add({
      targets: rig,
      angle: swing,
      duration: Math.max(500, period / 2),
      delay: phase,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.bladeList.push({ rig, x, y, length });
  }

  /// A ledge that shakes when stepped on, then drops away for a while.
  createCrumble(x, y, width) {
    const theme = this.level.theme;

    const visual = this.add
      .tileSprite(x, y, width, LEDGE_H, 'stone')
      .setOrigin(0, 0)
      .setDepth(2)
      .setTint(theme.stone);

    const lip = this.add
      .rectangle(x, y, width, 2, theme.accent, 0.32)
      .setOrigin(0, 0)
      .setDepth(3);

    const body = this.crumbles.create(x + width / 2, y + LEDGE_H / 2, 'stone');
    body.setVisible(false);
    body.setDisplaySize(width, LEDGE_H);
    body.refreshBody();

    const trap = { x, y, width, visual, lip, body, state: 'solid' };
    body.trap = trap;
    this.crumbleList.push(trap);
  }

  touchCrumble(trap) {
    if (trap.state !== 'solid') return;

    trap.state = 'shaking';
    sound.play('trap');

    this.tweens.add({
      targets: [trap.visual, trap.lip],
      x: '+=3',
      duration: 55,
      yoyo: true,
      repeat: 5
    });

    this.time.delayedCall(620, () => this.dropCrumble(trap));
  }

  dropCrumble(trap) {
    if (trap.state !== 'shaking') return;

    trap.state = 'falling';
    if (trap.body.body) trap.body.body.enable = false;

    this.tweens.add({
      targets: [trap.visual, trap.lip],
      y: trap.y + 300,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeIn'
    });

    this.time.delayedCall(3200, () => this.resetCrumble(trap));
  }

  resetCrumble(trap) {
    this.tweens.killTweensOf(trap.visual);
    this.tweens.killTweensOf(trap.lip);

    trap.visual.setPosition(trap.x, trap.y).setAlpha(1);
    trap.lip.setPosition(trap.x, trap.y).setAlpha(1);

    if (trap.body.body) trap.body.body.enable = true;
    trap.state = 'solid';
  }

  updateTraps() {
    const center = this.player.body.center;

    for (const blade of this.bladeList) {
      const radians = Phaser.Math.DegToRad(blade.rig.angle);
      const bladeX = blade.x + Math.sin(radians) * blade.length;
      const bladeY = blade.y + Math.cos(radians) * blade.length;

      if (Phaser.Math.Distance.Between(bladeX, bladeY, center.x, center.y) < 30) {
        if (this.blocking) {
          if (this.time.now > this.blockSoundAt) {
            this.blockSoundAt = this.time.now + 300;
            sound.play('hit');
            this.cameras.main.shake(60, 0.004);
          }
        } else {
          this.killPlayer();
          return;
        }
      }
    }

    const body = this.player.body;
    const playerRect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);

    for (const trap of this.shootingSpikes) {
      if (!trap.dangerous) continue;

      const spikeRect = new Phaser.Geom.Rectangle(trap.x - 26, trap.y - 24, 52, 24);
      if (Phaser.Geom.Rectangle.Overlaps(spikeRect, playerRect)) {
        this.killPlayer();
        return;
      }
    }
  }

  // --------------------------------------------------------------- player

  buildPlayer() {
    this.player = this.physics.add.sprite(this.level.spawn.x, this.level.spawn.y, this.hero, 0);
    this.player.setOrigin(0.5, 1).setDepth(9);
    this.player.body.setSize(PLAYER_BODY_W, PLAYER_BODY_H);
    this.player.body.setOffset(PLAYER_BODY_X, PLAYER_BODY_Y);
    // The arcade body is built from the sprite's top-left at creation, so give
    // it a position that matches the origin change and the body offset.
    this.player.body.reset(this.level.spawn.x, this.level.spawn.y);
    this.player.setMaxVelocity(this.runSpeed, 1400);
    this.player.setDragX(PLAYER_DRAG);
    this.player.anims.play(`${this.animPrefix}-idle`);

    // The scarf is its own cloth ribbon, drawn behind the ninja each frame.
    this.scarf = this.add.graphics().setDepth(8.5);
    this.wasGrounded = true;
    this.lastFallSpeed = 0;

    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
  }

  buildEnemies() {
    this.enemyGroup = this.physics.add.group();
    this.enemyList = [];
    this.arrows = this.physics.add.group({ allowGravity: false });

    for (const def of this.level.enemies) {
      const type = def.type || 'guard';
      const texture =
        type === 'archer' ? 'archer' : type === 'sword' ? 'swordmaster' : 'guard';
      const enemy = this.enemyGroup.create(def.x, this.level.groundY, texture);

      enemy.setOrigin(0.5, 1).setDepth(8);
      enemy.body.setSize(PLAYER_BODY_W, PLAYER_BODY_H);
      enemy.body.setOffset(PLAYER_BODY_X, PLAYER_BODY_Y);
      enemy.body.reset(def.x, this.level.groundY);
      enemy.setMaxVelocity(200, 1400);
      const anim =
        type === 'archer'
          ? 'archer-walk'
          : type === 'sword'
            ? 'swordmaster-idle'
            : 'guard-walk';
      enemy.anims.play(anim);

      enemy.type = type;
      enemy.facing = -1;
      enemy.nextTurnAt = 0;
      enemy.nextShotAt = 0;
      enemy.guarding = type === 'shield';
      enemy.reguardAt = 0;
      enemy.patrolMin = def.x - def.patrol;
      enemy.patrolMax = def.x + def.patrol;
      enemy.patrolSpeed = (def.speed || 0) * this.pace;
      enemy.homeX = def.x;
      enemy.alive = true;

      if (type !== 'archer' && type !== 'sword') enemy.setVelocityX(-enemy.patrolSpeed);
      if (type === 'archer' || type === 'sword') enemy.setVelocityX(0);

      if (type === 'sword') {
        enemy.state = 'watch';
        enemy.stateUntil = 0;
        enemy.openUntil = 0;
        enemy.nextActionAt = this.time.now + 900;
        enemy.flurryHits = 0;
      }

      if (type === 'shield') {
        enemy.shieldImage = this.add
          .image(def.x, this.level.groundY - 34, 'shield')
          .setDepth(9)
          .setScale(0.62);
      }

      this.enemyList.push(enemy);
    }
  }

  connectPhysics() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemyGroup, this.platforms);

    // Crumbling ledges hold the ninja up until they give way.
    this.physics.add.collider(this.player, this.crumbles, (_player, ledge) => {
      if (ledge.trap) this.touchCrumble(ledge.trap);
    });

    this.physics.add.overlap(this.player, this.spikes, () => this.killPlayer());
    this.physics.add.overlap(this.player, this.enemyGroup, (_player, enemy) => {
      if (enemy.alive && enemy.type !== 'sword') this.killPlayer();
    });
    if (this.exit) {
      this.physics.add.overlap(this.player, this.exit, () =>
        this.endless ? this.advanceRoof() : this.completeLevel()
      );
    }
    this.physics.add.overlap(this.player, this.gemGroup, (_player, gem) =>
      this.collectGem(gem)
    );
    this.physics.add.overlap(this.player, this.starGroup, (_player, star) =>
      this.collectStar(star)
    );

    // Thrown shuriken cut through enemies, stop at walls, and drop after a moment.
    this.physics.add.overlap(this.shurikenGroup, this.enemyGroup, (shuriken, enemy) =>
      this.shurikenHitsEnemy(shuriken, enemy)
    );
    this.physics.add.collider(this.shurikenGroup, this.platforms, (shuriken) =>
      shuriken.destroy()
    );

    // Arrows fly until they hit a wall, the ninja, or a raised guard.
    this.physics.add.overlap(this.player, this.arrows, (_player, arrow) =>
      this.hitArrow(arrow)
    );
    this.physics.add.collider(this.arrows, this.platforms, (arrow) => arrow.destroy());
  }

  // ---------------------------------------------------------------- frame

  update(time) {
    // Pumps the audio scheduler, so no separate timer is needed for music.
    sound.update();

    if (this.player && this.scarf) this.updateScarf();

    // Thrown shuriken keep spinning on their way across the screen.
    if (this.shurikenGroup) {
      this.shurikenGroup.getChildren().forEach((shuriken) => {
        if (shuriken.active) shuriken.rotation += shuriken.spinSpeed || 0.35;
      });
    }

    if (this.state === 'play') {
      this.drivePlayer(this.readInput(), time);
      this.walkEnemies(time);
      this.updateArchers(time);
      this.updateSwords(time);
      this.updateTraps();
      if (this.bossAlive) this.updateBoss(time);

      if (this.player.y > this.level.height + 90) this.killPlayer();
    } else {
      this.stopEnemies();
    }
  }

  readInput() {
    const hud = this.scene.get('Hud');
    return hud && hud.controls ? hud.controls.read() : NO_INPUT;
  }

  drivePlayer(input, time) {
    const body = this.player.body;
    const grounded = body.blocked.down || body.touching.down;

    if (grounded) {
      if (!this.wasGrounded) {
        const impact = this.lastFallSpeed || 0;
        if (impact > 240) {
          this.spawnDust(this.player.x, this.player.y, Math.min(7, 2 + Math.round(impact / 200)));
        }
      }

      this.lastGroundAt = time;
      this.airDashUsed = false;
    }

    // Which way, if either, a wall is being touched.
    const touchingRight = body.blocked.right || body.touching.right;
    const touchingLeft = body.blocked.left || body.touching.left;
    const wallDir = touchingRight ? 1 : touchingLeft ? -1 : 0;

    if (wallDir !== 0) {
      this.lastWallAt = time;
      this.lastWallDir = wallDir;
    }

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dashing = time < this.dashUntil;

    if (this.dashUntil > 0 && time >= this.dashUntil) this.endDash();

    // Arcade drag only bites when acceleration is zero, which is exactly when a
    // dash or a wall kick is in charge, so it is switched off for those moments
    // or it would eat the burst before it has carried.
    const freeControl = !dashing && time >= this.wallLockUntil;
    const weatherStrength = weatherIntensity(this.weatherKind, time);
    const grip = this.weatherKind === 'rain' ? 0.45 : 1;
    this.player.setDragX(freeControl ? PLAYER_DRAG * grip : 0);

    if (dir !== 0 && !dashing && time >= this.wallLockUntil) this.facing = dir;

    if (dashing) {
      this.player.setAccelerationX(0);
      body.setVelocityY(-30);
    } else if (time < this.wallLockUntil) {
      // A wall kick owns the horizontal movement for a moment, so the push off
      // the wall actually carries instead of being cancelled by the stick.
      this.player.setAccelerationX(0);
    } else if (dir !== 0) {
      this.player.setAccelerationX(dir * RUN_ACCELERATION);
    } else {
      this.player.setAccelerationX(0);
    }

    if (!dashing && time >= this.wallLockUntil) {
      if (body.velocity.x > 12) this.facing = 1;
      else if (body.velocity.x < -12) this.facing = -1;
    }
    this.player.setFlipX(this.facing < 0);

    // Wall slide: pressing into a wall in the air turns a fall into a slide.
    const wallSliding =
      !grounded && !dashing && wallDir !== 0 && dir === wallDir && body.velocity.y > 0;
    this.wallSliding = wallSliding;
    if (wallSliding) body.setVelocityY(Math.min(body.velocity.y, WALL_SLIDE_SPEED));

    // Dash: one burst per jump, with an afterimage trail behind it.
    if (input.dashPressed && !grounded && !dashing && !this.airDashUsed && time >= this.dashReadyAt) {
      this.startDash(time);
    }

    // Block: a guard the ninja can hold to turn aside arrows and blades, at the
    // cost of moving at half speed while it is up.
    this.blocking =
      Boolean(input.blockHeld) && this.canBlock && !dashing && time >= this.attackUntil;
    this.updateBlockState();

    // Snow underfoot slows the ninja a little while it settles.
    if (!dashing && !this.blocking) {
      const snowGrip = this.weatherKind === 'snow' ? 1 - 0.18 * weatherStrength : 1;
      this.player.setMaxVelocity(this.runSpeed * snowGrip, 1400);
    }

    // Jump from the ground, or kicked off a wall.
    if (input.jumpPressed) this.jumpQueuedAt = time;

    if (time - this.jumpQueuedAt <= JUMP_BUFFER_MS) {
      const canGroundJump = grounded || time - this.lastGroundAt <= COYOTE_MS;

      // A wall the ninja is on right now, or one he has only just left, which
      // keeps a slightly late kick working.
      let kickDir = 0;
      if (wallDir !== 0) kickDir = wallDir;
      else if (time - this.lastWallAt <= WALL_COYOTE_MS) kickDir = this.lastWallDir;

      if (canGroundJump) {
        this.player.setVelocityY(-this.jumpSpeed);
        this.jumpQueuedAt = -9999;
        this.lastGroundAt = -9999;
        sound.play('jump');
      } else if (kickDir !== 0) {
        this.wallJump(kickDir, time);
      }
    }

    if (!grounded) this.playAnim('jump');
    else if (Math.abs(body.velocity.x) > 24) this.playAnim('run');
    else this.playAnim('idle');

    if (input.attackPressed && time >= this.attackReadyAt) {
      // A third tap inside the window becomes the heavy finisher.
      const step = time <= this.comboExpiresAt ? Math.min(2, this.comboStep + 1) : 0;
      const heavy = step === 2;

      this.comboStep = step;
      this.attackHeavy = heavy;
      this.swingId += 1;
      this.attackReadyAt = time + (heavy ? 520 : 300);
      this.attackUntil = time + (heavy ? 300 : 190);
      this.comboExpiresAt = this.attackUntil + 480;
      this.swingSword(heavy);

      if (heavy) this.cameras.main.shake(90, 0.004);
    }

    if (time <= this.attackUntil) this.checkSwordHits();

    if (input.shurikenPressed) this.throwShuriken(time);

    this.wasGrounded = grounded;
    this.lastFallSpeed = body.velocity.y;
  }

  /// A ribbon of cloth trailing behind the ninja, waving harder the faster he runs.
  updateScarf() {
    const g = this.scarf;
    g.clear();

    const speed = Math.abs(this.player.body.velocity.x);
    const neckX = this.player.x - this.facing * 6;
    const neckY = this.player.y - 44;
    const segments = 7;
    const step = 4 + Math.min(10, speed * 0.02);

    const upper = [];
    const lower = [];

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const wave = Math.sin(this.time.now * 0.007 + i * 0.9) * (2.5 + speed * 0.02) * t;
      const x = neckX - this.facing * (8 + i * step);
      const y = neckY + t * 10 + wave;
      const halfWidth = 4.5 * (1 - t * 0.85);

      upper.push(new Phaser.Math.Vector2(x, y - halfWidth));
      lower.push(new Phaser.Math.Vector2(x, y + halfWidth));
    }

    const shape = upper.concat(lower.reverse());

    g.fillStyle(0xc9374f, 0.95);
    g.fillPoints(shape, true);
    g.lineStyle(1.5, 0x8f1f36, 0.9);
    g.strokePoints(shape, true);
  }

  /// Puffs of dust kicked up where the ninja lands.
  spawnDust(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const puff = this.add
        .image(x, y - 6, 'glow')
        .setDepth(7)
        .setScale(0.06)
        .setAlpha(0.45)
        .setTint(0xcfc7e8);

      const angle = Math.random() * Math.PI * 2;

      this.tweens.add({
        targets: puff,
        x: x + Math.cos(angle) * (20 + Math.random() * 34),
        y: y - 6 - Math.random() * 16,
        scale: 0.12 + Math.random() * 0.06,
        alpha: 0,
        duration: 320 + Math.random() * 160,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy()
      });
    }
  }

  /// Bright sparks where the blade bites.
  spawnSparks(x, y, heavy) {
    const count = heavy ? 9 : 5;

    for (let i = 0; i < count; i += 1) {
      const spark = this.add
        .image(x, y, 'glow')
        .setDepth(12)
        .setScale(0.045 + Math.random() * 0.02)
        .setAlpha(0.9)
        .setTint(i % 2 === 0 ? 0xfff2c4 : 0xffc861);

      const angle = Math.random() * Math.PI * 2;
      const distance = 16 + Math.random() * (heavy ? 46 : 30);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.02,
        duration: 220 + Math.random() * 160,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  playAnim(name) {
    const key = `${this.animPrefix}-${name}`;
    const current = this.player.anims.currentAnim;
    if (!current || current.key !== key) this.player.anims.play(key, true);
  }

  /// Pushes off a wall: away from it, and upward. The short lock that follows
  /// stops the stick from cancelling the kick before it has carried.
  wallJump(wallDir, time) {
    const away = -wallDir;

    this.player.setVelocity(away * WALL_JUMP_X, -WALL_JUMP_Y * this.jumpScale);
    this.facing = away;
    this.player.setFlipX(away < 0);

    this.wallLockUntil = time + WALL_JUMP_LOCK_MS;
    this.jumpQueuedAt = -9999;
    this.lastGroundAt = -9999;
    this.lastWallAt = -9999;
    this.airDashUsed = false;
    this.wallSliding = false;

    sound.play('jump');
  }

  startDash(time) {
    this.airDashUsed = true;
    this.dashUntil = time + DASH_MS;
    this.dashReadyAt = time + DASH_MS + this.dashRecoveryMs;

    this.player.body.setAllowGravity(false);
    this.player.setMaxVelocity(DASH_SPEED, 1400);
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(this.facing * DASH_SPEED, -30);

    sound.play('dash');

    this.spawnAfterimage();
    this.time.addEvent({
      delay: 34,
      repeat: Math.max(1, Math.round(DASH_MS / 34) - 1),
      callback: () => this.spawnAfterimage()
    });
  }

  endDash() {
    this.dashUntil = 0;
    this.player.body.setAllowGravity(true);
    this.player.setMaxVelocity(this.runSpeed, 1400);
  }

  /// A fading copy of the ninja, left where he was a moment ago.
  spawnAfterimage() {
    const frame = this.player.frame;
    if (!frame) return;

    const ghost = this.add
      .image(this.player.x, this.player.y, this.hero, frame.name)
      .setOrigin(0.5, 1)
      .setDepth(8)
      .setFlipX(this.player.flipX)
      .setTint(0x8f7fe0)
      .setAlpha(0.45);

    this.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy()
    });
  }

  // ------------------------------------------------------------------ boss

  buildBoss() {
    const boss = this.physics.add.sprite(this.level.bossX, this.level.groundY, 'warlord', 0);

    boss.setOrigin(0.5, 1).setScale(1.35).setDepth(9);
    boss.body.setSize(44, 80);
    boss.body.setOffset(14, 10);
    boss.body.reset(this.level.bossX, this.level.groundY);
    boss.setMaxVelocity(700, 1400);
    boss.body.setImmovable(true);
    boss.setCollideWorldBounds(true);
    boss.anims.play('warlord-walk');

    this.boss = boss;
    this.bossAlive = true;
    this.bossHealth = this.bossMaxHealth;
    this.bossPhase = 1;
    this.bossFacing = -1;
    this.bossMode = 'intro';
    this.bossModeUntil = this.time.now + 1800;
    this.bossNextSwingAt = this.time.now + 2000;
    this.bossNextChargeAt = this.time.now + 4200;

    this.physics.add.collider(boss, this.platforms);
    this.physics.add.collider(this.player, boss);
    this.physics.add.overlap(this.shurikenGroup, boss, (shuriken) =>
      this.shurikenHitsBoss(shuriken)
    );

    // The hall goes quiet for a moment while the warlord sizes up the ninja.
    this.state = 'intro';
    this.cameras.main.shake(320, 0.006);
    sound.play('heavy');

    this.time.delayedCall(1900, () => {
      if (this.state === 'intro') this.state = 'play';
    });
  }

  getBossInfo() {
    if (!this.bossAlive || !this.boss) return null;
    return { name: 'THE WARLORD', health: this.bossHealth, max: this.bossMaxHealth };
  }

  updateBoss() {
    const boss = this.boss;
    if (!boss || !this.bossAlive) return;

    const cfg = BOSS_PHASES[this.bossPhase];
    const time = this.time.now;
    const dx = this.player.x - boss.x;
    const facing = dx < 0 ? -1 : 1;
    const distance = Math.abs(dx);

    switch (this.bossMode) {
      case 'intro':
        if (time > this.bossModeUntil) this.bossMode = 'walk';
        break;

      case 'walk':
        boss.setFlipX(facing < 0);
        this.bossFacing = facing;

        if (distance < cfg.reach && time > this.bossNextSwingAt) {
          this.bossMode = 'windup';
          this.bossModeUntil = time + cfg.windup;
          boss.setVelocityX(0);
          boss.setTint(0xffb27a);
          sound.play('heavy');
        } else if (time > this.bossNextChargeAt && distance > 220) {
          this.bossMode = 'telle';
          this.bossModeUntil = time + 480;
          boss.setVelocityX(0);
          this.cameras.main.shake(220, 0.004);
          sound.play('trap');
        } else {
          boss.setVelocityX(facing * cfg.walk);
        }
        break;

      case 'windup':
        if (time > this.bossModeUntil) {
          boss.clearTint();
          this.bossMode = 'swing';
          this.bossModeUntil = time + 240;
          this.bossSwing(cfg);
        }
        break;

      case 'swing':
        if (time > this.bossModeUntil) {
          this.bossMode = 'recover';
          this.bossModeUntil = time + cfg.recover;
          this.bossNextSwingAt = time + 260;
        }
        break;

      case 'recover':
        if (time > this.bossModeUntil) this.bossMode = 'walk';
        break;

      case 'telle':
        boss.setVelocityX(0);
        if (time > this.bossModeUntil) {
          this.bossMode = 'charge';
          this.bossModeUntil = time + 1300;
          boss.setVelocityX(facing * cfg.chargeSpeed);
          this.bossFacing = facing;
          sound.play('heavy');
        }
        break;

      case 'charge': {
        const b = boss.body;
        const p = this.player.body;
        const bossRect = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
        const playerRect = new Phaser.Geom.Rectangle(p.x, p.y, p.width, p.height);

        if (Phaser.Geom.Rectangle.Overlaps(bossRect, playerRect)) {
          if (this.blocking) {
            this.blocking = false;
            this.player.setVelocityX(-this.bossFacing * 320);
            this.spawnSparks(this.player.x, this.player.y - 34, false);
            this.cameras.main.shake(120, 0.006);
          } else {
            this.killPlayer();
          }
        }

        const hitWall = boss.body.blocked.left || boss.body.blocked.right;

        if (time > this.bossModeUntil || hitWall) {
          boss.setVelocityX(0);
          this.bossMode = 'stun';
          this.bossModeUntil = time + 900;
          this.bossNextChargeAt = time + cfg.chargeEvery;
          this.cameras.main.shake(240, 0.008);
        }
        break;
      }

      case 'stun':
        this.bossNextChargeAt = time + 1200;
        if (time > this.bossModeUntil) this.bossMode = 'walk';
        break;

      default:
        this.bossMode = 'walk';
        break;
    }
  }

  /// The warlord's heavy blade, swung in front of him.
  bossSwing(cfg) {
    const boss = this.boss;

    this.spawnSlashArc(boss.x + this.bossFacing * 40, boss.y - 50, true, 0);
    sound.play('heavy');

    const reach = cfg.reach + 20;
    const left = this.bossFacing > 0 ? boss.x + 6 : boss.x - reach - 6;
    const rect = new Phaser.Geom.Rectangle(left, boss.y - 130, reach, 130);

    const p = this.player.body;
    const playerRect = new Phaser.Geom.Rectangle(p.x, p.y, p.width, p.height);

    if (!Phaser.Geom.Rectangle.Overlaps(rect, playerRect)) return;

    if (this.blocking) {
      this.blocking = false;
      this.player.setVelocityX(-this.bossFacing * 360);
      this.spawnSparks(this.player.x + this.bossFacing * 20, this.player.y - 34, true);
      this.cameras.main.shake(140, 0.007);
      sound.play('hit');
      return;
    }

    this.killPlayer();
  }

  damageBoss(amount) {
    if (!this.bossAlive) return;

    this.bossHealth = Math.max(0, this.bossHealth - amount);
    sound.play('hit');
    this.cameras.main.shake(120, 0.006);
    this.spawnSparks(this.boss.x, this.boss.y - 60, amount > 1);

    this.boss.setTint(0xff9d7a);
    this.time.delayedCall(120, () => {
      if (this.boss && this.boss.active) this.boss.clearTint();
    });

    if (this.bossHealth <= 0) {
      this.defeatBoss();
      return;
    }

    const ratio = this.bossHealth / this.bossMaxHealth;
    if (this.bossPhase === 1 && ratio <= 0.66) this.enterBossPhase(2);
    else if (this.bossPhase === 2 && ratio <= 0.34) this.enterBossPhase(3);
  }

  enterBossPhase(phase) {
    this.bossPhase = phase;
    this.bossMode = 'stun';
    this.bossModeUntil = this.time.now + 600;
    this.boss.setVelocityX(0);
    this.cameras.main.shake(300, 0.01);
    this.cameras.main.flash(200, 255, 200, 120);
    sound.play('heavy');

    if (phase === 2) this.summonBossGuards();
  }

  summonBossGuards() {
    if (this.guardsSummoned) return;
    this.guardsSummoned = true;

    const xs = [this.boss.x - 130, this.boss.x + 130];

    for (const rawX of xs) {
      const x = Math.max(60, Math.min(this.level.width - 60, rawX));
      const guard = this.enemyGroup.create(x, this.level.groundY, 'guard');

      guard.setOrigin(0.5, 1).setDepth(8);
      guard.body.setSize(PLAYER_BODY_W, PLAYER_BODY_H);
      guard.body.setOffset(PLAYER_BODY_X, PLAYER_BODY_Y);
      guard.body.reset(x, this.level.groundY);
      guard.setMaxVelocity(200, 1400);
      guard.anims.play('guard-walk');

      guard.type = 'guard';
      guard.facing = -1;
      guard.nextTurnAt = 0;
      guard.nextShotAt = 0;
      guard.guarding = false;
      guard.reguardAt = 0;
      guard.patrolMin = Math.max(20, x - 80);
      guard.patrolMax = Math.min(this.level.width - 40, x + 80);
      guard.patrolSpeed = 70;
      guard.homeX = x;
      guard.alive = true;
      guard.setVelocityX(-70);

      this.enemyList.push(guard);
    }
  }

  defeatBoss() {
    this.bossAlive = false;
    this.state = 'bossdown';

    const boss = this.boss;
    boss.setVelocity(0, 0);
    boss.body.enable = false;
    boss.clearTint();

    this.cameras.main.shake(500, 0.012);
    this.spawnSparks(boss.x, boss.y - 60, true);

    this.tweens.add({
      targets: boss,
      angle: 82,
      y: boss.y - 6,
      alpha: 0.55,
      duration: 900,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(1500, () => {
      if (this.state === 'bossdown') this.completeLevel(true);
    });
  }

  resetBoss() {
    const boss = this.boss;
    if (!boss) return;

    this.tweens.killTweensOf(boss);

    this.bossAlive = true;
    this.bossHealth = this.bossMaxHealth;
    this.bossPhase = 1;
    this.bossMode = 'walk';
    this.bossModeUntil = this.time.now + 800;
    this.bossNextSwingAt = this.time.now + 1400;
    this.bossNextChargeAt = this.time.now + 3200;
    this.bossHitSwing = -1;
    this.guardsSummoned = false;

    boss.setAngle(0).setAlpha(1).clearTint();
    boss.setVelocity(0, 0);
    boss.body.enable = true;
    boss.body.reset(this.level.bossX, this.level.groundY);
    boss.anims.play('warlord-walk', true);
  }

  swingSword(heavy) {
    sound.play(heavy ? 'heavy' : 'swing');

    if (!this.slash) {
      this.slash = this.add.image(0, 0, 'slash').setDepth(10).setVisible(false);
    }

    this.slash
      .setPosition(this.player.x + this.facing * (heavy ? 48 : 40), this.player.y - 34)
      .setFlipX(this.facing < 0)
      .setTint(heavy ? 0xffd27a : 0xffffff)
      .setAlpha(1)
      .setScale(heavy ? 1 : 0.72)
      .setVisible(true);

    this.tweens.killTweensOf(this.slash);
    this.tweens.add({
      targets: this.slash,
      alpha: 0,
      scale: heavy ? 1.75 : 1.15,
      duration: heavy ? 250 : 190,
      ease: 'Quad.easeOut',
      onComplete: () => this.slash.setVisible(false)
    });

    // A couple of trailing arcs give the cut its motion.
    this.spawnSlashArc(this.slash.x, this.slash.y, heavy, 12);
    this.spawnSlashArc(this.slash.x, this.slash.y, heavy, 26);
  }

  spawnSlashArc(x, y, heavy, offset) {
    const arc = this.add
      .image(x - this.facing * offset, y + offset * 0.15, 'slash')
      .setDepth(9)
      .setFlipX(this.facing < 0)
      .setTint(0xffe0a0)
      .setAlpha(0.45)
      .setScale(heavy ? 1.15 : 0.9);

    this.tweens.add({
      targets: arc,
      alpha: 0,
      scale: heavy ? 1.9 : 1.5,
      x: arc.x - this.facing * 16,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => arc.destroy()
    });
  }

  checkSwordHits() {
    const heavy = this.attackHeavy;
    const width = (heavy ? 78 : 56) + (this.reachBonus || 0);
    const height = (heavy ? 62 : 50) + Math.round((this.reachBonus || 0) * 0.5);
    const left = this.facing > 0 ? this.player.x + 2 : this.player.x - width - 2;
    const box = new Phaser.Geom.Rectangle(left, this.player.y - height, width, height);

    for (const enemy of this.enemyList) {
      if (!enemy.alive) continue;
      const body = enemy.body;
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (Phaser.Geom.Rectangle.Overlaps(box, rect)) this.strikeEnemy(enemy);
    }

    if (this.bossAlive && this.bossHitSwing !== this.swingId) {
      const b = this.boss.body;
      const bossRect = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
      if (Phaser.Geom.Rectangle.Overlaps(box, bossRect)) {
        this.bossHitSwing = this.swingId;
        this.damageBoss(this.attackHeavy ? 2 : 1);
      }
    }
  }

  strikeEnemy(enemy) {
    // The swordmaster turns aside anything thrown at him outside the beat after
    // his own swing, so the trade has to come after his flurry.
    if (enemy.type === 'sword' && this.time.now > (enemy.openUntil || 0)) {
      this.spawnSparks(enemy.x + enemy.facing * 20, enemy.y - 36, false);
      this.cameras.main.shake(70, 0.004);
      sound.play('hit');
      this.player.setVelocityX(-this.facing * 180);
      return;
    }

    // A blow already turned aside does not land again during the opening it left.
    if (enemy.blockCooldownUntil && this.time.now < enemy.blockCooldownUntil) return;

    // A shield guard facing the blow turns it aside with a clang, which leaves
    // it open for a moment. A hit from behind never meets the shield.
    if (enemy.type === 'shield' && enemy.guarding) {
      const side = this.player.x < enemy.x ? -1 : 1;

      if (enemy.facing === side) {
        enemy.guarding = false;
        enemy.reguardAt = this.time.now + 1100;
        enemy.blockCooldownUntil = this.time.now + 260;
        enemy.setTint(0xffcf6a);
        this.time.delayedCall(180, () => {
          if (enemy.alive) enemy.clearTint();
        });

        this.cameras.main.shake(80, 0.005);
        sound.play('hit');
        this.spawnSparks(enemy.x + enemy.facing * 22, enemy.y - 36, false);
        return;
      }
    }

    enemy.alive = false;
    enemy.guarding = false;
    if (enemy.shieldImage) enemy.shieldImage.setVisible(false);
    sound.play('hit');
    this.spawnSparks(enemy.x, enemy.y - 36, this.attackHeavy);
    enemy.setVelocity(0, 0);
    enemy.disableBody(true, false);

    this.cameras.main.shake(90, 0.005);

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      y: enemy.y - 26,
      angle: 70,
      duration: 280,
      ease: 'Quad.easeIn',
      onComplete: () => enemy.setVisible(false)
    });
  }

  walkEnemies(time) {
    for (const enemy of this.enemyList) {
      if (!enemy.alive) continue;

      // Archers and swordmasters hold their ground; their business is elsewhere.
      if (enemy.type === 'archer' || enemy.type === 'sword') continue;

      if (enemy.type === 'shield') {
        if (time > enemy.reguardAt) enemy.guarding = true;

        const near = Math.abs(this.player.x - enemy.x);

        if (near < 340) {
          enemy.setVelocityX(0);
          if (time > enemy.nextTurnAt) {
            const side = this.player.x < enemy.x ? -1 : 1;
            enemy.facing = side;
            enemy.setFlipX(side < 0);
            enemy.nextTurnAt = time + 900;
          }
        } else {
          if (enemy.x <= enemy.patrolMin) enemy.facing = 1;
          else if (enemy.x >= enemy.patrolMax) enemy.facing = -1;
          enemy.facing = enemy.facing || 1;
          enemy.setVelocityX(enemy.facing * enemy.patrolSpeed);
          enemy.setFlipX(enemy.facing < 0);
        }
      } else {
        if (enemy.x <= enemy.patrolMin) {
          enemy.facing = 1;
          enemy.setVelocityX(enemy.patrolSpeed);
          enemy.setFlipX(false);
        } else if (enemy.x >= enemy.patrolMax) {
          enemy.facing = -1;
          enemy.setVelocityX(-enemy.patrolSpeed);
          enemy.setFlipX(true);
        }
      }

      if (enemy.shieldImage) {
        enemy.shieldImage
          .setVisible(enemy.guarding)
          .setPosition(enemy.x + enemy.facing * 22, enemy.y - 34)
          .setFlipX(enemy.facing < 0);
      }
    }
  }

  /// Archers loose a slow arrow at anything that lines up with them.
  updateArchers(time) {
    for (const enemy of this.enemyList) {
      if (enemy.type !== 'archer' || !enemy.alive) continue;

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;

      if (Math.abs(dx) > 640 || Math.abs(dy) > 120) continue;

      const side = dx < 0 ? -1 : 1;

      if (enemy.facing !== side) {
        enemy.facing = side;
        enemy.setFlipX(side < 0);
      }

      if (time > enemy.nextShotAt) {
        enemy.nextShotAt = time + 1700 / this.pace;
        this.fireArrow(enemy, side);
      }
    }
  }

  // --------------------------------------------------------- swordmasters

  updateSwords(time) {
    for (const enemy of this.enemyList) {
      if (!enemy.alive || enemy.type !== 'sword') continue;
      this.driveSwordsman(enemy, time);
    }
  }

  /// Keeps his distance, feints, then lunges into a two-hit flurry. After the
  /// flurry he is open, and that beat is when a counter lands.
  driveSwordsman(enemy, time) {
    const dx = this.player.x - enemy.x;
    const dir = dx < 0 ? -1 : 1;
    const distance = Math.abs(dx);

    switch (enemy.state) {
      case 'watch':
        enemy.facing = dir;
        enemy.setFlipX(dir < 0);

        if (distance < 120) {
          enemy.setVelocityX(-dir * 80);
          this.playEnemyAnim(enemy, 'swordmaster-walk');
        } else if (distance > 240) {
          enemy.setVelocityX(dir * 110);
          this.playEnemyAnim(enemy, 'swordmaster-walk');
        } else {
          enemy.setVelocityX(0);
          this.playEnemyAnim(enemy, 'swordmaster-idle');
        }

        if (time > enemy.nextActionAt) {
          enemy.state = 'feint';
          enemy.stateUntil = time + 420;
          enemy.setVelocityX(0);
          enemy.setTint(0xff90a0);
        }
        break;

      case 'feint':
        if (time > enemy.stateUntil) {
          enemy.clearTint();

          if (Math.random() < 0.55) {
            enemy.state = 'lunge';
            enemy.stateUntil = time + 240;
            enemy.setTint(0xff5f6d);
            sound.play('swing');
          } else {
            // A feint, nothing more.
            enemy.state = 'watch';
            enemy.nextActionAt = time + 700;
          }
        }
        break;

      case 'lunge':
        enemy.setVelocityX(0);
        if (time > enemy.stateUntil) {
          enemy.clearTint();

          enemy.state = 'flurry';
          enemy.stateUntil = time + 300;
          enemy.flurryHits = 0;
          enemy.setVelocityX(enemy.facing * 300);
          this.playEnemyAnim(enemy, 'swordmaster-walk');
          sound.play('swing');
        }
        break;

      case 'flurry':
        if (enemy.flurryHits === 0 && time > enemy.stateUntil - 220) {
          enemy.flurryHits = 1;
          this.swordmasterStrike(enemy);
        } else if (enemy.flurryHits === 1 && time > enemy.stateUntil - 70) {
          enemy.flurryHits = 2;
          this.swordmasterStrike(enemy);
        }

        if (time > enemy.stateUntil) {
          enemy.state = 'recover';
          enemy.stateUntil = time + 700;
          enemy.openUntil = time + 850;
          enemy.setVelocityX(0);
          this.playEnemyAnim(enemy, 'swordmaster-idle');
        }
        break;

      case 'recover':
        if (time > enemy.stateUntil) {
          enemy.state = 'watch';
          enemy.nextActionAt = time + 600 + Math.random() * 900;
        }
        break;

      default:
        enemy.state = 'watch';
        break;
    }
  }

  playEnemyAnim(enemy, key) {
    const current = enemy.anims.currentAnim;
    if (!current || current.key !== key) enemy.anims.play(key, true);
  }

  swordmasterStrike(enemy) {
    this.spawnSlashArc(enemy.x + enemy.facing * 34, enemy.y - 40, false, 0);
    sound.play('swing');

    const reach = 76;
    const left = enemy.facing > 0 ? enemy.x + 6 : enemy.x - reach - 6;
    const rect = new Phaser.Geom.Rectangle(left, enemy.y - 120, reach, 120);

    const p = this.player.body;
    const playerRect = new Phaser.Geom.Rectangle(p.x, p.y, p.width, p.height);

    if (!Phaser.Geom.Rectangle.Overlaps(rect, playerRect)) return;

    if (this.blocking) {
      this.player.setVelocityX(-enemy.facing * 260);
      this.spawnSparks(this.player.x + enemy.facing * 20, this.player.y - 34, true);
      this.cameras.main.shake(90, 0.005);
      sound.play('hit');
      return;
    }

    this.killPlayer();
  }

  fireArrow(enemy, side) {
    const arrow = this.arrows.create(enemy.x + side * 24, enemy.y - 40, 'arrow');
    arrow.setDepth(8).setFlipX(side < 0);
    arrow.body.setAllowGravity(false);
    arrow.setVelocityX(side * 300);

    sound.play('swing');

    this.time.delayedCall(3200, () => arrow.destroy());
  }

  hitArrow(arrow) {
    if (this.blocking) {
      if (this.time.now > this.blockSoundAt) {
        this.blockSoundAt = this.time.now + 260;
        sound.play('hit');
        this.cameras.main.shake(50, 0.003);
      }
      arrow.destroy();
      return;
    }

    arrow.destroy();
    this.killPlayer();
  }

  /// Half speed while the guard is up, and the raised shield in front of him.
  updateBlockState() {
    if (!this.blocking) {
      if (this.dashUntil === 0) this.player.setMaxVelocity(this.runSpeed, 1400);
      if (this.blockShield) this.blockShield.setVisible(false);
      return;
    }

    this.player.setMaxVelocity(this.runSpeed * 0.5, 1400);

    if (!this.blockShield) {
      this.blockShield = this.add.image(0, 0, 'shield').setDepth(11).setScale(0.5);
    }

    this.blockShield
      .setVisible(true)
      .setPosition(this.player.x + this.facing * 22, this.player.y - 34)
      .setFlipX(this.facing < 0);
  }

  stopEnemies() {
    for (const enemy of this.enemyList) {
      if (enemy.alive) enemy.setVelocityX(0);
    }
  }

  // -------------------------------------------------------- lose and win

  killPlayer() {
    if (this.state !== 'play') return;

    this.state = 'dying';
    this.deaths += 1;
    this.blocking = false;
    if (this.blockShield) this.blockShield.setVisible(false);
    sound.play('die');
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    this.cameras.main.shake(160, 0.008);
    this.cameras.main.flash(150, 120, 12, 30);

    this.tweens.add({
      targets: this.player,
      angle: 82,
      alpha: 0.35,
      y: this.player.y - 26,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () => this.afterDeath()
    });
  }

  afterDeath() {
    if (this.state !== 'dying') return;

    this.lives = Math.max(0, this.lives - 1);
    this.registry.set('lives', this.lives);

    if (this.endless) {
      // One touch ends the run: there is no life to spend and no respawn.
      sound.stopMusic();
      this.state = 'gameover';
      this.finishEndless();
      this.registry.set('state', 'gameover');
      return;
    }

    if (this.lives <= 0) {
      sound.stopMusic();
      this.state = 'gameover';
      this.registry.set('state', 'gameover');
      return;
    }

    this.state = 'respawning';
    this.time.delayedCall(260, () => {
      if (this.state === 'respawning') this.respawn();
    });
  }

  respawn() {
    this.tweens.killTweensOf(this.player);

    this.player.setAngle(0).setAlpha(1);
    this.player.body.enable = true;
    this.player.body.reset(this.level.spawn.x, this.level.spawn.y);
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    this.player.setFlipX(false);

    this.facing = 1;
    this.jumpQueuedAt = -9999;
    this.lastGroundAt = -9999;
    this.attackUntil = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.airDashUsed = false;
    this.wallLockUntil = 0;
    this.lastWallAt = -9999;
    this.wallSliding = false;
    this.player.body.setAllowGravity(true);
    this.player.setMaxVelocity(this.runSpeed, 1400);
    this.comboStep = 0;
    this.comboExpiresAt = 0;
    this.attackHeavy = false;
    this.blocking = false;
    if (this.blockShield) this.blockShield.setVisible(false);
    this.state = 'play';

    this.playAnim('idle');
    this.cameras.main.flash(180, 10, 12, 24);
  }

  // ------------------------------------------------------------- endless

  /// How an endless run is scored: the roofs crossed plus the ground covered,
  /// in metres, over the whole run.
  getEndlessScore() {
    const travelled = this.player ? Math.max(0, this.player.x - this.level.spawn.x) : 0;
    const metres = Math.round(this.endlessMetres + travelled / 32);

    return {
      roofs: this.endlessRoof,
      metres,
      score: this.endlessRoof + metres
    };
  }

  /// The far door of an endless roof drops straight into the next one.
  advanceRoof() {
    if (this.state !== 'play') return;

    this.state = 'advancing';

    const run = this.getEndlessScore();

    sound.play('clear');
    this.cameras.main.flash(220, 255, 200, 140);

    this.time.delayedCall(220, () => {
      // The music carries over into the next roof instead of starting again.
      this.carryingMusic = true;
      this.scene.restart({
        endless: true,
        roof: this.endlessRoof + 1,
        metres: run.metres
      });
    });
  }

  /// The run is over: file the score, then let the HUD show it.
  finishEndless() {
    const run = this.getEndlessScore();
    const best = recordEndless(run);

    this.registry.set('endlessSummary', {
      score: run.score,
      roofs: run.roofs,
      metres: run.metres,
      best: best.score,
      isBest: best.isBest
    });
  }

  completeLevel(isVictory) {
    if (this.state !== 'play' && this.state !== 'bossdown') return;

    // In an endless run the far door is not an ending but the next roof.
    if (this.endless) {
      this.advanceRoof();
      return;
    }

    this.state = 'complete';
    markCleared(this.levelIndex);

    this.finishedAt = this.time.now;
    const stats = this.getRunStats();
    const best = recordRun(this.levelIndex, {
      time: stats.seconds,
      gems: stats.gems,
      deaths: stats.deaths
    });

    // The daily trial: both marks in one run, and the purse for the day.
    let trial = null;

    if (this.trialInfo) {
      const info = this.trialInfo;
      const metTime = stats.seconds <= info.timeTarget;
      const metGems = stats.gems >= info.gemTarget;
      const alreadyClaimed = Boolean(info.claimed);
      const claimed = metTime && metGems && !alreadyClaimed && claimTrial(info);

      if (claimed) {
        addGems(info.reward);
        info.claimed = true;
      }

      trial = {
        timeTarget: info.timeTarget,
        gemTarget: info.gemTarget,
        reward: info.reward,
        metTime,
        metGems,
        alreadyClaimed,
        claimed
      };
    }

    this.registry.set('runSummary', {
      gems: stats.gems,
      total: stats.total,
      seconds: stats.seconds,
      deaths: stats.deaths,
      bestTime: best.time,
      bestGems: best.gems,
      newTime: best.newTime,
      newGems: best.newGems,
      trial
    });

    sound.stopMusic();
    sound.play('clear');
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    this.player.setAngle(0).setAlpha(1);
    this.playAnim('idle');

    if (this.exitGlow) {
      this.tweens.killTweensOf(this.exitGlow);
      this.tweens.add({
        targets: this.exitGlow,
        alpha: 0.95,
        scale: 6,
        duration: 420,
        ease: 'Quad.easeOut'
      });
    }

    this.cameras.main.flash(320, 255, 224, 150);

    this.time.delayedCall(620, () => {
      if (this.state === 'complete') {
        this.registry.set('state', isVictory ? 'victory' : 'complete');
      }
    });

    // Once the jingle has rung out, the palace theme settles in behind the panel.
    this.time.delayedCall(2400, () => {
      if (this.state === 'complete') sound.playMusic('palace');
    });
  }

  // Called from the HUD: the win screen and the lose screen both restart the
  // level from the beginning, and the small button in the corner restarts it at
  // any time.
  restartLevel() {
    // An endless run has no retries: it ends where it ends.
    if (this.endless) return;

    this.state = 'play';
    this.lives = this.maxLives;
    this.registry.set('lives', this.lives);
    this.registry.set('state', 'play');
    sound.playMusic('roof');

    for (const enemy of this.enemyList) {
      this.tweens.killTweensOf(enemy);
      enemy.alive = true;
      enemy.setAngle(0).setAlpha(1).setScale(1).setFlipX(false);
      enemy.setVisible(true);
      enemy.enableBody(true, enemy.homeX, this.level.groundY, true, true);
      enemy.body.enable = true;
      enemy.body.setSize(PLAYER_BODY_W, PLAYER_BODY_H);
      enemy.body.setOffset(PLAYER_BODY_X, PLAYER_BODY_Y);
      enemy.body.reset(enemy.homeX, this.level.groundY);
      enemy.facing = -1;
      enemy.guarding = enemy.type === 'shield';
      enemy.reguardAt = 0;
      enemy.nextTurnAt = 0;
      enemy.nextShotAt = 0;
      enemy.blockCooldownUntil = 0;
      enemy.clearTint();
      enemy.setVelocityX(enemy.type === 'archer' ? 0 : -enemy.patrolSpeed);

      const anim =
        enemy.type === 'archer'
          ? 'archer-walk'
          : enemy.type === 'sword'
            ? 'swordmaster-idle'
            : 'guard-walk';
      enemy.anims.play(anim, true);

      if (enemy.type === 'sword') {
        enemy.state = 'watch';
        enemy.stateUntil = 0;
        enemy.openUntil = 0;
        enemy.nextActionAt = this.time.now + 900;
        enemy.flurryHits = 0;
      }
    }

    if (this.arrows) this.arrows.clear(true, true);

    this.tweens.killTweensOf(this.player);
    this.player.setAngle(0).setAlpha(1);
    this.player.body.enable = true;
    this.player.body.reset(this.level.spawn.x, this.level.spawn.y);
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    this.player.setFlipX(false);

    this.facing = 1;
    this.jumpQueuedAt = -9999;
    this.lastGroundAt = -9999;
    this.attackUntil = 0;
    this.attackReadyAt = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.airDashUsed = false;
    this.wallLockUntil = 0;
    this.lastWallAt = -9999;
    this.wallSliding = false;
    this.player.body.setAllowGravity(true);
    this.player.setMaxVelocity(this.runSpeed, 1400);

    this.comboStep = 0;
    this.comboExpiresAt = 0;
    this.attackHeavy = false;
    this.blocking = false;
    this.blockSoundAt = 0;
    if (this.blockShield) this.blockShield.setVisible(false);

    for (const gem of this.gemList) {
      this.tweens.killTweensOf(gem);
      gem.setVisible(true).setAlpha(1);
      gem.enableBody(true, gem.homeX, gem.homeY, true, true);
      gem.refreshBody();
      this.bobGem(gem);
    }
    this.gemsCollected = 0;
    this.deaths = 0;
    this.startedAt = this.time.now;
    this.finishedAt = 0;

    this.playAnim('idle');

    if (this.exitGlow) {
      this.tweens.killTweensOf(this.exitGlow);
      this.exitGlow.setAlpha(0.45).setScale(3);
      this.pulseExitGlow();
    }

    for (const trap of this.crumbleList) this.resetCrumble(trap);

    for (const star of this.starList) {
      this.tweens.killTweensOf(star);
      star.setVisible(true).setAlpha(1).setScale(0.62);
      star.enableBody(true, star.homeX, star.homeY, true, true);
      star.refreshBody();
      this.spinStar(star);
    }

    this.shurikens = this.shurikenMax;
    this.throwReadyAt = 0;
    if (this.shurikenGroup) this.shurikenGroup.clear(true, true);

    if (this.level.isBoss) this.resetBoss();

    this.cameras.main.fadeIn(300, 6, 8, 16);
  }

  /// Back to the scroll map. The HUD scene is stopped along with this one.
  goToMap() {
    this.scene.start('LevelSelect');
  }
}
