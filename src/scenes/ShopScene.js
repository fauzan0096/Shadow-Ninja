// The gem stall, one tap from the scroll map: a lamplit counter with a masked
// shopkeeper behind it and three upgrade cards across the front. Gems banked in
// the levels buy a fourth life, a shorter dash recharge and a longer sword reach.

import { registerIcons } from '../icons.js';
import { buildWorldTextures } from '../art/textures.js';
import { buildSpriteTextures } from '../art/sprites.js';
import {
  loadProgress,
  buyUpgrade,
  UPGRADE_PRICES,
  MAX_UPGRADE_LEVEL
} from '../levels/progress.js';
import { sound } from '../audio/sound.js';
import { watchPress, inRect, inCircle } from '../ui/press.js';
import { safeInsets } from '../ui/layout.js';
import { COLORS, TEXT, drawScreenBackdrop, drawStonePanel } from '../ui/style.js';

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
        color: '#f7ecdd'
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.gemIcon = this.add.image(0, 0, 'icon-gem').setDepth(4);
    this.gemText = this.add
      .text(0, 0, '0', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#f7ecdd'
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
        color: '#cdb6b6'
      })
      .setOrigin(0.5)
      .setDepth(4);

    const priceGem = this.add.image(0, 0, 'icon-gem').setDepth(4).setTint(0x8fe8ff);
    const price = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(0, 0.5)
      .setDepth(4);

    const buyText = this.add
      .text(0, 0, 'BUY', {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f7ecdd'
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

    const insets = safeInsets();
    const portrait = height > width * 1.05;
    this.portrait = portrait;

    const top = insets.top;
    const groundY = Math.max(120, height - 12);
    const counterY = Math.round(height * (portrait ? 0.31 : 0.44));
    const counterH = Math.max(13, height * 0.035);

    // Backdrop and floor.
    drawScreenBackdrop(this.backdrop, width, height);
    this.backdrop.fillStyle(0x0b0407, 1);
    this.backdrop.fillRect(0, groundY, width, height - groundY);

    // The stall: two posts, a beam and a wooden counter.
    this.stall.clear();
    this.stall.fillStyle(0x1a060b, 1);
    this.stall.fillRect(width * 0.06, top + 12, 12, counterY - top - 12);
    this.stall.fillRect(width * 0.94 - 12, top + 12, 12, counterY - top - 12);
    this.stall.fillRect(width * 0.045, top + 6, width * 0.91, 8);
    this.stall.fillStyle(COLORS.gold, 0.22);
    this.stall.fillRect(width * 0.045, top + 6, width * 0.91, 2);

    this.stall.fillStyle(0x2a160b, 1);
    this.stall.fillRect(width * 0.02, counterY, width * 0.96, counterH);
    this.stall.fillStyle(0x44240f, 1);
    this.stall.fillRect(width * 0.02, counterY, width * 0.96, 3);
    this.stall.fillStyle(COLORS.gold, 0.24);
    this.stall.fillRect(width * 0.02, counterY + counterH - 2, width * 0.96, 2);

    this.shopkeeper.setPosition(width * 0.5, counterY + 2).setScale(portrait ? 1.5 : 1.8);

    this.lanternLeft.setPosition(width * 0.14, counterY - 40).setScale(portrait ? 0.7 : 0.9);
    this.lanternRight.setPosition(width * 0.86, counterY - 40).setScale(portrait ? 0.7 : 0.9);

    this.title
      .setFontSize(Math.round(Math.min(22, Math.max(15, width * 0.055))))
      .setPosition(width / 2, top + 26);

    const gemSize = Math.max(12, Math.round(Math.min(18, width * 0.04)));
    this.gemIcon.setScale((gemSize * 1.3) / 96).setPosition(width - 58, top + 26);
    this.gemText.setFontSize(gemSize).setPosition(width - 46, top + 26);

    this.mapPad.setPosition(38, top + 26).setScale(44 / 128);
    this.mapIcon.setScale(32 / 96).setPosition(38, top + 26);

    const gap = Math.max(10, width * 0.015);

    if (portrait) {
      // Upright phone: the stall is a column of rows, each wide enough to read.
      const listTop = counterY + counterH + Math.max(14, height * 0.025);
      const listBottom = groundY - 16;
      const rowGap = Math.max(9, height * 0.013);
      const cardW = width - 32;
      const rowH = Math.max(
        66,
        Math.min(118, (listBottom - listTop - rowGap * 2) / 3)
      );
      const total = rowH * 3 + rowGap * 2;
      const startY = listTop + Math.max(0, (listBottom - listTop - total) / 2);

      this.cardParts.forEach((card, index) => {
        card.rect = {
          x: 16,
          y: startY + index * (rowH + rowGap),
          w: cardW,
          h: rowH
        };
      });
    } else {
      // A wide panel keeps the three cards side by side across the counter.
      const cardW = Math.min(220, (width - 60 - gap * 2) / 3);
      const cardY = counterY + counterH * 0.6;
      const cardH = Math.max(110, Math.min(height * 0.42, height - cardY - 12));
      const startX = (width - (cardW * 3 + gap * 2)) / 2;

      this.cardParts.forEach((card, index) => {
        const x = startX + index * (cardW + gap);
        card.rect = { x, y: cardY, w: cardW, h: cardH };
      });
    }

    this.refresh();
  }

  refresh() {
    const portrait = Boolean(this.portrait);

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
      drawStonePanel(this.cards, rect.x, rect.y, rect.w, rect.h, {
        radius: 14,
        line: COLORS.emberDim,
        lineAlpha: 0.5
      });

      // Buy button: gold when it can be afforded.
      const bh = Math.max(30, Math.min(rect.h * (portrait ? 0.42 : 0.2), portrait ? 54 : 46));
      const bw = portrait ? Math.min(140, rect.w * 0.34) : rect.w - 24;
      const bx = portrait ? rect.x + rect.w - bw - 12 : rect.x + 12;
      const by = portrait ? rect.y + (rect.h - bh) / 2 : rect.y + rect.h - bh - 12;

      this.cards.fillStyle(maxed ? 0x1c0a0e : affordable ? 0x2a1409 : 0x1c0a0e, 1);
      this.cards.fillRoundedRect(bx, by, bw, bh, 10);
      this.cards.lineStyle(2, maxed ? 0x4a2028 : affordable ? COLORS.gold : COLORS.emberDim, 0.9);
      this.cards.strokeRoundedRect(bx, by, bw, bh, 10);

      if (portrait) {
        // A row: the icon, the name over its pips, the price under them, and the
        // buy button out at the thumb's end of the row.
        const iconSize = Math.min(rect.h * 0.52, 46);
        card.icon.setScale(iconSize / 96).setPosition(rect.x + 16 + iconSize / 2, rect.y + rect.h / 2);

        const textX = rect.x + 16 + iconSize + 14;

        card.label
          .setFontSize(Math.max(10, Math.min(16, Math.round(rect.h * 0.17))))
          .setOrigin(0, 0.5)
          .setPosition(textX, rect.y + rect.h * 0.3);

        const pipY = rect.y + rect.h * 0.56;
        for (let i = 0; i < MAX_UPGRADE_LEVEL; i += 1) {
          this.cards.fillStyle(i < level ? COLORS.gold : 0x3a1018, 1);
          this.cards.fillCircle(textX + 6 + i * 16, pipY, 4.5);
        }

        card.priceGem.setScale(0.14).setPosition(textX, rect.y + rect.h * 0.8);
        card.price
          .setFontSize(Math.max(11, Math.min(15, Math.round(rect.h * 0.18))))
          .setPosition(textX + 12, rect.y + rect.h * 0.8);
      } else {
        const iconSize = Math.round(Math.min(30, rect.w * 0.16));
        card.icon.setScale(iconSize / 96).setPosition(rect.x + rect.w / 2, rect.y + rect.h * 0.17);

        card.label
          .setFontSize(Math.max(8, Math.round(rect.w * 0.055)))
          .setOrigin(0.5, 0.5)
          .setPosition(rect.x + rect.w / 2, rect.y + rect.h * 0.33);

        const pipY = rect.y + rect.h * 0.62;
        for (let i = 0; i < MAX_UPGRADE_LEVEL; i += 1) {
          const px = rect.x + rect.w / 2 + (i - 1) * 14;
          this.cards.fillStyle(i < level ? COLORS.gold : 0x3a1018, 1);
          this.cards.fillCircle(px, pipY, 4);
        }

        card.priceGem.setScale(0.15).setPosition(rect.x + rect.w / 2 - 24, rect.y + rect.h * 0.45);
        card.price
          .setFontSize(Math.max(10, Math.round(rect.w * 0.07)))
          .setPosition(rect.x + rect.w / 2 - 14, rect.y + rect.h * 0.45);
      }

      card.buyText
        .setText(maxed ? 'MAXED' : 'BUY')
        .setFontSize(Math.max(11, Math.min(16, Math.round(bh * 0.42))))
        .setColor(affordable ? TEXT.goldLight : '#9a7a80')
        .setPosition(bx + bw / 2, by + bh / 2);

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
