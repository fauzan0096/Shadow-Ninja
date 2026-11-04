// The settings card, one tap from the title screen: how big the touch pads are,
// the sound switch, and a way to share the game.
//
// It is drawn in the same stone-and-gold as every other menu, and it reads the
// raw press as well as Phaser's own hit test so a tap always answers.

import { registerIcons } from '../icons.js';
import { buildWorldTextures } from '../art/textures.js';
import { sound } from '../audio/sound.js';
import { watchPress, inRect, inCircle } from '../ui/press.js';
import { safeInsets } from '../ui/layout.js';
import {
  COLORS,
  TEXT,
  drawScreenBackdrop,
  drawStoneButton,
  drawStonePanel
} from '../ui/style.js';
import { PAD_SIZES, padSizeId, setPadSize, padScale } from '../ui/settings.js';

const FONT = '-apple-system, system-ui, sans-serif';

const PREVIEW_ICONS = ['chevron-left', 'chevron-right', 'chevron-up'];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    if (this.scene.isActive('Game')) this.scene.stop('Game');
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');

    buildWorldTextures(this);
    registerIcons(this, [
      'chevron-left',
      'chevron-right',
      'chevron-up',
      'check',
      'volume-2',
      'volume-x',
      'share-2'
    ]);

    this.backdrop = this.add.graphics().setDepth(0);
    this.glow = this.add.image(0, 0, 'glow').setDepth(0).setAlpha(0.16).setTint(0xff8a90);

    // Back to the title, top left.
    this.backPad = this.add.image(0, 0, 'pad').setDepth(6).setAlpha(0.7);
    this.backPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.backIcon = this.add.image(0, 0, 'icon-chevron-left').setDepth(7).setTint(0xf4efe2);
    this.backPad.on('pointerdown', () => this.goBack());

    this.title = this.add
      .text(0, 0, 'SETTINGS', {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: TEXT.paper
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.rule = this.add.graphics().setDepth(3);

    this.section = this.add
      .text(0, 0, 'CONTROL SIZE', {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: TEXT.gold
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.options = PAD_SIZES.map((option) => this.createOption(option));

    // Three pads drawn at the chosen size, so the choice can be seen.
    this.previewPads = [];
    this.previewIcons = [];
    PREVIEW_ICONS.forEach((name) => {
      this.previewPads.push(this.add.image(0, 0, 'pad').setDepth(3).setAlpha(0.72));
      this.previewIcons.push(this.add.image(0, 0, `icon-${name}`).setDepth(4).setTint(0xf4efe2));
    });

    this.rows = this.add.graphics().setDepth(3);

    this.soundIcon = this.add.image(0, 0, 'icon-volume-2').setDepth(4).setTint(0xffd98a);
    this.soundText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: TEXT.paper
      })
      .setOrigin(0, 0.5)
      .setDepth(4);

    this.soundZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.soundZone.on('pointerdown', () => this.toggleSound());

    this.shareIcon = this.add.image(0, 0, 'icon-share-2').setDepth(4).setTint(0xffd98a);
    this.shareText = this.add
      .text(0, 0, 'SHARE THE GAME', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: TEXT.paper
      })
      .setOrigin(0, 0.5)
      .setDepth(4);

    this.shareZone = this.add.zone(0, 0, 10, 10).setInteractive();
    this.shareZone.on('pointerdown', () => this.shareGame());

    this.hint = this.add
      .text(0, 0, 'Pads change size on the next roof.', {
        fontFamily: FONT,
        fontSize: '10px',
        color: TEXT.dim
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.toast = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: TEXT.goldLight
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setAlpha(0);

    watchPress(this, (x, y) => this.pressAt(x, y));

    this.refreshSound();

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

  createOption(option) {
    const face = this.add.graphics().setDepth(3);
    const label = this.add
      .text(0, 0, option.label, {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: TEXT.muted
      })
      .setOrigin(0.5)
      .setDepth(4);

    const check = this.add
      .image(0, 0, 'icon-check')
      .setDepth(5)
      .setTint(COLORS.jade)
      .setVisible(false);

    const zone = this.add.zone(0, 0, 10, 10).setInteractive();
    zone.on('pointerdown', () => this.pickSize(option.id));

    return { ...option, face, label, check, zone, rect: null };
  }

  // ------------------------------------------------------------------ layout

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const insets = safeInsets();
    const top = insets.top;
    const portrait = height > width * 1.05;
    const cx = width / 2;

    drawScreenBackdrop(this.backdrop, width, height);
    this.glow
      .setPosition(width * 0.2, top + height * 0.22)
      .setScale(Math.max(1.4, width / 240))
      .setAlpha(0.16);

    this.backPad.setPosition(42, top + 42).setScale(48 / 128);
    this.backIcon.setScale(28 / 96).setPosition(42, top + 42);

    const contentW = Math.min(width - 40, portrait ? 420 : 460);

    const titleSize = Math.round(
      Math.min(34, Math.max(20, width * (portrait ? 0.085 : 0.05)))
    );
    const titleY = top + Math.max(40, height * 0.06);
    this.title.setFontSize(titleSize).setPosition(cx, titleY);

    this.rule.clear();
    const ruleW = Math.min(contentW * 0.55, 200);
    this.rule.fillStyle(COLORS.gold, 0.45);
    this.rule.fillRect(cx - ruleW / 2, titleY + titleSize * 0.75, ruleW, 1.5);

    const sectionY = titleY + titleSize * 1.9;
    this.section.setFontSize(Math.max(11, Math.round(titleSize * 0.4))).setPosition(cx, sectionY);

    const optH = Math.max(44, Math.min(60, height * 0.07));
    const optGap = 8;
    const optW = (contentW - optGap * 2) / 3;
    const optY = sectionY + Math.max(26, height * 0.045);
    const labelSize = Math.max(10, Math.round(optH * 0.29));

    this.options.forEach((option, index) => {
      const x = cx - contentW / 2 + optW / 2 + index * (optW + optGap);
      option.rect = { x: x - optW / 2, y: optY - optH / 2, w: optW, h: optH };
      option.zone.setPosition(x, optY).setSize(optW, optH);
      option.label.setFontSize(labelSize).setPosition(x, optY + 2);
      option.check.setScale(15 / 96).setPosition(x + optW / 2 - 12, optY - optH / 2 + 12);
    });

    this.refreshOptions();

    const scale = padScale();
    const previewR = Math.max(15, Math.min(27, optH * 0.46)) * scale;
    const previewY = optY + optH * 0.5 + Math.max(28, height * 0.042) + previewR;

    this.previewPads.forEach((pad, index) => {
      const x = cx + (index - 1) * previewR * 2.5;
      pad.setScale((previewR * 2) / 128).setPosition(x, previewY);
      this.previewIcons[index].setScale((previewR * 1.05) / 96).setPosition(x, previewY);
    });

    const rowW = contentW;
    const rowH = Math.max(46, Math.min(60, height * 0.064));
    const rowX = cx - rowW / 2;
    const rowGap = Math.max(10, height * 0.018);

    const soundY = previewY + previewR + Math.max(20, height * 0.028) + rowH / 2;
    const shareY = soundY + rowH + rowGap;

    this.rows.clear();
    drawStonePanel(this.rows, rowX, soundY - rowH / 2, rowW, rowH, {
      radius: 13,
      line: COLORS.emberDim,
      lineAlpha: 0.4
    });
    drawStonePanel(this.rows, rowX, shareY - rowH / 2, rowW, rowH, {
      radius: 13,
      line: COLORS.emberDim,
      lineAlpha: 0.4
    });

    const rowIcon = Math.min(26, rowH * 0.5);
    const rowText = Math.max(12, Math.round(rowH * 0.33));

    this.soundIcon.setScale(rowIcon / 96).setPosition(rowX + 24, soundY);
    this.soundText.setFontSize(rowText).setPosition(rowX + 44, soundY);

    this.shareIcon.setScale(rowIcon / 96).setPosition(rowX + 24, shareY);
    this.shareText.setFontSize(rowText).setPosition(rowX + 44, shareY);

    this.soundZone.setPosition(cx, soundY).setSize(rowW, rowH);
    this.shareZone.setPosition(cx, shareY).setSize(rowW, rowH);

    this.hint.setFontSize(Math.max(9, Math.round(width * 0.026)));
    this.hint.setPosition(cx, Math.min(height - insets.bottom - 46, shareY + rowH / 2 + Math.max(14, height * 0.02)));

    this.toast.setFontSize(Math.max(10, Math.round(width * 0.028)));
    this.toast.setPosition(cx, Math.min(height - insets.bottom - 14, shareY + rowH / 2 + Math.max(32, height * 0.045)));
  }

  refreshOptions() {
    const chosen = padSizeId();

    for (const option of this.options) {
      const rect = option.rect;
      if (!rect) continue;

      option.face.clear();
      drawStoneButton(option.face, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, {
        primary: option.id === chosen
      });

      option.label.setColor(option.id === chosen ? TEXT.goldLight : TEXT.muted);
      option.check.setVisible(option.id === chosen);
    }
  }

  refreshSound() {
    const muted = sound.isMuted();
    this.soundIcon.setTexture(muted ? 'icon-volume-x' : 'icon-volume-2');
    this.soundText.setText(muted ? 'SOUND OFF' : 'SOUND ON');
    this.soundText.setColor(muted ? TEXT.muted : TEXT.paper);
  }

  // ------------------------------------------------------------------ input

  /// One action per press, whichever path of input reported it.
  guardTap() {
    const now = Date.now();
    if (now - (this.lastTapAt || 0) < 320) return false;
    this.lastTapAt = now;
    return true;
  }

  pressAt(x, y) {
    if (this.backPad && inCircle(x, y, this.backPad.x, this.backPad.y, 30)) {
      this.goBack();
      return;
    }

    for (const option of this.options) {
      if (inRect(x, y, option.rect, 4)) {
        this.pickSize(option.id);
        return;
      }
    }

    if (this.soundZone && inRect(x, y, this.rectOf(this.soundZone), 4)) {
      this.toggleSound();
      return;
    }

    if (this.shareZone && inRect(x, y, this.rectOf(this.shareZone), 4)) {
      this.shareGame();
    }
  }

  rectOf(zone) {
    return {
      x: zone.x - zone.width / 2,
      y: zone.y - zone.height / 2,
      w: zone.width,
      h: zone.height
    };
  }

  pickSize(id) {
    if (!this.guardTap()) return;

    setPadSize(id);
    sound.play('jump');
    this.refreshOptions();
    this.layout(this.scale.gameSize);
  }

  toggleSound() {
    if (!this.guardTap()) return;

    sound.toggleMuted();
    this.refreshSound();
  }

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
        // A cancelled share is not an error worth telling the player about.
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

  goBack() {
    if (!this.guardTap()) return;

    sound.play('jump');
    this.scene.start('Title');
  }
}
