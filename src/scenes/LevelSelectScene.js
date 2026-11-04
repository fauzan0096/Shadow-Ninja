// The level select: thirteen nodes winding down a scroll of the palace map — the
// twelve roofs and the warlord's hall beneath them.
//
// A node opens a roof when the one before it has been cleared, and cleared roofs
// are remembered between sessions. The map is where the game starts, and where a
// finished run comes back to.

import { registerIcons } from '../icons.js';
import { buildSpriteTextures } from '../art/sprites.js';
import { LEVELS } from '../levels/levels.js';
import { loadProgress, isUnlocked, setHero } from '../levels/progress.js';
import { sound } from '../audio/sound.js';
import { formatTime } from '../core/format.js';
import { watchPress, inRect, inCircle } from '../ui/press.js';
import { safeInsets } from '../ui/layout.js';

const FONT = '-apple-system, system-ui, sans-serif';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create() {
    if (this.scene.isActive('Game')) this.scene.stop('Game');
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');

    registerIcons(this, ['lock', 'gem', 'trophy']);

    buildSpriteTextures(this);

    const progress = loadProgress();
    this.cleared = progress.cleared;
    this.records = progress.records || {};
    this.bank = progress.gems;
    this.hero = progress.hero === 'kunoichi' ? 'kunoichi' : 'ninja';

    this.backdrop = this.add.graphics();
    this.path = this.add.graphics();

    this.title = this.add
      .text(0, 0, 'Shadow Ninja', {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, this.nextLine(), {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#cdb6b6'
      })
      .setOrigin(0.5);

    this.nodes = LEVELS.map((level, index) => this.createNode(level, index));

    // The gem stall, with the banked gems shown beside it.
    this.shopPad = this.add.image(0, 0, 'pad').setDepth(10).setAlpha(0.75);
    this.shopPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.shopIcon = this.add.image(0, 0, 'icon-gem').setDepth(11).setTint(0xffffff);
    this.shopPad.on('pointerdown', () => this.openShop());

    // The records board in the corner opposite the stall.
    this.recordsPad = this.add.image(0, 0, 'pad').setDepth(10).setAlpha(0.75);
    this.recordsPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.recordsIcon = this.add.image(0, 0, 'icon-trophy').setDepth(11).setTint(0xffd98a);
    this.recordsPad.on('pointerdown', () => this.openRecords());

    this.bankIcon = this.add.image(0, 0, 'icon-gem').setDepth(11).setTint(0xffffff);
    this.bankText = this.add
      .text(0, 0, String(this.bank), {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(0, 0.5)
      .setDepth(11);

    // The second fighter, once the warlord has fallen, sits beside the stall.
    this.kunoUnlocked = this.cleared.includes(LEVELS.length - 1);
    this.portraitPad = this.add.image(0, 0, 'pad').setDepth(10).setAlpha(0.75);
    this.portraitPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.portrait = this.add.image(0, 0, this.hero, 0).setDepth(11).setOrigin(0.5, 0.92);
    this.portraitPad.on('pointerdown', () => this.toggleHero());

    // A raw press is checked against the same buttons, so a node or a corner
    // pad answers even if the turned screen confused the pointer hit test.
    watchPress(this, (x, y) => this.pressAt(x, y));

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

  /// Which roof is waiting for the player next.
  nextLine() {
    for (let index = 0; index < LEVELS.length; index += 1) {
      if (isUnlocked(index, this.cleared) && !this.cleared.includes(index)) {
        return `Next: ${LEVELS[index].name}`;
      }
    }
    return 'Every roof is clear, down to the warlord.';
  }

  createNode(level, index) {
    const ring = this.add.circle(0, 0, 30, 0x22080d, 1);
    ring.setStrokeStyle(3, 0xff7a8a, 1);

    const label = this.add
      .text(0, 0, String(index + 1), {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(0.5);

    const lock = this.add.image(0, 0, 'icon-lock').setScale(0.26).setTint(0x9a90b0);

    // The best run on this roof, once it has been cleared.
    const record = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: '#b98a90' })
      .setOrigin(0.5)
      .setVisible(false);

    const zone = this.add.zone(0, 0, 40, 40).setInteractive();
    zone.on('pointerdown', () => this.pick(index));

    return {
      ring,
      label,
      lock,
      record,
      zone,
      index,
      name: level.name,
      x: 0,
      y: 0,
      radius: 30
    };
  }

  openShop() {
    if (!this.guardTap()) return;

    this.scene.start('Shop');
  }

  openRecords() {
    if (!this.guardTap()) return;

    this.scene.start('Records');
  }

  /// One action per press, whichever path of input reported it.
  guardTap() {
    const now = Date.now();
    if (now - (this.lastTapAt || 0) < 320) return false;
    this.lastTapAt = now;
    return true;
  }

  pressAt(x, y) {
    for (const node of this.nodes) {
      const rect = {
        x: node.zone.x - node.zone.width / 2,
        y: node.zone.y - node.zone.height / 2,
        w: node.zone.width,
        h: node.zone.height
      };

      if (inRect(x, y, rect, 6)) {
        this.pick(node.index);
        return;
      }
    }

    if (this.recordsPad && inCircle(x, y, this.recordsPad.x, this.recordsPad.y, 30)) {
      this.openRecords();
      return;
    }

    if (this.shopPad && inCircle(x, y, this.shopPad.x, this.shopPad.y, 30)) {
      this.openShop();
      return;
    }

    if (
      this.kunoUnlocked &&
      this.portraitPad &&
      inCircle(x, y, this.portraitPad.x, this.portraitPad.y, 30)
    ) {
      this.toggleHero();
    }
  }

  toggleHero() {
    if (!this.kunoUnlocked) return;
    if (!this.guardTap()) return;

    this.hero = this.hero === 'ninja' ? 'kunoichi' : 'ninja';
    this.portrait.setTexture(this.hero, 0);
    setHero(this.hero);
    sound.play('jump');
  }

  pick(index) {
    if (!this.guardTap()) return;

    if (!isUnlocked(index, this.cleared)) {
      this.subtitle.setText('Clear the roof before this one.');
      this.cameras.main.shake(120, 0.004);
      return;
    }

    this.scene.start('Game', { level: index });
  }

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const portrait = height >= width;
    const cols = portrait ? 2 : 4;
    const rows = Math.ceil(this.nodes.length / cols);

    const titleSize = Math.round(Math.min(30, Math.max(19, width * 0.072)));
    this.title.setFontSize(titleSize);
    this.title.setPosition(width / 2, Math.max(24, height * 0.055));

    this.subtitle.setFontSize(Math.round(Math.max(10, titleSize * 0.48)));
    this.subtitle.setPosition(width / 2, this.title.y + titleSize * 0.86);

    const top = this.subtitle.y + titleSize * 1.5 + 12;
    const bottom = height - Math.max(28, height * 0.06);
    const marginX = Math.max(26, width * 0.1);
    const usableW = Math.max(120, width - marginX * 2);
    const usableH = Math.max(120, bottom - top);

    const radius = Math.min(
      34,
      Math.max(16, Math.min(usableW / (cols * 2.6), usableH / (rows * 2.2)))
    );

    this.nodes.forEach((node, position) => {
      const row = Math.floor(position / cols);
      let col = position % cols;

      if (row % 2 === 1) col = cols - 1 - col;

      const x = cols > 1 ? marginX + (col * usableW) / (cols - 1) : width / 2;
      const y = rows > 1 ? top + (row * usableH) / (rows - 1) : (top + bottom) / 2;

      node.x = x;
      node.y = y;
      node.radius = radius;

      const open = isUnlocked(node.index, this.cleared);
      const done = this.cleared.includes(node.index);

      node.ring.setPosition(x, y).setRadius(radius);
      node.ring.setFillStyle(done ? 0x3a0a12 : open ? 0x22080d : 0x120608, 1);
      node.ring.setStrokeStyle(3, done ? 0xff2f45 : open ? 0xff7a8a : 0x30141a, 1);

      node.label
        .setPosition(x, y)
        .setFontSize(Math.round(radius * 0.95))
        .setColor(done ? '#ffb0b8' : open ? '#f4efe2' : '#6b5a5e')
        .setVisible(open);

      node.lock.setPosition(x, y).setScale((radius * 0.9) / 96).setVisible(!open);

      const best = this.records[node.index];
      if (done && best) {
        node.record
          .setText(`${formatTime(best.time)} · ${best.gems} gems`)
          .setFontSize(Math.max(8, Math.round(radius * 0.34)))
          .setPosition(x, y + radius + Math.max(9, radius * 0.34))
          .setVisible(true);
      } else {
        node.record.setVisible(false);
      }

      node.zone.setPosition(x, y).setSize(radius * 2.1, radius * 2.1);
    });

    this.drawScroll(width, height);
    this.drawPath();

    // The stall button in the corner, with the banked gems beside it.
    const padSize = Math.min(44, Math.max(28, width * 0.055));
    const padX = width - 16 - padSize;
    const padY = safeInsets().top + 18 + padSize;

    this.shopPad.setPosition(padX, padY).setScale((padSize * 2) / 128);
    this.shopIcon.setScale((padSize * 0.92) / 96).setPosition(padX, padY);

    const recordsX = 16 + padSize;
    this.recordsPad.setPosition(recordsX, padY).setScale((padSize * 2) / 128);
    this.recordsIcon.setScale((padSize * 0.92) / 96).setPosition(recordsX, padY);

    this.bankIcon.setScale(0.16).setPosition(padX - padSize - 50, padY);
    this.bankText.setFontSize(Math.max(11, Math.round(padSize * 0.34)));
    this.bankText.setPosition(padX - padSize - 40, padY);

    const portraitX = padX - padSize * 2 - 76;
    this.portraitPad
      .setVisible(this.kunoUnlocked)
      .setPosition(portraitX, padY)
      .setScale((padSize * 2) / 128);
    this.portrait
      .setVisible(this.kunoUnlocked)
      .setScale((padSize * 0.92) / 60)
      .setPosition(portraitX, padY + padSize * 0.42);
  }

  drawScroll(width, height) {
    this.backdrop.clear();

    this.backdrop.fillStyle(0x0a0306, 1);
    this.backdrop.fillRoundedRect(8, 8, width - 16, height - 16, 20);
    this.backdrop.lineStyle(3, 0xff2f45, 0.32);
    this.backdrop.strokeRoundedRect(8, 8, width - 16, height - 16, 20);

    // The rolled ends of the scroll.
    this.backdrop.fillStyle(0x160609, 1);
    this.backdrop.fillRoundedRect(2, 2, width - 4, 14, 7);
    this.backdrop.fillRoundedRect(2, height - 16, width - 4, 14, 7);
    this.backdrop.lineStyle(2, 0xff2f45, 0.22);
    this.backdrop.strokeRoundedRect(2, 2, width - 4, 14, 7);
    this.backdrop.strokeRoundedRect(2, height - 16, width - 4, 14, 7);
  }

  drawPath() {
    this.path.clear();

    for (let i = 0; i < this.nodes.length - 1; i += 1) {
      const from = this.nodes[i];
      const to = this.nodes[i + 1];
      const done = this.cleared.includes(i);

      this.path.lineStyle(4, done ? 0xff2f45 : 0x3a1018, done ? 0.85 : 0.7);
      this.path.lineBetween(from.x, from.y, to.x, to.y);
    }
  }
}
