import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  consumeLoadoutForRun,
  equipLoadoutItem,
  getMetaState,
  unequipLoadoutItem,
} from '../state/metaProgression';
import type { Item } from '../items/inventory';
import {
  applyTextGlow,
  createTextStyle,
  drawBackdrop,
  drawScanlines,
  drawScreenFrame,
  drawTerminalPanel,
  matrixPalette,
} from '../ui/matrixTheme';

const LOADOUT_SIZE = 4;

export class BaseScene extends Phaser.Scene {
  private chromeGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private stashText!: Phaser.GameObjects.Text;
  private loadoutText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private stash: Item[] = [];
  private loadout: Array<Item | null> = Array(LOADOUT_SIZE).fill(null);
  private stashIndex = 0;
  private selectedSlot = 0;

  constructor() {
    super('base');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020604');

    const backdrop = this.add.graphics();
    drawBackdrop(backdrop, GAME_WIDTH, GAME_HEIGHT);

    this.chromeGraphics = this.add.graphics();
    drawScreenFrame(this.chromeGraphics, GAME_WIDTH, GAME_HEIGHT);
    drawTerminalPanel({ graphics: this.chromeGraphics, x: 54, y: 146, width: 454, height: 512, headerHeight: 34 });
    drawTerminalPanel({ graphics: this.chromeGraphics, x: 560, y: 146, width: 626, height: 244, headerHeight: 34 });
    drawTerminalPanel({ graphics: this.chromeGraphics, x: 560, y: 414, width: 626, height: 244, headerHeight: 34 });

    this.titleText = applyTextGlow(
      this.add.text(GAME_WIDTH / 2, 52, 'SAFEHOUSE // STASH TERMINAL', createTextStyle('30px', matrixPalette.accent, 'center')),
      matrixPalette.accent,
      16,
    ).setOrigin(0.5);

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

    const scanlines = this.add.graphics();
    drawScanlines(scanlines, GAME_WIDTH, GAME_HEIGHT, 4);

    this.bindInput();
    this.reloadState();
  }

  private bindInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
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

  private reloadState(): void {
    const state = getMetaState();
    this.stash = state.stash;
    this.loadout = state.loadout;
    this.stashIndex = Math.max(0, Math.min(this.stashIndex, Math.max(0, this.stash.length - 1)));
    this.refreshTexts();
  }

  private moveSelection(delta: number): void {
    if (this.stash.length === 0) {
      this.stashIndex = 0;
      this.refreshTexts();
      return;
    }

    this.stashIndex = Phaser.Math.Wrap(this.stashIndex + delta, 0, this.stash.length);
    this.refreshTexts();
  }

  private equipSelectedStashItem(): void {
    if (this.stash.length === 0) {
      return;
    }

    equipLoadoutItem(this.stashIndex, this.selectedSlot);
    this.reloadState();
  }

  private unequipSelectedSlot(): void {
    unequipLoadoutItem(this.selectedSlot);
    this.reloadState();
  }

  private startRun(): void {
    const startingInventory = consumeLoadoutForRun();
    this.scene.start('run', {
      depth: 1,
      startingInventory,
    });
  }

  private refreshTexts(): void {
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

    this.detailText.setText([
      `Slot attivo: ${this.selectedSlot + 1}`,
      selectedStashItem ? `Riga stash: ${selectedStashItem.name}` : 'Riga stash: (vuota)',
      '',
      detailItem ? detailItem.description : 'Nessun oggetto selezionato.',
      '',
      'Premendo SPACE la run parte con il loadout mostrato sopra.',
    ].join('\n'));
  }
}
