// The front screen: a dark palace gate at night, the game's title, the ninja
// standing by the lantern, and the two ways in — continue at the furthest roof
// unlocked, or start again from nothing.

import { registerIcons } from './icons.js';
import { buildWorldTextures } from './textures.js';
import { buildSpriteTextures } from './sprites.js';
import { LEVELS } from './levels.js';
import { loadProgress, isUnlocked, resetProgress } from './progress.js';
import { watchPress, inRect, inCircle } from './press.js';
import { safeInsets } from './layout.js';
import { COLORS, drawStoneButton } from './style.js';
import { sound } from './sound.js';

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
    registerIcons(this, ['volume-2', 'volume-x', 'settings', 'share-2']);

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
        color: '#f7ecdd'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.title.setInteractive();
    this.title.on('pointerdown', () => {
      sound.play('clear');
      this.tweens.add({ targets: this.title, scale: 1.06, duration: 120, yoyo: true });
    });

    this.buttons = this.add.graphics().setDepth(2);
    this.titleRule = this.add.graphics().setDepth(3);

    this.continueText = this.add
      .text(0, 0, 'CONTINUE', {
        fontFamily: FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.newText = this.add
      .text(0, 0, 'NEW GAME', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#cdb6b6'
      })
      .setOrigin(0.5)
      .setDepth(3);

    // The second way to play, and the best run it has ever had.
    this.endlessText = this.add
      .text(0, 0, 'ENDLESS', {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.bestText = this.add
      .text(0, 0, this.bestLine(), {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#a98f95'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.endlessZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.endlessZone.on('pointerdown', () => this.startEndless());

    this.continueZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.continueZone.on('pointerdown', () => this.startContinue());

    this.newZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.newZone.on('pointerdown', () => this.startNewGame());

    // Settings, written out under the menu so it is never hard to find.
    this.settingsButton = this.add.graphics().setDepth(2);
    this.settingsMenuIcon = this.add.image(0, 0, 'icon-settings').setDepth(3).setTint(0xf4efe2);
    this.settingsMenuText = this.add
      .text(0, 0, 'SETTINGS', {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#cdb6b6'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.settingsMenuZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.settingsMenuZone.on('pointerdown', () => this.openSettings());

    // Menus also read the raw press, so a button answers even if Phaser's own
    // pointer hit test misses it on the turned screen.
    watchPress(this, (x, y) => this.pressAt(x, y));

    this.mutePad = this.add.image(0, 0, 'pad').setDepth(4).setAlpha(0.65);
    this.mutePad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.muteIcon = this.add.image(0, 0, 'icon-volume-2').setDepth(5).setTint(0xf4efe2);
    this.mutePad.on('pointerdown', () => this.toggleMute());

    // Settings and share sit above the speaker, in the same corner.
    this.settingsPad = this.add.image(0, 0, 'pad').setDepth(4).setAlpha(0.6);
    this.settingsPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.settingsIcon = this.add.image(0, 0, 'icon-settings').setDepth(5).setTint(0xf4efe2);
    this.settingsPad.on('pointerdown', () => this.openSettings());

    if (!this.textures.exists('icon-settings')) this.settingsIcon.setVisible(false);
    if (!this.textures.exists('icon-settings')) this.settingsMenuIcon.setVisible(false);

    this.sharePad = this.add.image(0, 0, 'pad').setDepth(4).setAlpha(0.6);
    this.sharePad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.shareIcon = this.add.image(0, 0, 'icon-share-2').setDepth(5).setTint(0xf4efe2);
    this.sharePad.on('pointerdown', () => this.shareGame());

    this.toast = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: '#ffd98a'
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0);

    // The build running on screen, in the corner: if this is missing from the
    // title, the game being played is not this copy.
    this.buildText = this.add
      .text(0, 0, 'v0.10.0', {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#6b5a5e'
      })
      .setOrigin(0, 0.5)
      .setDepth(6);

    this.applyMute(sound.isMuted());

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
    });

    this.layout(this.scale.gameSize);
    this.playIntro();
    sound.playMusic('palace');
  }

  update() {
    sound.update();
  }

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const insets = safeInsets();
    const portrait = height > width * 1.05;
    const top = insets.top;
    const groundY = Math.round(height * (portrait ? 0.87 : 0.78));

    this.backdrop.clear();
    this.backdrop.fillGradientStyle(0x08040a, 0x08040a, 0x26090f, 0x120407, 1);
    this.backdrop.fillRect(0, 0, width, height);

    this.backdrop.fillStyle(0x0d0508, 1);
    this.backdrop.fillRect(0, groundY, width, height - groundY);
    this.backdrop.fillStyle(COLORS.gold, 0.3);
    this.backdrop.fillRect(0, groundY, width, 2);

    this.moon
      .setPosition(width * (portrait ? 0.78 : 0.84), top + height * 0.1)
      .setScale(Math.max(2, width / 320));

    // The gate the ninja stands by, kept off the column of buttons.
    const gx = width * (portrait ? 0.85 : 0.64);
    const gateScale = portrait ? 0.7 : 1;
    const gateTop = groundY - Math.min(height * (portrait ? 0.34 : 0.62), 260);

    this.gate.clear();
    this.gate.fillStyle(0x1a060b, 1);
    this.gate.fillRect(gx - 82 * gateScale, gateTop, 16 * gateScale, groundY - gateTop);
    this.gate.fillRect(gx + 66 * gateScale, gateTop, 16 * gateScale, groundY - gateTop);
    this.gate.fillRect(gx - 108 * gateScale, gateTop - 8, 216 * gateScale, 14);
    this.gate.fillRect(gx - 92 * gateScale, gateTop + 32, 184 * gateScale, 10);
    this.gate.fillStyle(COLORS.ember, 0.2);
    this.gate.fillRect(gx - 108 * gateScale, gateTop - 8, 216 * gateScale, 3);

    this.ninja
      .setScale(portrait ? 1.7 : 2.4)
      .setPosition(width * (portrait ? 0.22 : 0.2), groundY + 4);

    const titleSize = Math.round(
      Math.min(portrait ? 44 : 56, Math.max(24, width * (portrait ? 0.115 : 0.082)))
    );
    this.title.setFontSize(titleSize).setPosition(width / 2, top + titleSize * 1.2);

    // A thin gold rule under the title, so the top of the screen has weight.
    this.titleRule.clear();
    const ruleW = Math.min(width * 0.5, 220);
    this.titleRule.fillStyle(COLORS.gold, 0.5);
    this.titleRule.fillRect(width / 2 - ruleW / 2, this.title.y + titleSize * 0.72, ruleW, 1.5);

    // Buttons: a column down the middle, sized to the panel.
    const primaryW = Math.min(portrait ? 320 : 300, width * (portrait ? 0.82 : 0.44));
    const primaryH = Math.max(48, Math.min(height * (portrait ? 0.11 : 0.136), 78));
    const endW = Math.min(portrait ? 250 : 210, width * (portrait ? 0.64 : 0.34));
    const endH = Math.max(40, Math.min(height * (portrait ? 0.085 : 0.115), 62));
    const newW = Math.min(portrait ? 200 : 180, width * (portrait ? 0.54 : 0.3));
    const newH = Math.max(34, Math.min(height * (portrait ? 0.07 : 0.095), 52));

    const gap = Math.max(9, Math.min(18, height * 0.022));
    const continueY = Math.round(height * (portrait ? 0.46 : 0.44));
    const endY = continueY + primaryH / 2 + gap + endH / 2;
    const newY = endY + endH / 2 + gap + newH / 2;

    const setW = Math.min(portrait ? 200 : 176, width * (portrait ? 0.52 : 0.28));
    const setH = Math.max(32, Math.min(height * (portrait ? 0.062 : 0.085), 46));
    const settingsY = newY + newH / 2 + gap + setH / 2;

    this.buttons.clear();
    this.drawButton(width / 2, continueY, primaryW, primaryH, true);
    this.drawButton(width / 2, endY, endW, endH, false);
    this.drawButton(width / 2, newY, newW, newH, false);

    drawStoneButton(this.settingsButton, width / 2, settingsY, setW, setH, {});

    const settingsFont = Math.max(10, Math.round(Math.min(setH * 0.36, setW * 0.16)));
    this.settingsMenuText.setFontSize(settingsFont).setPosition(width / 2 + setH * 0.3, settingsY);
    this.settingsMenuIcon
      .setScale((setH * 0.42) / 96)
      .setPosition(width / 2 - this.settingsMenuText.width / 2 - setH * 0.36, settingsY);

    this.settingsMenuZone.setPosition(width / 2, settingsY).setSize(setW, setH);

    this.continueText
      .setFontSize(Math.round(Math.min(primaryH * 0.42, primaryW * 0.17)))
      .setPosition(width / 2, continueY);

    this.endlessText
      .setFontSize(Math.round(Math.min(endH * 0.4, endW * 0.17)))
      .setPosition(width / 2, endY);

    this.newText
      .setFontSize(Math.max(10, Math.round(Math.min(newH * 0.4, newW * 0.18))))
      .setPosition(width / 2, newY);

    this.bestText
      .setFontSize(Math.max(9, Math.min(12, Math.round(width * 0.028))))
      .setPosition(width / 2, settingsY + setH / 2 + Math.max(10, height * 0.018));

    this.continueZone.setPosition(width / 2, continueY).setSize(primaryW, primaryH);
    this.endlessZone.setPosition(width / 2, endY).setSize(endW, endH);
    this.newZone.setPosition(width / 2, newY).setSize(newW, newH);

    const muteSize = Math.min(44, Math.max(28, width * 0.06));
    const corner = Math.min(40, Math.max(26, width * 0.07));
    const cornerX = width - Math.max(muteSize, corner) - 8;
    const muteY = height - insets.bottom - muteSize - 10;
    const cornerSettingsY = muteY - muteSize * 2.05;
    const shareY = cornerSettingsY - corner * 2.05;

    this.mutePad.setPosition(cornerX, muteY).setScale((muteSize * 2) / 128);
    this.muteIcon.setScale((muteSize * 0.95) / 96).setPosition(cornerX, muteY);

    this.settingsPad.setPosition(cornerX, cornerSettingsY).setScale((corner * 2) / 128);
    this.settingsIcon
      .setScale((corner * 1.05) / 96)
      .setPosition(cornerX, cornerSettingsY);

    this.sharePad.setPosition(cornerX, shareY).setScale((corner * 2) / 128);
    this.shareIcon.setScale((corner * 1.0) / 96).setPosition(cornerX, shareY);

    this.toast.setFontSize(Math.max(10, Math.round(width * 0.028)));
    this.toast.setPosition(width / 2, muteY - 18);

    this.buildText.setFontSize(Math.max(9, Math.round(width * 0.024)));
    this.buildText.setPosition(14, height - insets.bottom - 14);
  }

  /// A dark stone button with the palace's gold hairline.
  drawButton(x, y, w, h, primary) {
    drawStoneButton(this.buttons, x, y, w, h, { primary });
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
      return;
    }

    if (this.settingsMenuZone && inRect(x, y, this.rectOf(this.settingsMenuZone), 8)) {
      this.openSettings();
      return;
    }

    if (this.settingsPad && inCircle(x, y, this.settingsPad.x, this.settingsPad.y, 30)) {
      this.openSettings();
      return;
    }

    if (this.sharePad && inCircle(x, y, this.sharePad.x, this.sharePad.y, 30)) {
      this.shareGame();
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
      this.newText.setColor('#ff8b98');
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
    this.newText.setColor('#cdb6b6');
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

  openSettings() {
    if (!this.guardTap()) return;

    sound.play('jump');
    this.scene.start('Settings');
  }

  /// Hands the game to the phone's own share sheet, or copies the link.
  shareGame() {
    if (!this.guardTap()) return;

    const url = window.location.href;
    const data = {
      title: 'Shadow Ninja',
      text: 'Shadow Ninja — a rooftop ninja platformer.',
      url
    };

    if (navigator.share) {
      navigator.share(data).catch(() => {
        // A cancelled share is not worth reporting.
      });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => this.showToast('Link copied'))
        .catch(() => this.showToast('Copy it from the address bar'));
      return;
    }

    this.showToast(url);
  }

  showToast(message) {
    this.toast.setText(message).setAlpha(0);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 1, duration: 180, hold: 1500, yoyo: true });
  }

  /// The opening shot: the dark lifts off the gate, the title settles into
  /// place, and the menu rises under it. It plays once per session.
  playIntro() {
    if (this.registry.get('introPlayed')) return;
    this.registry.set('introPlayed', true);

    const { width, height } = this.scale.gameSize;

    const veil = this.add.graphics().setDepth(92);
    veil.fillStyle(0x040206, 1);
    veil.fillRect(0, 0, width, height);

    const titleScale = this.title.scaleX || 1;
    this.title.setAlpha(0).setScale(titleScale * 1.35);
    this.tweens.add({
      targets: this.title,
      alpha: 1,
      scale: titleScale,
      duration: 900,
      delay: 320,
      ease: 'Cubic.easeOut'
    });

    this.ninja.setAlpha(0);
    this.tweens.add({ targets: this.ninja, alpha: 1, duration: 500, delay: 420 });

    const rising = [
      this.continueText,
      this.endlessText,
      this.newText,
      this.bestText,
      this.buttons,
      this.titleRule,
      this.settingsButton,
      this.settingsMenuText,
      this.settingsMenuIcon
    ];

    for (const object of rising) object.setAlpha(0);
    this.tweens.add({
      targets: rising,
      alpha: 1,
      duration: 800,
      delay: 720,
      ease: 'Sine.easeOut'
    });

    // A lantern bloom behind the palace as the dark lifts, then a soft glow.
    const bloom = this.add
      .image(width / 2, height * 0.55, 'glow')
      .setDepth(1)
      .setTint(0xffb066)
      .setScale(0.4)
      .setAlpha(0);

    this.tweens.add({
      targets: bloom,
      alpha: 0.32,
      scale: 2.4,
      duration: 1300,
      delay: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: bloom, alpha: 0.1, duration: 900 });
      }
    });

    this.tweens.add({
      targets: veil,
      alpha: 0,
      duration: 900,
      delay: 160,
      ease: 'Sine.easeIn',
      onComplete: () => veil.destroy()
    });
  }
}
