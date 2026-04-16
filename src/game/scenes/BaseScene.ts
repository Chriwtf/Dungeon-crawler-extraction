import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  consumeLoadoutForRun,
  equipLoadoutItem,
  getMetaState,
  unequipLoadoutItem,
} from '../state/metaProgression';
import type { Item } from '../items/inventory';

const LOADOUT_SIZE = 4;

export class BaseScene extends Phaser.Scene {
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
    this.cameras.main.setBackgroundColor('#091015');

    this.titleText = this.add.text(GAME_WIDTH / 2, 54, 'BASE / STASH', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#d8e0ea',
    }).setOrigin(0.5);

    this.helpText = this.add.text(GAME_WIDTH / 2, 98, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fb0c2',
      align: 'center',
    }).setOrigin(0.5);

    this.add.rectangle(280, 405, 420, 470, 0x101821, 0.96).setStrokeStyle(1, 0x2c3745);
    this.add.rectangle(780, 290, 380, 240, 0x101821, 0.96).setStrokeStyle(1, 0x2c3745);
    this.add.rectangle(780, 520, 380, 210, 0x101821, 0.96).setStrokeStyle(1, 0x2c3745);

    this.add.text(100, 175, 'STASH', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8e0ea',
    });
    this.add.text(610, 175, 'LOADOUT PROSSIMA RUN', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8e0ea',
    });
    this.add.text(610, 415, 'DETTAGLIO', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8e0ea',
    });

    this.stashText = this.add.text(86, 205, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d8e0ea',
      lineSpacing: 2,
      wordWrap: { width: 380 },
    });

    this.loadoutText = this.add.text(610, 205, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d8e0ea',
      lineSpacing: 4,
      wordWrap: { width: 330 },
    });

    this.detailText = this.add.text(610, 445, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#9fb0c2',
      lineSpacing: 3,
      wordWrap: { width: 330 },
    });

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
      'UP/DOWN seleziona stash   1-4 cambia slot loadout',
      'E equipaggia dallo stash   Q rimette nello stash   SPACE parte   ESC menu',
      'Gli oggetti equipaggiati escono dalla stash e, se muori, vengono persi.',
    ].join('\n'));

    const stashLines = this.stash.length === 0
      ? ['(stash vuota)', '', 'Rientra da un\'estrazione per depositare gli oggetti trovati.']
      : this.stash.map((item, index) => {
          const marker = index === this.stashIndex ? '>' : ' ';
          return `${marker} ${item.name}`;
        });

    this.stashText.setText(stashLines.join('\n'));

    const loadoutLines = this.loadout.map((item, index) => {
      const marker = index === this.selectedSlot ? '>' : ' ';
      return `${marker} [${index + 1}] ${item ? item.name : '(vuoto)'}`;
    });
    this.loadoutText.setText(loadoutLines.join('\n'));

    const selectedStashItem = this.stash[this.stashIndex];
    const selectedLoadoutItem = this.loadout[this.selectedSlot];
    const detailItem = selectedStashItem ?? selectedLoadoutItem;

    this.detailText.setText([
      `Slot attivo: ${this.selectedSlot + 1}`,
      selectedStashItem ? `Stash selezionata: ${selectedStashItem.name}` : 'Stash selezionata: (vuota)',
      '',
      detailItem ? detailItem.description : 'Nessun oggetto selezionato.',
      '',
      'Se premi SPACE, la run parte con il loadout mostrato qui sopra.',
    ].join('\n'));
  }
}
