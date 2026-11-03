// The front screen: a dark palace gate at night, the game's title, the ninja
// standing by the lantern, and the two ways in — continue at the furthest roof
// unlocked, or start again from nothing.

import { registerIcons } from '../icons.js';
import { buildWorldTextures } from '../art/textures.js';
import { buildSpriteTextures } from '../art/sprites.js';
import { LEVELS } from '../levels/levels.js';
import { loadProgress, isUnlocked, resetProgress } from '../levels/progress.js';
import { watchPress, inRect, inCircle } from '../ui/press.js';
import { sound } from '../audio/sound.js';

const FONT = '-apple-system, system-ui, sans-serif';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    if (this.scene.isActive('Game')) this.scene.stop('Game');
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');

    buildWorldTextures(this);
    buildSpriteTextures(this);
    registerIcons(this, ['volume-2', 'volume-x']);

    this.confirmNew = false;

    this.backdrop = this.add.graphics().setDepth(0);
    this.gate = this.add.graphics().setDepth(1);
    this.moon = this.add.image(0, 0, 'glow').setDepth(0).setAlpha(0.35).setTint(0xff8a90);

    // The fighter the player last chose stands by the gate.
    const save = loadProgress();
    const hero = save.hero === 'kunoichi' ? 'kunoichi' : 'ninja';
    this.bestEndless = save.endless || { score: 0, roofs: 0, metres: 0 };

    this.ninja = this.add.sprite(0, 0, hero, 0).setOrigin(0.5, 1).setScale(2.4).setDepth(2);
    this.tweens.add({
      targets: this.ninja,
      y: '-=6',
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.title = this.add
      .text(0, 0, 'SHADOW NINJA', {
        fontFamily: FONT,
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.title.setInteractive();
    this.title.on('pointerdown', () => {
      sound.play('clear');
      this.tweens.add({ targets: this.title, scale: 1.06, duration: 120, yoyo: true });
    });

    this.buttons = this.add.graphics().setDepth(2);

    this.continueText = this.add
      .text(0, 0, 'CONTINUE', {
        fontFamily: FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.newText = this.add
      .text(0, 0, 'NEW GAME', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#d8aeb4'
      })
      .setOrigin(0.5)
      .setDepth(3);

    // The second way to play, and the best run it has ever had.
    this.endlessText = this.add
      .text(0, 0, 'ENDLESS', {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.bestText = this.add
      .text(0, 0, this.bestLine(), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#b98a90'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.endlessZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.endlessZone.on('pointerdown', () => this.startEndless());

    this.continueZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.continueZone.on('pointerdown', () => this.startContinue());

    this.newZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.newZone.on('pointerdown', () => this.startNewGame());

    // Menus also read the raw press, so a button answers even if Phaser's own
    // pointer hit test misses it on the turned screen.
    watchPress(this, (x, y) => this.pressAt(x, y));

    this.mutePad = this.add.image(0, 0, 'pad').setDepth(4).setAlpha(0.65);
    this.mutePad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.muteIcon = this.add.image(0, 0, 'icon-volume-2').setDepth(5).setTint(0xf4efe2);
    this.mutePad.on('pointerdown', () => this.toggleMute());

    this.applyMute(sound.isMuted());

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
    });

    this.layout(this.scale.gameSize);
    sound.playMusic('palace');
  }

  update() {
    sound.update();
  }

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const groundY = Math.round(height * 0.76);

    this.backdrop.clear();
    this.backdrop.fillGradientStyle(0x060306, 0x060306, 0x23080e, 0x120407, 1);
    this.backdrop.fillRect(0, 0, width, height);

    this.backdrop.fillStyle(0x0d0508, 1);
    this.backdrop.fillRect(0, groundY, width, height - groundY);
    this.backdrop.fillStyle(0xff2f45, 0.22);
    this.backdrop.fillRect(0, groundY, width, 2);

    this.moon.setPosition(width * 0.82, height * 0.2).setScale(Math.max(2, width / 320));

    // The gate the ninja stands by.
    const gx = width * 0.63;
    const top = groundY - Math.min(height * 0.6, 250);

    this.gate.clear();
    this.gate.fillStyle(0x1a060b, 1);
    this.gate.fillRect(gx - 82, top, 16, groundY - top);
    this.gate.fillRect(gx + 66, top, 16, groundY - top);
    this.gate.fillRect(gx - 108, top - 8, 216, 14);
    this.gate.fillRect(gx - 92, top + 32, 184, 10);
    this.gate.fillStyle(0xff2f45, 0.18);
    this.gate.fillRect(gx - 108, top - 8, 216, 3);

    this.ninja.setPosition(width * 0.2, groundY + 4);

    const titleSize = Math.round(Math.min(56, Math.max(24, width * 0.082)));
    this.title.setFontSize(titleSize);
    this.title.setPosition(width / 2, height * 0.17);

    // Buttons.
    const primaryW = Math.min(280, width * 0.42);
    const primaryH = Math.max(44, height * 0.125);
    const continueY = height * 0.5;

    const endW = Math.min(200, width * 0.33);
    const endH = Math.max(36, height * 0.105);
    const endY = height * 0.632;

    const newW = Math.min(180, width * 0.28);
    const newH = Math.max(30, height * 0.09);
    const newY = height * 0.8;

    this.buttons.clear();

    this.drawButton(width / 2, continueY, primaryW, primaryH, true);
    this.drawButton(width / 2, endY, endW, endH, false);
    this.drawButton(width / 2, newY, newW, newH, false);

    this.continueText.setFontSize(Math.round(primaryH * 0.44));
    this.continueText.setPosition(width / 2, continueY);

    this.endlessText.setFontSize(Math.round(endH * 0.4));
    this.endlessText.setPosition(width / 2, endY);

    this.bestText.setFontSize(Math.max(9, Math.round(newH * 0.32)));
    this.bestText.setPosition(width / 2, endY + endH * 0.74);

    this.newText.setFontSize(Math.max(10, Math.round(newH * 0.36)));
    this.newText.setPosition(width / 2, newY);

    this.continueZone.setPosition(width / 2, continueY).setSize(primaryW, primaryH);
    this.endlessZone.setPosition(width / 2, endY).setSize(endW, endH);
    this.newZone.setPosition(width / 2, newY).setSize(newW, newH);

    const muteSize = Math.min(46, Math.max(30, width * 0.06));
    this.mutePad.setPosition(width - muteSize, height - muteSize).setScale((muteSize * 2) / 128);
    this.muteIcon.setScale((muteSize * 0.95) / 96).setPosition(width - muteSize, height - muteSize);
  }

  /// A plain rounded stone button.
  drawButton(x, y, w, h, primary) {
    this.buttons.fillStyle(primary ? 0x2a0a12 : 0x160609, primary ? 0.97 : 0.9);
    this.buttons.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.buttons.lineStyle(2, primary ? 0xff2f45 : 0x8a2024, primary ? 0.85 : 0.6);
    this.buttons.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.buttons.fillStyle(0xff2f45, primary ? 0.18 : 0.1);
    this.buttons.fillRect(x - w / 2 + 6, y - h / 2 + 4, w - 12, 2);
  }

  /// The best endless run so far, or a word saying there has not been one.
  bestLine() {
    if (!this.bestEndless || !this.bestEndless.score) return 'No run yet';
    return (
      `Best ${this.bestEndless.score}  ·  ${this.bestEndless.roofs} roofs` +
      `  ·  ${this.bestEndless.metres} m`
    );
  }

  /// The rectangle a button zone covers, for the raw press check.
  rectOf(zone) {
    return {
      x: zone.x - zone.width / 2,
      y: zone.y - zone.height / 2,
      w: zone.width,
      h: zone.height
    };
  }

  /// One action per press, whichever path of input reported it.
  guardTap() {
    const now = Date.now();
    if (now - (this.lastTapAt || 0) < 320) return false;
    this.lastTapAt = now;
    return true;
  }

  pressAt(x, y) {
    if (!this.mutePad) return;

    const muteRadius = (this.mutePad.displayWidth || 0) / 2 + 6;

    if (inCircle(x, y, this.mutePad.x, this.mutePad.y, muteRadius)) {
      this.toggleMute();
      return;
    }

    if (inRect(x, y, this.rectOf(this.continueZone), 8)) {
      this.startContinue();
      return;
    }

    if (inRect(x, y, this.rectOf(this.endlessZone), 8)) {
      this.startEndless();
      return;
    }

    if (inRect(x, y, this.rectOf(this.newZone), 8)) {
      this.startNewGame();
    }
  }

  startContinue() {
    if (!this.guardTap()) return;

    const progress = loadProgress();
    let target = 0;

    for (let i = 0; i < LEVELS.length; i += 1) {
      if (isUnlocked(i, progress.cleared)) target = i;
    }

    sound.play('jump');
    this.scene.start('Game', { level: target });
  }

  startEndless() {
    if (!this.guardTap()) return;

    sound.play('jump');
    this.scene.start('Game', { endless: true, roof: 0, metres: 0 });
  }

  startNewGame() {
    if (!this.guardTap()) return;

    if (!this.confirmNew) {
      this.confirmNew = true;
      this.newText.setText('TAP AGAIN TO ERASE');
      this.newText.setColor('#ff7a8a');
      this.time.delayedCall(3000, () => this.resetNewGame());
      return;
    }

    resetProgress();
    this.resetNewGame();
    sound.play('trap');
  }

  resetNewGame() {
    this.confirmNew = false;
    this.newText.setText('NEW GAME');
    this.newText.setColor('#d8aeb4');
  }

  toggleMute() {
    if (!this.guardTap()) return;

    this.applyMute(sound.toggleMuted());
  }

  applyMute(muted) {
    this.muteIcon.setTexture(muted ? 'icon-volume-x' : 'icon-volume-2');
    this.muteIcon.setAlpha(muted ? 0.4 : 1);
    this.mutePad.setAlpha(muted ? 0.4 : 0.65);
  }
}
