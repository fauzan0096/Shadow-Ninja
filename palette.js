// One palette for every sprite in the game, so the ninja and the palace guards
// look like they belong in the same world. Keys are the characters used in the
// pixel grids; '.' is never listed and therefore always transparent.

export const SPRITE_PALETTE = {
  a: '#0b0912', // outline, the darkest ink
  b: '#241d38', // dark cloth
  c: '#352a52', // cloth highlight
  d: '#4d3f70', // cloth light / mask band
  e: '#171223', // deep shadow
  f: '#6b4a24', // leather
  g: '#e8b34c', // gold trim
  h: '#8a6230', // bronze armour
  i: '#d9a24a', // bronze highlight
  r: '#c9374f', // scarf red
  R: '#8f1f36', // scarf red, shadowed
  s: '#c6cfe0', // steel
  w: '#f4efe2' // eyes, cloth white
};
