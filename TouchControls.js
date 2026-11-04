// The on-screen controls. Five round pads sit in the band along the bottom of
// the screen: left and right on one side, then dash, jump and attack on the
// other, sized for a thumb and drawn in the game's own stone-and-gold palette.
//
// The pads hold state rather than firing actions, because holding a direction
// while tapping jump is two fingers at once. Arrow keys, space, X, C and shift
// work too, so the same game is playable with a keyboard.

import { computeLayout, padRadius } from './layout.js';

const DIRECTIONS = ['left', 'right', 'shuriken', 'block', 'dash', 'jump', 'attack'];

const EMPTY = {
  left: false,
  right: false,
  shurikenPressed: false,
  blockHeld: false,
  dashPressed: false,
  jumpPressed: false,
  attackPressed: false,
  jumpHeld: false
};

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;

    this.held = {
      left: false,
      right: false,
      shuriken: false,
      block: false,
      dash: false,
      jump: false,
      attack: false
    };
    this.pointerFor = {
      left: null,
      right: null,
      shuriken: null,
      block: null,
      dash: null,
      jump: null,
      attack: null
    };
    this.pendingShuriken = false;
    this.pendingDash = false;
    this.hiddenDirs = new Set();
    this.pendingJump = false;
    this.pendingAttack = false;
    this.jumpHeld = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.extraKeys = scene.input.keyboard.addKeys('X,Z,C,S,V');

    this.buttons = {};
    this.build();

    this.onScenePointerUp = (pointer) => {
      for (const dir of DIRECTIONS) this.release(dir, pointer.id);
    };
    scene.input.on('pointerup', this.onScenePointerUp);
  }

  build() {
    // The bundled symbol set is current Lucide, but keep a fallback so a missing
    // name never leaves the attack button blank.
    const attackIcon =
      ['sword', 'swords', 'zap', 'crosshair'].find((name) =>
        this.scene.textures.exists(`icon-${name}`)
      ) || 'chevron-up';

    const dashIcon =
      ['chevrons-right', 'fast-forward', 'move-right', 'wind'].find((name) =>
        this.scene.textures.exists(`icon-${name}`)
      ) || 'chevron-right';

    const defs = [
      { dir: 'left', icon: 'chevron-left' },
      { dir: 'right', icon: 'chevron-right' },
      { dir: 'shuriken', icon: 'star' },
      { dir: 'block', icon: 'shield' },
      { dir: 'dash', icon: dashIcon },
      { dir: 'jump', icon: 'chevron-up' },
      { dir: 'attack', icon: attackIcon }
    ];

    for (const def of defs) {
      const pad = this.scene.add.image(0, 0, 'pad').setDepth(20).setAlpha(0.9);
      pad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);

      const icon = this.scene.add
        .image(0, 0, `icon-${def.icon}`)
        .setDepth(21)
        .setTint(0xf4efe2)
        .setAlpha(0.92);

      pad.on('pointerdown', (pointer) => this.press(def.dir, pointer));

      this.buttons[def.dir] = { pad, icon, baseScale: 1, iconScale: 1 };
    }
  }

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const geometry = computeLayout(width, height);
    const insets = geometry.insets;

    // The band runs from the bottom of the playfield down to the home gesture.
    const bandTop = geometry.playHeight;
    const bandBottom = height - insets.bottom;
    const bandHeight = Math.max(64, bandBottom - bandTop);

    // A phone held upright is narrow: seven pads in one row would be too small
    // for a thumb, so they are split into a row of the controls used every
    // second and a shorter row of the rarer ones above it.
    const narrow = width < 560;

    const side = Math.max(10, Math.min(18, width * 0.035));

    const radius = narrow
      ? Math.min((bandHeight - 8) / 4.3, (width - side * 2) / 9.6, 44)
      : Math.min(padRadius(geometry.band), (width - 16) / 16.5);

    const slot = (x, y) => ({ x, y });
    const positions = {};

    if (narrow) {
      const step = radius * 2.05;
      const bottomY = bandBottom - 8 - radius;
      const topY = bottomY - radius * 2.1;

      // Left thumb: the two directions, side by side at the bottom.
      positions.left = slot(side + radius, bottomY);
      positions.right = slot(side + radius + step, bottomY);

      // Right thumb: jump and attack at the bottom, the rarer actions above.
      positions.jump = slot(width - side - radius - step, bottomY);
      positions.attack = slot(width - side - radius, bottomY);

      positions.dash = slot(width - side - radius, topY);
      positions.block = slot(width - side - radius - step, topY);
      positions.shuriken = slot(width - side - radius - step * 2, topY);
    } else {
      const centreY = bandTop + bandHeight * 0.5;
      const inset = Math.max(10, radius * 0.4);
      const attackX = width - side - radius - (inset - side);

      positions.left = slot(side + radius, centreY);
      positions.right = slot(side + radius + radius * 2.15, centreY);

      // The right-hand pads close up when one of them is taken away, so a
      // fighter without a block still has an even row under the thumb.
      const rightDirs = ['attack', 'jump', 'dash', 'block', 'shuriken'].filter(
        (dir) => !this.hiddenDirs.has(dir)
      );
      rightDirs.forEach((dir, index) => {
        positions[dir] = slot(attackX - index * radius * 2.15, centreY);
      });
    }

    const padScale = (radius * 2) / 128;
    const parked = positions.attack || slot(width - side - radius, bandBottom - 8 - radius);

    for (const dir of DIRECTIONS) {
      const button = this.buttons[dir];
      button.baseScale = padScale;
      button.iconScale = (radius * 1.15) / 96;

      // A pad whose row closed up stays parked under its neighbour, hidden.
      const spot = positions[dir] || parked;
      button.pad.setScale(padScale).setPosition(spot.x, spot.y);
      button.icon.setScale(button.iconScale).setPosition(spot.x, spot.y);
    }
  }

  press(dir, pointer) {
    if (!this.enabled || this.pointerFor[dir] !== null) return;

    this.pointerFor[dir] = pointer.id;
    this.held[dir] = true;

    if (dir === 'jump') {
      this.pendingJump = true;
      this.jumpHeld = true;
    }
    if (dir === 'shuriken') this.pendingShuriken = true;
    if (dir === 'dash') this.pendingDash = true;
    if (dir === 'attack') this.pendingAttack = true;

    this.setPressedVisual(dir, true);
  }

  release(dir, pointerId) {
    const current = this.pointerFor[dir];
    if (current === null) return;
    if (pointerId !== undefined && pointerId !== current) return;

    this.pointerFor[dir] = null;
    this.held[dir] = false;
    if (dir === 'jump') this.jumpHeld = false;

    this.setPressedVisual(dir, false);
  }

  setPressedVisual(dir, pressed) {
    const button = this.buttons[dir];
    if (!button) return;

    button.pad.setScale(button.baseScale * (pressed ? 0.94 : 1)).setAlpha(pressed ? 1 : 0.88);
    button.icon
      .setScale(button.iconScale * (pressed ? 1.08 : 1))
      .setAlpha(pressed ? 1 : 0.92);
  }

  setEnabled(enabled) {
    this.enabled = enabled;

    for (const dir of DIRECTIONS) {
      const button = this.buttons[dir];
      const visible = enabled && !this.hiddenDirs.has(dir);

      button.pad.setVisible(visible);
      button.icon.setVisible(visible);
      if (button.pad.input) button.pad.input.enabled = visible;
      if (!enabled) this.release(dir);
    }

    if (!enabled) {
      this.pendingShuriken = false;
      this.pendingDash = false;
      this.pendingJump = false;
      this.pendingAttack = false;
    }
  }

  // A finger lifted off the canvas can miss its own pointerup, so confirm every
  // held pad still has a live pointer behind it.
  refreshPointers() {
    const pointers = this.scene.input.manager.pointers;

    for (const dir of DIRECTIONS) {
      const id = this.pointerFor[dir];
      if (id === null) continue;

      let down = false;
      for (let i = 0; i < pointers.length; i += 1) {
        const pointer = pointers[i];
        if (pointer && pointer.id === id && pointer.isDown) {
          down = true;
          break;
        }
      }

      if (!down) this.release(dir, id);
    }
  }

  /// Takes a pad away entirely, for a fighter who cannot use it.
  setDirectionEnabled(dir, enabled) {
    if (enabled) this.hiddenDirs.delete(dir);
    else this.hiddenDirs.add(dir);

    const button = this.buttons[dir];
    if (!button) return;

    const visible = this.enabled && enabled;
    button.pad.setVisible(visible);
    button.icon.setVisible(visible);
    if (button.pad.input) button.pad.input.enabled = visible;
    if (!enabled) this.release(dir);

    this.layout(this.scene.scale.gameSize);
  }

  /// One snapshot of the controls per frame. Edge flags are cleared as they are
  /// read, so a tap of jump is consumed exactly once.
  read() {
    if (!this.enabled) return { ...EMPTY };

    this.refreshPointers();

    const cursors = this.cursors;
    const left = this.held.left || this.cursors.left.isDown;
    const right = this.held.right || this.cursors.right.isDown;

    const jumpKey =
      Phaser.Input.Keyboard.JustDown(cursors.space) ||
      Phaser.Input.Keyboard.JustDown(cursors.up);
    const attackKey =
      Phaser.Input.Keyboard.JustDown(this.extraKeys.X) ||
      Phaser.Input.Keyboard.JustDown(this.extraKeys.Z);
    const dashKey =
      Phaser.Input.Keyboard.JustDown(this.extraKeys.C) ||
      Phaser.Input.Keyboard.JustDown(cursors.shift);
    const shurikenKey = Phaser.Input.Keyboard.JustDown(this.extraKeys.V);

    const jumpPressed = this.pendingJump || jumpKey;
    const attackPressed = this.pendingAttack || attackKey;
    const dashPressed = this.pendingDash || dashKey;
    const shurikenPressed = this.pendingShuriken || shurikenKey;

    this.pendingJump = false;
    this.pendingAttack = false;
    this.pendingDash = false;
    this.pendingShuriken = false;

    const jumpHeld = this.jumpHeld || cursors.space.isDown || cursors.up.isDown;
    const blockHeld =
      this.held.block || cursors.down.isDown || this.extraKeys.S.isDown;

    return {
      left,
      right,
      blockHeld,
      dashPressed,
      shurikenPressed,
      jumpPressed,
      attackPressed,
      jumpHeld
    };
  }

  destroy() {
    this.scene.input.off('pointerup', this.onScenePointerUp);
  }
}
