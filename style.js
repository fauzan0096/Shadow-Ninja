// One palette and one set of drawing helpers for every screen outside the
// playfield, so the title, the scroll map, the stall and the records board all
// read as part of the same palace.
//
// The palace is near-black plum, ember red and aged gold on bone-white paper,
// with a single cool jade kept for gems and other good finds — one cool note
// against all the warmth is what makes the gold read as gold instead of as mud.
//
// Everything drawn here is lit from above and cast in shadow below, so the
// menus read as carved stone standing in a room rather than flat cards.

export const COLORS = {
  ink: 0x08040a,
  inkDeep: 0x0d0508,
  panel: 0x1c0a10,
  panelDark: 0x140609,
  panelFace: 0x2b1018,
  panelBase: 0x0d0407,
  ember: 0xff3348,
  emberDim: 0x8f1f2c,
  emberSoft: 0xd9535f,
  gold: 0xf0b45a,
  goldLight: 0xffd98a,
  jade: 0x8fe6c6,
  jadeDeep: 0x2c7d68,
  paper: 0xf7ecdd,
  muted: 0xcdb6b6
};

export const TEXT = {
  paper: '#f7ecdd',
  paperDim: '#e7dcd0',
  muted: '#cdb6b6',
  dim: '#a98f95',
  gold: '#f0b45a',
  goldLight: '#ffd98a',
  jade: '#8fe6c6',
  ember: '#ff8b98'
};

/// The night the menus stand in: black at the top, the palace's red low down.
export function drawScreenBackdrop(g, width, height) {
  g.clear();
  g.fillGradientStyle(COLORS.ink, COLORS.ink, 0x26090f, 0x120407, 1);
  g.fillRect(0, 0, width, height);

  // A warm floor bounce low on the screen, which is what gives the menus depth
  // instead of leaving them floating on a flat sheet of colour.
  g.fillStyle(0xff6a4a, 0.05);
  g.fillRect(0, height * 0.66, width, height * 0.34);
}

/// A dark stone button with a gold hairline and a lit top edge. `primary` marks
/// the one the player most likely wants, so it alone carries the full gold trim.
export function drawStoneButton(g, x, y, w, h, options = {}) {
  const primary = Boolean(options.primary);
  const radius = Math.min(14, h * 0.3);

  const left = x - w / 2;
  const top = y - h / 2;
  const depth = Math.max(3, h * 0.09);

  // The cast shadow under the stone.
  g.fillStyle(0x000000, 0.45);
  g.fillRoundedRect(left + 2, top + depth + 2, w, h, radius);

  // The block itself, with a darker base under it so the face is raised.
  g.fillStyle(COLORS.panelBase, 1);
  g.fillRoundedRect(left, top + depth * 0.6, w, h, radius);
  g.fillStyle(primary ? COLORS.panelFace : COLORS.panel, primary ? 0.99 : 0.96);
  g.fillRoundedRect(left, top, w, h - depth * 0.4, radius);

  // A lighter crown and a shaded foot: the bevel that reads as thickness.
  g.fillStyle(0xffffff, primary ? 0.08 : 0.05);
  g.fillRoundedRect(left + 3, top + 3, w - 6, (h - depth) * 0.44, Math.max(4, radius - 3));
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(left + 3, top + (h - depth) * 0.62, w - 6, (h - depth) * 0.3, Math.max(4, radius - 3));

  g.lineStyle(primary ? 2 : 1.5, primary ? COLORS.gold : COLORS.emberDim, primary ? 0.95 : 0.72);
  g.strokeRoundedRect(left, top, w, h - depth * 0.4, radius);

  // A warm line along the top edge and a soft ember wash under it.
  g.fillStyle(COLORS.gold, primary ? 0.6 : 0.3);
  g.fillRect(left + w * 0.09, top + 2, w * 0.82, 1.5);
  g.fillStyle(COLORS.ember, primary ? 0.13 : 0.07);
  g.fillRoundedRect(left + 6, top + 5, w - 12, Math.max(3, (h - depth) * 0.2), radius * 0.5);
}

/// A dark panel with the same hairline, for cards, boards and dialogs.
export function drawStonePanel(g, x, y, w, h, options = {}) {
  const radius = options.radius !== undefined ? options.radius : 14;
  const fill = options.fill !== undefined ? options.fill : COLORS.panelDark;
  const alpha = options.alpha !== undefined ? options.alpha : 0.96;
  const line = options.line !== undefined ? options.line : COLORS.emberDim;
  const lineAlpha = options.lineAlpha !== undefined ? options.lineAlpha : 0.55;
  const depth = options.depth !== undefined ? options.depth : Math.min(6, h * 0.05);

  // A shadow under the card, then the face sitting proud of its dark base.
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x + 2, y + depth + 2, w, h, radius);
  g.fillStyle(COLORS.panelBase, 0.95);
  g.fillRoundedRect(x, y + depth * 0.5, w, h, radius);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h - depth * 0.35, radius);

  // Top highlight and bottom shade, so the panel has a lit face and a dark foot.
  g.fillStyle(0xffffff, 0.045);
  g.fillRoundedRect(x + 3, y + 3, w - 6, (h - depth) * 0.4, Math.max(4, radius - 3));

  g.lineStyle(options.lineWidth !== undefined ? options.lineWidth : 2, line, lineAlpha);
  g.strokeRoundedRect(x, y, w, h - depth * 0.35, radius);
}
