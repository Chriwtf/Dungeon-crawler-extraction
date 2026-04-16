import type { Item, ItemKind } from '../items/inventory';
import type { MonsterKind } from '../combat/monsters';

export const PLAYER_GLYPH = '@';

export const PLAYER_ASCII_ART = [
  '  /@\\\\  ',
  ' <[::]> ',
  '  /  \\\\  ',
].join('\n');

const MONSTER_ASCII_ART: Record<MonsterKind, string> = {
  rat: [
    '  __     ',
    " (r_'--< ",
    '  ^^     ',
  ].join('\n'),
  sentry: [
    '  /##\\\\  ',
    ' <|MM|> ',
    '  /  \\\\  ',
  ].join('\n'),
};

const ITEM_ASCII_ART: Record<ItemKind, string> = {
  medkit: [
    ' .----. ',
    ' | ++ | ',
    " '----' ",
  ].join('\n'),
  'stim-pack': [
    '  __    ',
    ' [++]>  ',
    '  ||    ',
  ].join('\n'),
  'ember-bomb': [
    '  .*.   ',
    ' (###)~ ',
    '  \\|/   ',
  ].join('\n'),
  'rusted-blade': [
    '   /\\   ',
    '=={==>  ',
    '   \\\\/   ',
  ].join('\n'),
  'scrap-armor': [
    ' .-[]-. ',
    ' |====| ',
    " '-[]-' ",
  ].join('\n'),
};

export const getMonsterAsciiArt = (kind: MonsterKind): string => MONSTER_ASCII_ART[kind];

export const getItemAsciiArt = (kind: ItemKind): string => ITEM_ASCII_ART[kind];

export const getItemAsciiLabel = (item: Item | null): string =>
  item ? `${item.glyph}  ${item.name}` : '...  slot vuoto';
