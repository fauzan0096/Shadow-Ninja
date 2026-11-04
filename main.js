// Entry point: the Phaser game configuration and nothing else. Gameplay lives
// in scenes under src/scenes/.

import { TitleScene } from './TitleScene.js';
import { LevelSelectScene } from './LevelSelectScene.js';
import { ShopScene } from './ShopScene.js';
import { RecordsScene } from './RecordsScene.js';
import { SettingsScene } from './SettingsScene.js';
import { GameScene } from './GameScene.js';
import { HudScene } from './HudScene.js';
import { watchOrientation } from './orientation.js';

// On window so the running game can be inspected from outside the module graph.
window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',

  // The game owns its palette (a palace at night), so it does not follow the
  // system's light and dark mode.
  backgroundColor: '#080a12',

  scale: {
    // The canvas is sized by hand to the panel itself: ui/orientation.js follows
    // the phone, so the game is upright when the phone is held in portrait and
    // widens when it is turned, with the same screen on both sides.
    mode: Phaser.Scale.NONE,
    width: 800,
    height: 400
  },

  // Arcade physics is set up but idle: gravity is zero until a scene asks for
  // it, so a game that does not need physics pays nothing for it being here.
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  input: {
    // Phaser tracks one pointer by default, which silently breaks on-screen
    // controls: holding a direction pad and tapping jump is two fingers down
    // at once, and the second tap would never register.
    activePointers: 3
  },

  // The title screen starts the game; it opens the scroll map or a roof, and
  // the play scene launches the HUD over itself.
  scene: [TitleScene, LevelSelectScene, ShopScene, RecordsScene, SettingsScene, GameScene, HudScene]
});

watchOrientation(window.game);
