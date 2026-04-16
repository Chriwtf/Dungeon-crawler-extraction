import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { consumeLoadoutForRun, equipLoadoutItem, getMetaState, unequipLoadoutItem, } from '../state/metaProgression';
import { applyTextGlow, createTextStyle, drawBackdrop, drawScanlines, drawScreenFrame, drawTerminalPanel, matrixPalette, } from '../ui/matrixTheme';
import { getItemAsciiArt, getItemAsciiLabel } from '../ui/asciiModels';
const LOADOUT_SIZE = 4;
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
        drawTerminalPanel({ graphics: this.chromeGraphics, x: 54, y: 146, width: 454, height: 512, headerHeight: 34 });
        drawTerminalPanel({ graphics: this.chromeGraphics, x: 560, y: 146, width: 626, height: 244, headerHeight: 34 });
        drawTerminalPanel({ graphics: this.chromeGraphics, x: 560, y: 414, width: 626, height: 244, headerHeight: 34 });
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
        this.loadoutText = this.add.text(610, 205, '', {
            ...createTextStyle('16px', matrixPalette.text),
            lineSpacing: 4,
            wordWrap: { width: 330 },
        });
        this.detailText = this.add.text(610, 445, '', {
            ...createTextStyle('15px', matrixPalette.textDim),
            lineSpacing: 3,
            wordWrap: { width: 540 },
        });
        this.asciiDetailText = this.add.text(1040, 448, '', {
            ...createTextStyle('14px', matrixPalette.accent, 'center'),
            lineSpacing: 5,
        }).setOrigin(0.5, 0);
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
    refreshTexts() {
        this.helpText.setText([
            'W/S scorri stash   1-4 scegli slot loadout',
            'E equipaggia   Q rimetti in stash   SPACE avvia run   ESC torna al menu',
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
            return `${marker} SLOT ${index + 1}  ${item ? item.name : '(vuoto)'}`;
        });
        this.loadoutText.setText(loadoutLines.join('\n'));
        const selectedStashItem = this.stash[this.stashIndex];
        const selectedLoadoutItem = this.loadout[this.selectedSlot];
        const detailItem = selectedStashItem ?? selectedLoadoutItem;
        this.asciiDetailText.setText(detailItem ? getItemAsciiArt(detailItem.kind) : ' .-. \n( . )\n `-` ');
        this.detailText.setText([
            `Slot attivo: ${this.selectedSlot + 1}`,
            selectedStashItem ? `Riga stash: ${getItemAsciiLabel(selectedStashItem)}` : 'Riga stash: (vuota)',
            '',
            detailItem ? detailItem.description : 'Nessun oggetto selezionato.',
            '',
            'Premendo SPACE la run parte con il loadout mostrato sopra.',
        ].join('\n'));
    }
}
