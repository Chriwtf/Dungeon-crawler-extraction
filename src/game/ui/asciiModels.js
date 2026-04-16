export const PLAYER_GLYPH = '@';
export const PLAYER_ASCII_ART = [
    '  /@\\\\  ',
    ' <[::]> ',
    '  /  \\\\  ',
].join('\n');
const MONSTER_ASCII_ART = {
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
const ITEM_ASCII_ART = {
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
export const getMonsterAsciiArt = (kind) => MONSTER_ASCII_ART[kind];
export const getItemAsciiArt = (kind) => ITEM_ASCII_ART[kind];
export const getItemAsciiLabel = (item) => item ? `${item.glyph}  ${item.name}` : '...  slot vuoto';
