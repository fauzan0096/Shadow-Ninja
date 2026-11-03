// The layer above the game: the reserved control band, the touch pads, the
// lives counter and the panels shown when the level is cleared or the last life
// is lost.
//
// It runs as its own scene over GameScene so its camera covers the whole screen
// while the game camera keeps to the playfield above the band.

import { registerIcons } from '../icons.js';
import { TouchControls } from '../ui/TouchControls.js';
import { computeLayout } from '../ui/layout.js';
import { sound } from '../audio/sound.js';
import { formatTime } from '../core/format.js';
import { weatherIntensity } from '../art/weather.js';

const FONT = '-apple-system, system-ui, sans-serif';

export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    registerIcons(this, [
      'chevron-left',
      'chevron-right',
      'chevron-up',
      'rotate-ccw',
      'heart',
      'sword',
      'swords',
      'zap',
      'crosshair',
      'chevrons-right',
      'fast-forward',
      'move-right',
      'wind',
      'map',
      'shield',
      'gem',
      'clock',
      'star',
      'volume-2',
      'volume-x'
    ]);

    this.controls = new TouchControls(this);

    if (this.registry.get('canBlock') === false) {
      this.controls.setDirectionEnabled('block', false);
    }

    this.band = this.add.graphics().setDepth(5);

    // A soft darkening at the edges, so the playfield reads as lit from within.
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0, 0).setDepth(4).setAlpha(0.9);

    // Weather in the air over the playfield.
    this.weatherKind = this.registry.get('weather') ?? 'wind';
    this.weatherParticles = [];
    this.weatherWidth = 1;
    this.weatherHeight = 1;

    this.maxLives = this.registry.get('maxLives') ?? 3;

    this.lifeIcons = [];
    for (let i = 0; i < 6; i += 1) {
      this.lifeIcons.push(
        this.add.image(0, 0, 'icon-heart').setDepth(30).setTint(0xff5f78)
      );
    }

    // The name of the roof, shown as the level opens and then fading away.
    this.levelText = this.add
      .text(0, 0, this.registry.get('levelName') ?? '', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#f4efe2'
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setAlpha(0);

    if (this.levelText.text) {
      this.tweens.add({
        targets: this.levelText,
        alpha: 1,
        duration: 400,
        hold: 1600,
        yoyo: true
      });
    }

    // The run's gems and clock, under the lives.
    this.gemIcon = this.add.image(0, 0, 'icon-gem').setDepth(30).setTint(0x8fe8ff);
    this.gemText = this.add
      .text(0, 0, '0/0', { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#e9e4f2' })
      .setOrigin(0, 0.5)
      .setDepth(30);

    this.timerIcon = this.add.image(0, 0, 'icon-clock').setDepth(30).setTint(0xf4efe2);
    this.timerText = this.add
      .text(0, 0, '0:00', { fontFamily: FONT, fontSize: '13px', color: '#e9e4f2' })
      .setOrigin(0, 0.5)
      .setDepth(30);

    this.shownGems = -1;
    this.shownTime = '';
    this.runSummary = null;

    // The warlord's health bar, drawn only when he is in the hall.
    this.bossBar = this.add.graphics().setDepth(40);
    this.bossName = this.add
      .text(0, 0, 'THE WARLORD', {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd98a'
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setVisible(false);
    this.bossShown = false;

    // How many shuriken are left in hand, beside their pad.
    this.shurikenText = this.add
      .text(0, 0, '3', {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffe6a8'
      })
      .setOrigin(0.5)
      .setDepth(32);
    this.shownShurikens = -1;

    this.restartPad = this.add.image(0, 0, 'pad').setDepth(70).setAlpha(0.7);
    this.restartPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.restartIcon = this.add.image(0, 0, 'icon-rotate-ccw').setDepth(71).setTint(0xf4efe2);
    this.restartPad.on('pointerdown', () => this.restartLevel());

    // Mute, next to restart: the setting is remembered between sessions.
    this.mutePad = this.add.image(0, 0, 'pad').setDepth(70).setAlpha(0.7);
    this.mutePad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.muteIcon = this.add.image(0, 0, 'icon-volume-2').setDepth(71).setTint(0xf4efe2);
    this.mutePad.on('pointerdown', () => this.toggleMute());

    this.buildOverlay();
    this.applyMuteIcon(sound.isMuted());

    this.registry.events.on('changedata-lives', this.onLives, this);
    this.registry.events.on('changedata-state', this.onState, this);
    this.registry.events.on('changedata-runSummary', this.onRunSummary, this);
    this.scale.on('resize', this.layout, this);

    this.events.once('shutdown', () => {
      this.registry.events.off('changedata-lives', this.onLives, this);
      this.registry.events.off('changedata-state', this.onState, this);
      this.registry.events.off('changedata-runSummary', this.onRunSummary, this);
      this.scale.off('resize', this.layout, this);
      this.controls.destroy();
    });

    this.onLives(null, this.registry.get('lives') ?? 3);
    this.buildWeather();
    this.layout(this.scale.gameSize);
  }

  buildWeather() {
    const kind = this.weatherKind;
    this.weatherParticles = [];
    if (!kind || kind === 'none') return;

    const count = kind === 'rain' ? 46 : kind === 'snow' ? 40 : 14;

    for (let i = 0; i < count; i += 1) {
      let sprite;

      if (kind === 'rain') {
        sprite = this.add.image(0, 0, 'raindrop').setDepth(3).setTint(0xffc2c8).setScale(1);
      } else if (kind === 'snow') {
        sprite = this.add.image(0, 0, 'glow').setDepth(3).setTint(0xffe6ee).setScale(0.05);
      } else {
        sprite = this.add.image(0, 0, 'leaf').setDepth(3).setTint(0xff6a4a).setScale(0.8);
      }

      this.weatherParticles.push({
        sprite,
        speed:
          kind === 'rain'
            ? 900 + Math.random() * 520
            : kind === 'snow'
              ? 40 + Math.random() * 50
              : 40 + Math.random() * 60,
        drift: kind === 'rain' ? -(160 + Math.random() * 120) : 0,
        sway: Math.random() * Math.PI * 2,
        x: Math.random(),
        y: Math.random()
      });
    }
  }

  updateWeather(time, delta) {
    if (!this.weatherParticles.length) return;

    const kind = this.weatherKind;
    const dt = Math.min(0.05, delta / 1000);
    const width = Math.max(1, this.weatherWidth);
    const height = Math.max(1, this.weatherHeight);
    const strength = weatherIntensity(kind, time);

    for (const particle of this.weatherParticles) {
      if (kind === 'rain') {
        particle.y += (particle.speed * dt) / height;
        particle.x += (particle.drift * dt) / width;
      } else if (kind === 'snow') {
        particle.y += (particle.speed * dt) / height;
        particle.x += Math.sin(time * 0.0012 + particle.sway) * 0.00025;
      } else {
        particle.x += (particle.speed * dt) / width;
        particle.y += Math.sin(time * 0.0018 + particle.sway) * 0.0004;
      }

      if (particle.y > 1.05) {
        particle.y = -0.05;
        particle.x = Math.random();
      }
      if (particle.x < -0.05) particle.x = 1.04;
      if (particle.x > 1.05) {
        particle.x = -0.05;
        particle.y = Math.random();
      }

      particle.sprite.setPosition(particle.x * width, particle.y * height);
      particle.sprite.setAlpha(0.15 + 0.6 * strength);
    }
  }

  buildOverlay() {
    this.scrim = this.add
      .rectangle(0, 0, 4000, 4000, 0x05060e, 0.74)
      .setOrigin(0, 0)
      .setDepth(60);

    this.panel = this.add.graphics().setDepth(61);

    this.titleText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#f4efe2' })
      .setOrigin(0.5)
      .setDepth(62);

    this.hintText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#b9a8c9' })
      .setOrigin(0.5)
      .setAlign('center')
      .setDepth(62);

    this.againPad = this.add.image(0, 0, 'pad').setDepth(62);
    this.againPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.againIcon = this.add.image(0, 0, 'icon-rotate-ccw').setDepth(63).setTint(0xf4efe2);
    this.againPad.on('pointerdown', () => this.restartLevel());

    this.mapPad = this.add.image(0, 0, 'pad').setDepth(62);
    this.mapPad.setInteractive(new Phaser.Geom.Circle(64, 64, 64), Phaser.Geom.Circle.Contains);
    this.mapIcon = this.add.image(0, 0, 'icon-map').setDepth(63).setTint(0xf4efe2);
    this.mapPad.on('pointerdown', () => this.goToMap());

    this.overlayParts = [
      this.scrim,
      this.panel,
      this.titleText,
      this.hintText,
      this.againPad,
      this.againIcon,
      this.mapPad,
      this.mapIcon
    ];

    this.overlayVisible = false;
    this.setOverlayVisible(false);
  }

  setOverlayVisible(visible) {
    this.overlayVisible = visible;

    for (const part of this.overlayParts) part.setVisible(visible);

    if (this.againPad.input) this.againPad.input.enabled = visible;
    if (this.mapPad.input) this.mapPad.input.enabled = visible;
    this.controls.setEnabled(!visible);
  }

  /// Reads the run's gems, clock and deaths from the level scene each frame.
  update(time, delta) {
    this.updateWeather(time || 0, delta || 16);

    const game = this.scene.get('Game');
    if (!game || !game.getRunStats) return;

    const stats = game.getRunStats();

    if (stats.gems !== this.shownGems || stats.total !== this.shownTotal) {
      this.shownGems = stats.gems;
      this.shownTotal = stats.total;
      this.gemText.setText(`${stats.gems}/${stats.total}`);
    }

    const timeText = formatTime(stats.seconds);
    if (timeText !== this.shownTime) {
      this.shownTime = timeText;
      this.timerText.setText(timeText);
    }

    const boss = game.getBossInfo ? game.getBossInfo() : null;
    this.drawBossBar(boss);

    if (stats.shurikens !== this.shownShurikens) {
      this.shownShurikens = stats.shurikens;
      this.shurikenText.setText(String(stats.shurikens));
      this.shurikenText.setAlpha(stats.shurikens > 0 ? 1 : 0.4);
    }
  }

  drawBossBar(info) {
    this.bossBar.clear();

    if (!info) {
      if (this.bossShown) this.bossName.setVisible(false);
      this.bossShown = false;
      return;
    }

    this.bossShown = true;

    const x = this.bossBarX;
    const y = this.bossBarY;
    const w = this.bossBarW;
    const h = this.bossBarH;

    this.bossBar.fillStyle(0x0b0812, 0.85);
    this.bossBar.fillRoundedRect(x, y, w, h, 6);

    const ratio = Math.max(0, Math.min(1, info.health / info.max));

    if (ratio > 0) {
      const filled = Math.max(4, (w - 4) * ratio);
      this.bossBar.fillStyle(0xc9374f, 1);
      this.bossBar.fillRoundedRect(x + 2, y + 2, filled, h - 4, 4);
      this.bossBar.fillStyle(0xff8a7a, 0.5);
      this.bossBar.fillRoundedRect(x + 2, y + 2, filled, 3, 2);
    }

    this.bossBar.lineStyle(2, 0xe8b34c, 0.8);
    this.bossBar.strokeRoundedRect(x, y, w, h, 6);

    this.bossName.setVisible(true).setText(info.name);
  }

  onRunSummary(_parent, value) {
    this.runSummary = value;
  }

  onLives(_parent, value) {
    const lives = typeof value === 'number' ? value : 3;
    this.lifeIcons.forEach((icon, index) => {
      icon.setVisible(index < this.maxLives);
      const alive = index < lives;
      icon.setAlpha(alive ? 1 : 0.2);
      icon.setTint(alive ? 0xff5f78 : 0x6b6f7a);
    });
  }

  onState(_parent, value) {
    if (value === 'gameover') {
      this.showOverlay('Out of lives', 'The shadows claim this roof.');
    } else if (value === 'complete') {
      const summary = this.runSummary;
      let hint = 'The gate stands open behind you.';

      if (summary) {
        hint =
          `Gems ${summary.gems}/${summary.total}  ·  ` +
          `Time ${formatTime(summary.seconds)}  ·  Deaths ${summary.deaths}`;

        if (summary.newTime) hint += '\nNew best time';
        if (summary.newGems) hint += summary.newTime ? '  ·  New gem record' : '\nNew gem record';
      }

      this.showOverlay('Level cleared', hint);
    } else if (value === 'victory') {
      let message = 'The palace is yours.';

      if (this.runSummary) {
        message =
          `Gems ${this.runSummary.gems}/${this.runSummary.total}  ·  ` +
          `Time ${formatTime(this.runSummary.seconds)}  ·  ` +
          `Deaths ${this.runSummary.deaths}\n` +
          'Every hall and rooftop is yours.';
      }

      message += '\nA kunoichi waits on the map — tap her to run.';

      this.showOverlay('Victory', message);
    } else {
      this.setOverlayVisible(false);
    }
  }

  showOverlay(title, hint) {
    this.titleText.setText(title);
    this.hintText.setText(hint);
    this.setOverlayVisible(true);
    this.layout(this.scale.gameSize);
  }

  restartLevel() {
    this.setOverlayVisible(false);

    const game = this.scene.get('Game');
    if (game && game.restartLevel) game.restartLevel();
  }

  goToMap() {
    const game = this.scene.get('Game');
    if (game && game.goToMap) game.goToMap();
  }

  toggleMute() {
    this.applyMuteIcon(sound.toggleMuted());
  }

  applyMuteIcon(muted) {
    this.muteIcon.setTexture(muted ? 'icon-volume-x' : 'icon-volume-2');
    this.muteIcon.setAlpha(muted ? 0.4 : 1);
    this.mutePad.setAlpha(muted ? 0.45 : 0.7);
  }

  layout(gameSize) {
    const { width, height } = gameSize;
    if (!width || !height) return;

    const geometry = computeLayout(width, height);
    this.controls.layout(gameSize);

    // The reserved band, drawn as a stone ledge with a lit edge so it reads as
    // part of the palace rather than a browser widget.
    const bandTop = height - geometry.band;
    this.vignette.setDisplaySize(width, geometry.playHeight);
    this.weatherWidth = width;
    this.weatherHeight = geometry.playHeight;

    this.band.clear();
    this.band.fillStyle(0x0a0306, 0.97);
    this.band.fillRect(0, bandTop, width, geometry.band);
    this.band.fillStyle(0x1a0609, 1);
    this.band.fillRect(0, bandTop, width, 4);
    this.band.fillStyle(0xff2f45, 0.5);
    this.band.fillRect(0, bandTop + 1, width, 1);

    // Lives, top left of the playfield.
    const lifeSize = Math.min(26, Math.max(17, width * 0.062));
    this.lifeIcons.forEach((icon, index) => {
      icon.setScale(lifeSize / 96);
      icon.setPosition(18 + lifeSize / 2 + index * (lifeSize + 7), 20 + lifeSize / 2);
    });

    // Gems and clock, under the row of lives.
    const statY = 20 + lifeSize + 18;    const statSize = Math.max(11, Math.round(lifeSize * 0.62));
    this.gemIcon.setScale((statSize * 1.25) / 96).setPosition(22, statY);
    this.gemText.setFontSize(statSize).setPosition(34, statY);
    this.timerIcon.setScale(statSize / 96).setPosition(118, statY);
    this.timerText.setFontSize(statSize).setPosition(130, statY);

    // The warlord's bar sits low in the playfield, above the control band.
    const barW = Math.min(width - 60, 420);
    this.bossBarX = (width - barW) / 2;
    this.bossBarY = geometry.playHeight - 46;
    this.bossBarW = barW;
    this.bossBarH = 12;
    this.bossName.setFontSize(Math.round(Math.min(14, width * 0.034)));
    this.bossName.setPosition(width / 2, this.bossBarY - 14);

    // The shuriken count sits on the corner of its pad.
    const shurikenPad = this.controls.buttons.shuriken.pad;
    const padSize = shurikenPad.displayWidth;
    this.shurikenText.setFontSize(Math.round(padSize * 0.34));
    this.shurikenText.setPosition(shurikenPad.x + padSize * 0.34, shurikenPad.y - padSize * 0.34);

    // Restart, top right of the playfield: one tap away at any moment.
    const restartR = Math.min(24, Math.max(17, width * 0.055));
    const restartX = width - 18 - restartR;
    const restartY = 20 + restartR;
    this.restartPad.setPosition(restartX, restartY).setScale((restartR * 2) / 128);
    this.restartIcon.setScale((restartR * 1.1) / 96).setPosition(restartX, restartY);

    const muteX = restartX - restartR * 2 - 14;
    this.mutePad.setPosition(muteX, restartY).setScale((restartR * 2) / 128);
    this.muteIcon.setScale((restartR * 1.1) / 96).setPosition(muteX, restartY);

    // The end-of-level panel, centred in the playfield.
    const panelW = Math.min(width - 48, 380);
    const panelH = Math.min(geometry.playHeight * 0.72, 260);
    const panelX = (width - panelW) / 2;
    const panelY = (geometry.playHeight - panelH) / 2;

    this.scrim.setPosition(0, 0);

    this.panel.clear();
    this.panel.fillStyle(0x12060a, 0.98);
    this.panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    this.panel.lineStyle(2, 0xff2f45, 0.55);
    this.panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);

    this.titleText.setFontSize(Math.round(Math.min(26, width * 0.068)));
    this.titleText.setPosition(width / 2, panelY + panelH * 0.3);
    this.hintText.setPosition(width / 2, panelY + panelH * 0.48);

    const buttonR = Math.min(34, panelW * 0.12);
    const buttonY = panelY + panelH * 0.76;
    const buttonGap = buttonR * 1.4;

    this.againPad.setPosition(width / 2 - buttonGap, buttonY).setScale((buttonR * 2) / 128);
    this.againIcon.setScale((buttonR * 1.15) / 96).setPosition(width / 2 - buttonGap, buttonY);

    this.mapPad.setPosition(width / 2 + buttonGap, buttonY).setScale((buttonR * 2) / 128);
    this.mapIcon.setScale((buttonR * 1.15) / 96).setPosition(width / 2 + buttonGap, buttonY);

    this.levelText.setFontSize(Math.round(Math.min(17, width * 0.042)));
    this.levelText.setPosition(width / 2, 20 + restartR * 2 + 26);
  }
}
