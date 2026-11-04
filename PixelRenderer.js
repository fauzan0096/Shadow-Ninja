// Pixel art without any image files: a sprite is a small grid of palette
// characters, painted onto a canvas texture at run time.
//
//   const grid = createGrid(16, 20);       // '.' everywhere
//   fillRect(grid, 3, 8, 10, 7, 'a');      // a block of palette char 'a'
//   renderGrids(scene, [grid], PALETTE, 'hero', 3);
//
// Every grid cell becomes a scale x scale square of solid colour, so the art
// stays crisp however large the panel is.

export function createGrid(width, height) {
  const grid = [];
  for (let y = 0; y < height; y += 1) {
    grid.push(new Array(width).fill('.'));
  }
  return grid;
}

export function fillRect(grid, x, y, width, height, char) {
  for (let row = y; row < y + height; row += 1) {
    const line = grid[row];
    if (!line) continue;
    for (let col = x; col < x + width; col += 1) {
      if (col >= 0 && col < line.length) line[col] = char;
    }
  }
}

export function setPixel(grid, x, y, char) {
  fillRect(grid, x, y, 1, 1, char);
}

function paintGrid(ctx, grid, palette, originX, originY, scale) {
  for (let y = 0; y < grid.length; y += 1) {
    const line = grid[y];
    for (let x = 0; x < line.length; x += 1) {
      const color = palette[line[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(originX + x * scale, originY + y * scale, scale, scale);
    }
  }
}

function gridSize(grid) {
  return { width: grid[0].length, height: grid.length };
}

/// One grid becomes one texture.
export function renderGrid(scene, grid, palette, key, scale = 3) {
  if (scene.textures.exists(key)) return key;

  const { width, height } = gridSize(grid);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  paintGrid(ctx, grid, palette, 0, 0, scale);

  scene.textures.addCanvas(key, canvas);
  return key;
}

/// Several grids of the same size become a horizontal spritesheet, frames
/// numbered 0..n-1, ready for this.anims.create().
export function renderGrids(scene, grids, palette, key, scale = 3) {
  if (scene.textures.exists(key)) return key;

  const { width, height } = gridSize(grids[0]);
  const frameWidth = width * scale;
  const frameHeight = height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * grids.length;
  canvas.height = frameHeight;

  const ctx = canvas.getContext('2d');
  grids.forEach((grid, index) => {
    paintGrid(ctx, grid, palette, index * frameWidth, 0, scale);
  });

  scene.textures.addSpriteSheet(key, canvas, { frameWidth, frameHeight });
  return key;
}
