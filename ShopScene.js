// The gem stall, one tap from the scroll map: a lamplit counter with a masked
// shopkeeper behind it and three upgrade cards across the front. Gems banked in
// the levels buy a fourth life, a shorter dash recharge and a longer sword reach.

import { registerIcons } from './icons.js';
import { buildWorldTextures } from './textures.js';
import { buildSpriteTextures } from './sprites.js';
import {
  loadProgress,
  buyUpgrade,
  UPGRADE_PRICES,
  MAX_UPGRADE_LEVEL
} from './progress.js';
import { sound } from './sound.js';
import { watchPress, inRect, inCircle } from './press.js';

const FONT = '-apple-system, system-ui, sans-serif';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    if (this.scene.isActive('Game')) this.scene.stop('Game');
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');

    buildWorldTextures(this);
    buildSpriteTextures(this);
    registerIcons(this, ['heart', 'zap', 'sword', 'swords', 'crosshair', 'move-right', 'gem', 'map']);

    this.progress = loadProgress();

    const reachIcon =
      ['sword', 'swords', 'crosshair', 'move-right'].find((name) =>
        this.textures.exists(`icon-${name}`)
      ) || 'crosshair';

    this.backdrop = this.add.graphics().setDepth(0);
    this.stall = this.add.graphics().setDepth(1);

    this.shopkeeper = this.add.sprite(0, 0, 'guard', 0).setOrigin(0.5, 1).setDepth(2);

    this.lanternLeft = this.add.image(0, 0, 'glow').setDepth(1).setAlpha(0.3).setTint(0xff7a5a);
    this.lanternRight = this.add.image(0, 0, 'glow').setDepth(1).setAlpha(0.3).setTint(0xff7a5a);

    this.title = this.add
      .text(0, 0, 'GEM STALL', {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.gemIcon = this.add.image(0, 0, 'icon-gem').setDepth(4).setTint(0x8fe8ff);
    this.gemText = this.add
      .text(0, 0, '0', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0, 0.5)
      .setDepth(4);

    this.mapPad = this.add.image(0, 0, 'pad').setDepth(4).setAlpha(0.75);
    this.mapPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.mapIcon = this.add.image(0, 0, 'icon-map').setDepth(5).setTint(0xf4efe2);
    this.mapPad.on('pointerdown', () => this.openMap());

    this.cards = this.add.graphics().setDepth(3);

    this.cardParts = [
      { key: 'lives', label: 'EXTRA LIFE', icon: 'heart' },
      { key: 'dash', label: 'DASH RECHARGE', icon: 'zap' },
      { key: 'reach', label: 'SWORD REACH', icon: reachIcon }
    ].map((config) => this.createCard(config));

    // The stall also reads the raw press, so a card or the map button answers
    // even if the turned screen confused the pointer hit test.
    watchPress(this, (x, y) => this.pressAt(x, y));

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
    });

    this.layout(this.scale.gameSize);
    this.refresh();

    sound.playMusic('palace');
  }

  update() {
    sound.update();
  }

  createCard(config) {
    const icon = this.add.image(0, 0, `icon-${config.icon}`).setDepth(4).setTint(0xf6e7e9);
    const label = this.add
      .text(0, 0, config.label, {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#d8aeb4'
      })
      .setOrigin(0.5)
      .setDepth(4);

    const priceGem = this.add.image(0, 0, 'icon-gem').setDepth(4).setTint(0x8fe8ff);
    const price = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0, 0.5)
      .setDepth(4);

    const buyText = this.add
      .text(0, 0, 'BUY', {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f6e7e9'
      })
      .setOrigin(0.5)
      .setDepth(4);

    const zone = this.add.zone(0, 0, 10, 10).setInteractive();
    zone.on('pointerdown', () => this.buy(config.key));

    return { ...config, icon, label, priceGem, price, buyText, zone, rect: null };
  }

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const groundY = Math.round(height * 0.93);
    const counterTop = Math.round(height * 0.5);
    const counterH = Math.max(14, Math.round(height * 0.08));

    // Backdrop and floor.
    this.backdrop.clear();
    this.backdrop.fillGradientStyle(0x060306, 0x060306, 0x23080e, 0x120407, 1);
    this.backdrop.fillRect(0, 0, width, height);
    this.backdrop.fillStyle(0x0d0508, 1);
    this.backdrop.fillRect(0, groundY, width, height - groundY);

    // The stall: two posts, a beam and a wooden counter.
    this.stall.clear();
    this.stall.fillStyle(0x1a060b, 1);
    this.stall.fillRect(width * 0.06, height * 0.14, 14, groundY - height * 0.14);
    this.stall.fillRect(width * 0.94 - 14, height * 0.14, 14, groundY - height * 0.14);
    this.stall.fillRect(width * 0.04, height * 0.12, width * 0.92, 12);
    this.stall.fillStyle(0xff2f45, 0.16);
    this.stall.fillRect(width * 0.04, height * 0.12, width * 0.92, 3);

    this.stall.fillStyle(0x35200f, 1);
    this.stall.fillRect(width * 0.02, counterTop, width * 0.96, counterH);
    this.stall.fillStyle(0x4a2c16, 1);
    this.stall.fillRect(width * 0.02, counterTop, width * 0.96, 4);

    this.shopkeeper
      .setPosition(width * 0.5, counterTop + 4)
      .setScale(Math.max(1.1, Math.min(1.8, height / 260)));

    this.lanternLeft.setPosition(width * 0.14, counterTop - 46).setScale(0.9);
    this.lanternRight.setPosition(width * 0.86, counterTop - 46).setScale(0.9);

    this.title.setFontSize(Math.round(Math.min(22, width * 0.032)));
    this.title.setPosition(width / 2, height * 0.09);

    this.gemIcon.setScale(0.2).setPosition(width - 64, height * 0.09);
    this.gemText.setFontSize(Math.round(Math.min(16, width * 0.024)));
    this.gemText.setPosition(width - 50, height * 0.09);

    this.mapPad.setPosition(38, height * 0.09).setScale(44 / 128);
    this.mapIcon.setScale(32 / 96).setPosition(38, height * 0.09);

    // Three cards across the front of the counter.
    const gap = Math.max(10, width * 0.015);
    const cardW = Math.min(220, (width - 60 - gap * 2) / 3);
    const cardY = counterTop + counterH * 0.6;
    const cardH = Math.max(110, Math.min(height * 0.42, height - cardY - 12));
    const startX = (width - (cardW * 3 + gap * 2)) / 2;

    this.cardParts.forEach((card, index) => {
      const x = startX + index * (cardW + gap);
      card.rect = { x, y: cardY, w: cardW, h: cardH };

      const iconSize = Math.round(Math.min(30, cardW * 0.16));
      card.icon.setScale(iconSize / 96).setPosition(x + cardW / 2, cardY + cardH * 0.17);

      card.label.setFontSize(Math.max(8, Math.round(cardW * 0.055)));
      card.label.setPosition(x + cardW / 2, cardY + cardH * 0.33);

      card.priceGem.setScale(0.15).setPosition(x + cardW / 2 - 24, cardY + cardH * 0.45);
      card.price.setFontSize(Math.max(10, Math.round(cardW * 0.07)));
      card.price.setPosition(x + cardW / 2 - 14, cardY + cardH * 0.45);
    });

    this.refresh();
  }

  refresh() {
    const progress = this.progress;

    this.gemText.setText(String(this.progress.gems));

    this.cards.clear();

    for (const card of this.cardParts) {
      const rect = card.rect;
      if (!rect) continue;

      const level = this.progress.upgrades[card.key] || 0;
      const maxed = level >= MAX_UPGRADE_LEVEL;
      const cost = maxed ? 0 : UPGRADE_PRICES[level];
      const affordable = !maxed && this.progress.gems >= cost;

      // Card panel.
      this.cards.fillStyle(0x160609, 0.96);
      this.cards.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 12);
      this.cards.lineStyle(2, 0xff2f45, 0.45);
      this.cards.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 12);

      // Level pips.
      const pipY = rect.y + rect.h * 0.62;
      for (let i = 0; i < MAX_UPGRADE_LEVEL; i += 1) {
        const px = rect.x + rect.w / 2 + (i - 1) * 14;
        this.cards.fillStyle(i < level ? 0xffb347 : 0x3a1018, 1);
        this.cards.fillCircle(px, pipY, 4);
      }

      // Buy button: gold when it can be afforded.
      const bw = rect.w - 24;
      const bh = Math.max(28, rect.h * 0.2);
      const bx = rect.x + 12;
      const by = rect.y + rect.h - bh - 12;

      this.cards.fillStyle(maxed ? 0x1c0a0e : affordable ? 0x3a1108 : 0x1c0a0e, 1);
      this.cards.fillRoundedRect(bx, by, bw, bh, 8);
      this.cards.lineStyle(2, maxed ? 0x4a2028 : affordable ? 0xffb347 : 0x6a2a30, 0.9);
      this.cards.strokeRoundedRect(bx, by, bw, bh, 8);

      card.buyText.setText(maxed ? 'MAXED' : 'BUY');
      card.buyText.setColor(affordable ? '#ffd98a' : '#9a7a80');
      card.buyText.setPosition(bx + bw / 2, by + bh / 2);

      card.price.setVisible(!maxed);
      card.priceGem.setVisible(!maxed);
      if (!maxed) {
        card.price.setText(String(cost));
      }

      card.zone.setPosition(bx + bw / 2, by + bh / 2).setSize(bw, bh);
    }
  }

  /// One action per press, whichever path of input reported it.
  guardTap() {
    const now = Date.now();
    if (now - (this.lastTapAt || 0) < 320) return false;
    this.lastTapAt = now;
    return true;
  }

  pressAt(x, y) {
    if (this.mapPad && inCircle(x, y, this.mapPad.x, this.mapPad.y, 30)) {
      this.openMap();
      return;
    }

    for (const card of this.cardParts) {
      if (inRect(x, y, card.rect, 4)) {
        this.buy(card.key);
        return;
      }
    }
  }

  buy(key) {
    if (!this.guardTap()) return;

    const result = buyUpgrade(key);

    if (!result) {
      sound.play('trap');
      this.cameras.main.shake(90, 0.003);
      return;
    }

    this.progress = result;
    sound.play('gem');
    this.cameras.main.flash(120, 255, 200, 120);
    this.refresh();
  }

  openMap() {
    if (!this.guardTap()) return;

    sound.play('jump');
    this.scene.start('LevelSelect');
  }
}
