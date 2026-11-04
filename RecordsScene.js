// The records board: every roof's best run in one place.
//
// A tall dark wooden board with a red trim and a gold crown, one line per roof
// carrying its number, its name, the best time, the gems collected and the
// deaths it took. The quickest roof of all is written in gold. The banked gems
// sit in the top right corner and the scroll map is one tap away in the top
// left.

import { registerIcons } from './icons.js';
import { LEVELS } from './levels.js';
import { loadProgress } from './progress.js';
import { formatTime } from './format.js';
import { sound } from './sound.js';
import { watchPress, inCircle } from './press.js';
import { safeInsets } from './layout.js';

const FONT = '-apple-system, system-ui, sans-serif';

// Where each column starts across the board's inner width: number, roof name,
// time, gems, deaths.
const COLUMNS = [0, 0.085, 0.62, 0.77, 0.9];

export class RecordsScene extends Phaser.Scene {
  constructor() {
    super('Records');
  }

  create() {
    if (this.scene.isActive('Game')) this.scene.stop('Game');
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');

    registerIcons(this, ['gem', 'map']);

    const progress = loadProgress();
    this.records = progress.records || {};
    this.bank = progress.gems;

    // The roof with the quickest clear is the one the board marks in gold.
    this.fastest = -1;
    let quickest = Infinity;

    LEVELS.forEach((level, index) => {
      const record = this.records[index];
      if (record && typeof record.time === 'number' && record.time < quickest) {
        quickest = record.time;
        this.fastest = index;
      }
    });

    this.backdrop = this.add.graphics().setDepth(0);
    this.board = this.add.graphics().setDepth(1);
    this.crown = this.add.graphics().setDepth(2);

    this.title = this.add
      .text(0, 0, 'RECORDS', {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd98a'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.headers = ['#', 'ROOF', 'TIME', 'GEMS', 'DEATHS'].map((label) =>
      this.add
        .text(0, 0, label, {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#a98f95'
        })
        .setOrigin(0, 0.5)
        .setDepth(3)
    );

    this.rows = LEVELS.map((level, index) => this.createRow(level, index));

    // The banked gems, top right of the screen.
    this.bankIcon = this.add.image(0, 0, 'icon-gem').setDepth(4).setTint(0xffffff);
    this.bankText = this.add
      .text(0, 0, String(this.bank), {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f7ecdd'
      })
      .setOrigin(1, 0.5)
      .setDepth(4);

    // Back to the scroll map, top left.
    this.mapPad = this.add.image(0, 0, 'pad').setDepth(4).setAlpha(0.8);
    this.mapPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.mapIcon = this.add.image(0, 0, 'icon-map').setDepth(5).setTint(0xf4efe2);
    this.mapPad.on('pointerdown', () => this.backToMap());

    watchPress(this, (x, y) => {
      if (this.mapPad && inCircle(x, y, this.mapPad.x, this.mapPad.y, 30)) this.backToMap();
    });

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
    });

    this.layout();
    sound.playMusic('palace');
  }

  update() {
    sound.update();
  }

  createRow(level, index) {
    const record = this.records[index] || null;
    const fastest = index === this.fastest;
    const color = fastest ? '#ffd98a' : record ? '#f7ecdd' : '#8c7378';

    const cell = (value) =>
      this.add
        .text(0, 0, value, { fontFamily: FONT, fontSize: '11px', color })
        .setOrigin(0, 0.5)
        .setDepth(3);

    const deaths = record && typeof record.deaths === 'number' ? String(record.deaths) : '—';

    return {
      index,
      fastest,
      band: this.add
        .rectangle(0, 0, 1, 1, 0xffffff, 0)
        .setOrigin(0, 0.5)
        .setDepth(2),
      number: cell(String(index + 1)),
      name: cell(level.name),
      time: cell(record ? formatTime(record.time) : '—'),
      gems: cell(record ? String(record.gems) : '—'),
      deaths: cell(deaths)
    };
  }

  layout() {
    const { width, height } = this.scale.gameSize;
    if (!width || !height) return;

    this.drawBackdrop(width, height);

    const margin = Math.max(10, Math.min(width, height) * 0.035);
    const insets = safeInsets();

    // Top corner controls: the way back to the map on the left, the gems on the
    // right. Both sit below the notch.
    const padSize = Math.max(17, Math.min(30, height * 0.075));
    const padX = margin + padSize;
    const padY = insets.top + margin + padSize;

    this.mapPad.setPosition(padX, padY).setScale((padSize * 2) / 128);
    this.mapIcon.setScale((padSize * 1.05) / 96).setPosition(padX, padY);

    const gemSize = Math.max(12, Math.round(height * 0.04));
    this.bankText.setFontSize(gemSize).setPosition(width - margin, padY);
    this.bankIcon
      .setScale((gemSize * 1.4) / 96)
      .setPosition(width - margin - this.bankText.width - gemSize * 0.85, padY);

    // The board stands on the middle of the screen, as tall as it may be.
    const topY = padY + padSize + margin * 0.8;
    const boardH = Math.max(150, height - topY - margin);
    const boardW = Math.min(width - margin * 2, Math.max(300, boardH * 1.75));
    const boardX = (width - boardW) / 2;
    const boardY = topY;

    this.drawBoard(boardX, boardY, boardW, boardH, width);

    const titleSize = Math.round(Math.max(12, Math.min(20, boardH * 0.065)));
    const titleY = boardY + Math.max(12, titleSize * 1.2);
    this.title.setFontSize(titleSize).setPosition(width / 2, titleY);

    const innerPad = Math.max(12, boardW * 0.03);
    const innerX = boardX + innerPad;
    const innerW = boardW - innerPad * 2;

    const headerY = titleY + titleSize * 1.05;
    const headerSize = Math.max(8, Math.round(Math.min(11, boardH * 0.032)));

    this.headers.forEach((header, column) => {
      header
        .setFontSize(headerSize)
        .setPosition(innerX + innerW * COLUMNS[column], headerY);
    });

    const rowsTop = headerY + headerSize * 0.95;
    const rowsBottom = boardY + boardH - Math.max(10, boardH * 0.05);
    const rowH = Math.max(11, (rowsBottom - rowsTop) / LEVELS.length);
    const font = Math.max(9, Math.round(Math.min(13, rowH * 0.66)));

    this.rows.forEach((row, index) => {
      const y = rowsTop + rowH * (index + 0.5);

      row.band
        .setPosition(innerX, y)
        .setDisplaySize(innerW, Math.max(10, rowH - 1.5))
        .setFillStyle(
          row.fastest ? 0xd69324 : 0xffffff,
          row.fastest ? 0.16 : index % 2 === 0 ? 0.015 : 0.05
        );

      row.number.setFontSize(font).setPosition(innerX + innerW * COLUMNS[0], y);
      row.name.setFontSize(font).setPosition(innerX + innerW * COLUMNS[1], y);
      row.time.setFontSize(font).setPosition(innerX + innerW * COLUMNS[2], y);
      row.gems.setFontSize(font).setPosition(innerX + innerW * COLUMNS[3], y);
      row.deaths.setFontSize(font).setPosition(innerX + innerW * COLUMNS[4], y);
    });
  }

  drawBackdrop(width, height) {
    this.backdrop.clear();
    this.backdrop.fillGradientStyle(0x06040a, 0x06040a, 0x1a0a10, 0x0c0508, 1);
    this.backdrop.fillRect(0, 0, width, height);
  }

  /// The wooden board, its red trim and the gold crown standing on its top edge.
  drawBoard(boardX, boardY, boardW, boardH, width) {
    this.board.clear();

    this.board.fillStyle(0x000000, 0.4);
    this.board.fillRoundedRect(boardX + 3, boardY + 5, boardW, boardH, 10);

    // Dark wood, with the grain of its planks showing through.
    this.board.fillStyle(0x2a120c, 1);
    this.board.fillRoundedRect(boardX, boardY, boardW, boardH, 10);
    this.board.fillStyle(0x1b0a07, 0.5);
    for (let plank = 1; plank < 14; plank += 1) {
      const x = boardX + (boardW * plank) / 14;
      this.board.fillRect(x, boardY + 6, 1, boardH - 12);
    }

    // A red trim around the wood, with a thin gold line inside it.
    this.board.lineStyle(4, 0xff2f45, 0.72);
    this.board.strokeRoundedRect(boardX + 2, boardY + 2, boardW - 4, boardH - 4, 9);
    this.board.lineStyle(1, 0xffd98a, 0.16);
    this.board.strokeRoundedRect(boardX + 8, boardY + 8, boardW - 16, boardH - 16, 7);

    // The gold crown, standing proud of the top edge.
    const crownW = Math.min(48, boardW * 0.12);
    const crownH = Math.max(14, Math.min(26, boardH * 0.085));
    const cx = width / 2;
    const baseY = boardY + 2;

    this.crown.clear();
    this.crown.fillStyle(0xd69324, 1);
    this.crown.fillRoundedRect(cx - crownW / 2, baseY, crownW, crownH * 0.34, 3);
    this.crown.fillTriangle(
      cx - crownW / 2,
      baseY + crownH * 0.16,
      cx - crownW / 2,
      baseY - crownH * 0.72,
      cx - crownW * 0.16,
      baseY + crownH * 0.12
    );
    this.crown.fillTriangle(
      cx - crownW * 0.26,
      baseY + crownH * 0.16,
      cx,
      baseY - crownH,
      cx + crownW * 0.26,
      baseY + crownH * 0.16
    );
    this.crown.fillTriangle(
      cx + crownW / 2,
      baseY + crownH * 0.16,
      cx + crownW / 2,
      baseY - crownH * 0.72,
      cx + crownW * 0.22,
      baseY + crownH * 0.16
    );
    this.crown.fillStyle(0xffe6a8, 0.9);
    this.crown.fillCircle(cx, baseY - crownH * 0.5, Math.max(1.5, crownW * 0.05));
    this.crown.fillCircle(cx - crownW * 0.36, baseY + crownH * 0.02, Math.max(1.2, crownW * 0.035));
    this.crown.fillCircle(cx + crownW * 0.36, baseY + crownH * 0.02, Math.max(1.2, crownW * 0.035));
  }

  backToMap() {
    const now = Date.now();
    if (now - (this.lastTapAt || 0) < 320) return;
    this.lastTapAt = now;

    sound.play('jump');
    this.scene.start('LevelSelect');
  }
}
