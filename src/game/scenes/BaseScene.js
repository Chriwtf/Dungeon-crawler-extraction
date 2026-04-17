import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { consumeLoadoutForRun, equipLoadoutItem, getMetaState, unequipLoadoutItem, } from '../state/metaProgression';
import { applyTextGlow, createTextStyle, drawBackdrop, drawScanlines, drawScreenFrame, drawTerminalPanel, matrixPalette, } from '../ui/matrixTheme';
import { getItemAsciiArt, getItemAsciiLabel } from '../ui/asciiModels';
const LOADOUT_SIZE = 4;
const STASH_PANEL_X = 54;
const STASH_PANEL_Y = 146;
const STASH_PANEL_WIDTH = 454;
const STASH_PANEL_HEIGHT = 512;
const LOADOUT_PANEL_X = 560;
const LOADOUT_PANEL_Y = 146;
const LOADOUT_PANEL_WIDTH = 626;
const LOADOUT_PANEL_HEIGHT = 244;
const DETAIL_PANEL_X = 560;
const DETAIL_PANEL_Y = 414;
const DETAIL_PANEL_WIDTH = 626;
const DETAIL_PANEL_HEIGHT = 244;
const PANEL_HEADER_HEIGHT = 34;
const PANEL_INNER_PADDING_X = 26;
const PANEL_INNER_PADDING_TOP = 59;
const PANEL_INNER_PADDING_BOTTOM = 22;
const DETAIL_PREVIEW_WIDTH = 124;
const DETAIL_COLUMN_GAP = 22;
const DETAIL_BODY_X = DETAIL_PANEL_X + PANEL_INNER_PADDING_X;
const DETAIL_BODY_Y = DETAIL_PANEL_Y + PANEL_INNER_PADDING_TOP;
const DETAIL_BODY_HEIGHT = DETAIL_PANEL_HEIGHT - PANEL_INNER_PADDING_TOP - PANEL_INNER_PADDING_BOTTOM;
const DETAIL_TEXT_WIDTH = DETAIL_PANEL_WIDTH - (PANEL_INNER_PADDING_X * 2) - DETAIL_PREVIEW_WIDTH - DETAIL_COLUMN_GAP;
const DETAIL_PREVIEW_CENTER_X = DETAIL_PANEL_X + DETAIL_PANEL_WIDTH - PANEL_INNER_PADDING_X - Math.floor(DETAIL_PREVIEW_WIDTH / 2);
export class BaseScene extends Phaser.Scene {
    constructor() {
        super('base');
        Object.defineProperty(this, "chromeGraphics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "titleText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "helpText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "stashText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "loadoutText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "detailText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "asciiDetailText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "panelMaskGraphics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "stash", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "loadout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Array(LOADOUT_SIZE).fill(null)
        });
        Object.defineProperty(this, "stashIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "selectedSlot", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    create() {
        this.cameras.main.setBackgroundColor('#020604');
        const backdrop = this.add.graphics();
        drawBackdrop(backdrop, GAME_WIDTH, GAME_HEIGHT);
        this.chromeGraphics = this.add.graphics();
        drawScreenFrame(this.chromeGraphics, GAME_WIDTH, GAME_HEIGHT);
        drawTerminalPanel({
            graphics: this.chromeGraphics,
            x: STASH_PANEL_X,
            y: STASH_PANEL_Y,
            width: STASH_PANEL_WIDTH,
            height: STASH_PANEL_HEIGHT,
            headerHeight: PANEL_HEADER_HEIGHT,
        });
        drawTerminalPanel({
            graphics: this.chromeGraphics,
            x: LOADOUT_PANEL_X,
            y: LOADOUT_PANEL_Y,
            width: LOADOUT_PANEL_WIDTH,
            height: LOADOUT_PANEL_HEIGHT,
            headerHeight: PANEL_HEADER_HEIGHT,
        });
        drawTerminalPanel({
            graphics: this.chromeGraphics,
            x: DETAIL_PANEL_X,
            y: DETAIL_PANEL_Y,
            width: DETAIL_PANEL_WIDTH,
            height: DETAIL_PANEL_HEIGHT,
            headerHeight: PANEL_HEADER_HEIGHT,
        });
        this.titleText = applyTextGlow(this.add.text(GAME_WIDTH / 2, 52, 'SAFEHOUSE // STASH TERMINAL', createTextStyle('30px', matrixPalette.accent, 'center')), matrixPalette.accent, 16).setOrigin(0.5);
        this.helpText = this.add.text(GAME_WIDTH / 2, 98, '', {
            ...createTextStyle('15px', matrixPalette.textDim, 'center'),
            lineSpacing: 4,
        }).setOrigin(0.5);
        this.add.text(80, 154, 'ARCHIVE STASH', createTextStyle('16px', matrixPalette.text));
        this.add.text(586, 154, 'RUN LOADOUT', createTextStyle('16px', matrixPalette.text));
        this.add.text(586, 422, 'ITEM DETAIL', createTextStyle('16px', matrixPalette.text));
        this.stashText = this.add.text(86, 205, '', {
            ...createTextStyle('15px', matrixPalette.text),
            lineSpacing: 2,
            wordWrap: { width: 380 },
        });
        this.constrainTextToPanel(this.stashText, STASH_PANEL_X + PANEL_INNER_PADDING_X, STASH_PANEL_Y + PANEL_INNER_PADDING_TOP, STASH_PANEL_WIDTH - (PANEL_INNER_PADDING_X * 2), STASH_PANEL_HEIGHT - PANEL_INNER_PADDING_TOP - PANEL_INNER_PADDING_BOTTOM);
        this.loadoutText = this.add.text(610, 205, '', {
            ...createTextStyle('16px', matrixPalette.text),
            lineSpacing: 4,
            wordWrap: { width: 330 },
        });
        this.constrainTextToPanel(this.loadoutText, LOADOUT_PANEL_X + PANEL_INNER_PADDING_X, LOADOUT_PANEL_Y + PANEL_INNER_PADDING_TOP, LOADOUT_PANEL_WIDTH - (PANEL_INNER_PADDING_X * 2), LOADOUT_PANEL_HEIGHT - PANEL_INNER_PADDING_TOP - PANEL_INNER_PADDING_BOTTOM);
        this.detailText = this.add.text(DETAIL_BODY_X, DETAIL_BODY_Y, '', {
            ...createTextStyle('15px', matrixPalette.textDim),
            lineSpacing: 3,
            wordWrap: { width: DETAIL_TEXT_WIDTH, useAdvancedWrap: true },
        });
        this.constrainTextToPanel(this.detailText, DETAIL_BODY_X, DETAIL_BODY_Y, DETAIL_TEXT_WIDTH, DETAIL_BODY_HEIGHT);
        this.asciiDetailText = this.add.text(DETAIL_PREVIEW_CENTER_X, DETAIL_BODY_Y + 3, '', {
            ...createTextStyle('14px', matrixPalette.accent, 'center'),
            lineSpacing: 5,
        }).setOrigin(0.5, 0);
        this.constrainTextToPanel(this.asciiDetailText, DETAIL_PANEL_X + DETAIL_PANEL_WIDTH - PANEL_INNER_PADDING_X - DETAIL_PREVIEW_WIDTH, DETAIL_BODY_Y, DETAIL_PREVIEW_WIDTH, DETAIL_BODY_HEIGHT);
        applyTextGlow(this.asciiDetailText, matrixPalette.accent, 10);
        const scanlines = this.add.graphics();
        drawScanlines(scanlines, GAME_WIDTH, GAME_HEIGHT, 4);
        this.bindInput();
        this.reloadState();
    }
    bindInput() {
        this.input.keyboard?.on('keydown', (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveSelection(-1);
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveSelection(1);
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                    this.selectedSlot = Number(event.code.replace('Digit', '')) - 1;
                    this.refreshTexts();
                    break;
                case 'KeyE':
                    this.equipSelectedStashItem();
                    break;
                case 'KeyQ':
                    this.unequipSelectedSlot();
                    break;
                case 'Space':
                    this.startRun();
                    break;
                case 'Escape':
                    this.scene.start('menu');
                    break;
                default:
                    break;
            }
        });
    }
    constrainTextToPanel(text, x, y, width, height) {
        text.setFixedSize(width, height);
        text.setPadding(0, 0, 0, 0);
        text.setMask(this.createPanelMask(x, y, width, height));
    }
    createPanelMask(x, y, width, height) {
        const maskShape = this.make.graphics({});
        maskShape.fillStyle(0xffffff, 1);
        maskShape.fillRect(x, y, width, height);
        maskShape.setVisible(false);
        this.panelMaskGraphics.push(maskShape);
        return maskShape.createGeometryMask();
    }
    reloadState() {
        const state = getMetaState();
        this.stash = state.stash;
        this.loadout = state.loadout;
        this.stashIndex = Math.max(0, Math.min(this.stashIndex, Math.max(0, this.stash.length - 1)));
        this.refreshTexts();
    }
    moveSelection(delta) {
        if (this.stash.length === 0) {
            this.stashIndex = 0;
            this.refreshTexts();
            return;
        }
        this.stashIndex = Phaser.Math.Wrap(this.stashIndex + delta, 0, this.stash.length);
        this.refreshTexts();
    }
    equipSelectedStashItem() {
        if (this.stash.length === 0) {
            return;
        }
        equipLoadoutItem(this.stashIndex, this.selectedSlot);
        this.reloadState();
    }
    unequipSelectedSlot() {
        unequipLoadoutItem(this.selectedSlot);
        this.reloadState();
    }
    startRun() {
        const startingInventory = consumeLoadoutForRun();
        this.scene.start('run', {
            depth: 1,
            startingInventory,
        });
    }
    getEquippedBackpack() {
        return this.loadout.find((item) => item?.category === 'backpack') ?? null;
    }
    formatLoadoutItemLabel(item) {
        if (!item) {
            return '(vuoto)';
        }
        if (item.category === 'backpack') {
            return `${item.name} [zaino]`;
        }
        return item.name;
    }
    refreshTexts() {
        const equippedBackpack = this.getEquippedBackpack();
        this.helpText.setText([
            'W/S scorri stash   1-4 scegli slot loadout',
            'E equipaggia   Q rimetti in stash   SPACE avvia run   ESC torna al menu',
            `Zaino run: ${equippedBackpack ? equippedBackpack.name : '(nessuno)'}`,
            'Gli oggetti caricati escono dalla stash e vengono persi se muori nella spedizione.',
        ].join('\n'));
        const stashLines = this.stash.length === 0
            ? ['(stash vuota)', '', 'Rientra da un\'estrazione per depositare il bottino recuperato.']
            : this.stash.map((item, index) => {
                const marker = index === this.stashIndex ? '[>]' : '[ ]';
                return `${marker} ${item.name}`;
            });
        this.stashText.setText(stashLines.join('\n'));
        const loadoutLines = this.loadout.map((item, index) => {
            const marker = index === this.selectedSlot ? '[>]' : '[ ]';
            return `${marker} SLOT ${index + 1}  ${this.formatLoadoutItemLabel(item)}`;
        });
        this.loadoutText.setText(loadoutLines.join('\n'));
        const selectedStashItem = this.stash[this.stashIndex];
        const selectedLoadoutItem = this.loadout[this.selectedSlot];
        const detailItem = selectedStashItem ?? selectedLoadoutItem;
        this.asciiDetailText.setText(detailItem ? getItemAsciiArt(detailItem.kind) : ' .--. \n |  | \n `--` ');
        this.detailText.setText([
            `Slot attivo: ${this.selectedSlot + 1}`,
            selectedStashItem ? `Riga stash: ${getItemAsciiLabel(selectedStashItem)}` : 'Riga stash: (vuota)',
            `Zaino run: ${equippedBackpack ? getItemAsciiLabel(equippedBackpack) : '(nessuno)'}`,
            '',
            detailItem ? detailItem.description : 'Nessun oggetto selezionato.',
            '',
            'Gli zaini partono comunque nello slot zaino dedicato della run.',
            'Premendo SPACE la run parte con il loadout mostrato sopra.',
        ].join('\n'));
    }
}
