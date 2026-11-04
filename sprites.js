// The game's characters. The figures themselves are drawn in smooth.js with
// paths and gradients; this module owns the texture build and the animations
// that play them.

import { buildSmoothCharacters } from './smooth.js';

export function buildSpriteTextures(scene) {
  buildSmoothCharacters(scene);
}

export function createAnimations(scene) {
  if (!scene.anims.exists('ninja-idle')) {
    scene.anims.create({
      key: 'ninja-idle',
      frames: [{ key: 'ninja', frame: 0 }],
      frameRate: 1,
      repeat: -1
    });
  }

  if (!scene.anims.exists('ninja-run')) {
    scene.anims.create({
      key: 'ninja-run',
      frames: [{ key: 'ninja', frame: 1 }, { key: 'ninja', frame: 2 }],
      frameRate: 10,
      repeat: -1
    });
  }

  if (!scene.anims.exists('ninja-jump')) {
    scene.anims.create({
      key: 'ninja-jump',
      frames: [{ key: 'ninja', frame: 3 }],
      frameRate: 1,
      repeat: -1
    });
  }

  if (!scene.anims.exists('kunoichi-idle')) {
    scene.anims.create({
      key: 'kunoichi-idle',
      frames: [{ key: 'kunoichi', frame: 0 }],
      frameRate: 1,
      repeat: -1
    });
  }

  if (!scene.anims.exists('kunoichi-run')) {
    scene.anims.create({
      key: 'kunoichi-run',
      frames: [{ key: 'kunoichi', frame: 1 }, { key: 'kunoichi', frame: 2 }],
      frameRate: 10,
      repeat: -1
    });
  }

  if (!scene.anims.exists('kunoichi-jump')) {
    scene.anims.create({
      key: 'kunoichi-jump',
      frames: [{ key: 'kunoichi', frame: 3 }],
      frameRate: 1,
      repeat: -1
    });
  }

  if (!scene.anims.exists('guard-walk')) {
    scene.anims.create({
      key: 'guard-walk',
      frames: [{ key: 'guard', frame: 0 }, { key: 'guard', frame: 1 }],
      frameRate: 5,
      repeat: -1
    });
  }

  if (!scene.anims.exists('archer-walk')) {
    scene.anims.create({
      key: 'archer-walk',
      frames: [{ key: 'archer', frame: 0 }, { key: 'archer', frame: 1 }],
      frameRate: 4,
      repeat: -1
    });
  }

  if (!scene.anims.exists('warlord-walk')) {
    scene.anims.create({
      key: 'warlord-walk',
      frames: [{ key: 'warlord', frame: 0 }, { key: 'warlord', frame: 1 }],
      frameRate: 5,
      repeat: -1
    });
  }

  if (!scene.anims.exists('swordmaster-idle')) {
    scene.anims.create({
      key: 'swordmaster-idle',
      frames: [{ key: 'swordmaster', frame: 0 }],
      frameRate: 1,
      repeat: -1
    });
  }

  if (!scene.anims.exists('swordmaster-walk')) {
    scene.anims.create({
      key: 'swordmaster-walk',
      frames: [{ key: 'swordmaster', frame: 0 }, { key: 'swordmaster', frame: 1 }],
      frameRate: 6,
      repeat: -1
    });
  }
}
