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
    warden: [
        '  /==\\\\  ',
        ' <|BB|> ',
        '  /||\\\\  ',
    ].join('\n'),
    overseer: [
        '  /XX\\\\  ',
        ' <|##|> ',
        '  /||\\\\  ',
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
    'bandage-roll': [
        ' .----. ',
        ' |////| ',
        " '----' ",
    ].join('\n'),
    'ember-bomb': [
        '  .*.   ',
        ' (###)~ ',
        '  \\|/   ',
    ].join('\n'),
    'shock-orb': [
        '  .o.   ',
        ' {~~~}  ',
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
    'field-medkit': [
        ' .----. ',
        ' | ++ | ',
        ' |++++| ',
    ].join('\n'),
    'inferno-charge': [
        '  .*.   ',
        ' {###}> ',
        '  \\|/   ',
    ].join('\n'),
    'steel-blade': [
        '   /\\   ',
        '=={##>  ',
        '   \\\\/   ',
    ].join('\n'),
    'plate-armor': [
        ' .-##-. ',
        ' |====| ',
        " '[__]' ",
    ].join('\n'),
    'serrated-pike': [
        '   /#   ',
        '=={##>  ',
        '   \\\\/   ',
    ].join('\n'),
    'relic-cleaver': [
        '  /##   ',
        '=={###  ',
        '  \\\\/   ',
    ].join('\n'),
    'reinforced-mail': [
        ' .-##-. ',
        ' |####| ',
        " '[__]' ",
    ].join('\n'),
    'bulwark-shell': [
        ' .-XX-. ',
        ' |####| ',
        " '[##]' ",
    ].join('\n'),
    'courier-pack': [
        ' .-[]-. ',
        ' | [] | ',
        " '----' ",
    ].join('\n'),
    'scavenger-pack': [
        ' .-[]-. ',
        ' | ## | ',
        " '----' ",
    ].join('\n'),
    'expedition-pack': [
        ' .-[]-. ',
        ' |####| ',
        " '====' ",
    ].join('\n'),
    'hauler-rig': [
        ' .-[]-. ',
        ' |####| ',
        ' |####| ',
    ].join('\n'),
    'vault-frame': [
        ' .-[]-. ',
        ' |####| ',
        ' {####} ',
    ].join('\n'),
};
export const getMonsterAsciiArt = (kind) => MONSTER_ASCII_ART[kind];
export const getItemAsciiArt = (kind) => ITEM_ASCII_ART[kind];
export const getItemAsciiLabel = (item) => item ? `${item.glyph}  ${item.name}` : '...  slot vuoto';
