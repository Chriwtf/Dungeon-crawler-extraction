import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  getRandomNeighborSteps,
  getStepTowardTarget,
  isAdjacent,
  rollDamage,
  spawnMonsters,
  type Monster,
} from '../combat/monsters';
import { TurnEngine } from '../core/TurnEngine';
import { applyItemEffect } from '../items/itemEffects';
import { rollMonsterDrop, spawnGroundItems, type GroundItem, type Item } from '../items/inventory';
import {
  generateDungeon,
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_SIZE,
  TileType,
  type Point,
  type TileGrid,
} from '../world/DungeonGenerator';

const OFFSET_X = 40;
const OFFSET_Y = 60;
const INVENTORY_SIZE = 4;
const MAP_PIXEL_WIDTH = MAP_WIDTH * TILE_SIZE;
const SIDEBAR_X = OFFSET_X + MAP_PIXEL_WIDTH + 36;
const PANEL_WIDTH = 320;

export class RunScene extends Phaser.Scene {
  private tiles: TileGrid = [];
  private player!: Point;
  private monsters: Monster[] = [];
  private groundItems: GroundItem[] = [];
  private inventory: Array<Item | null> = Array(INVENTORY_SIZE).fill(null);
  private selectedSlot = 0;
  private objectiveCollected = false;
  private extractionUnlocked = false;
  private turnEngine = new TurnEngine();
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private playerRect!: Phaser.GameObjects.Rectangle;
  private hudText!: Phaser.GameObjects.Text;
  private logTitleText!: Phaser.GameObjects.Text;
  private inventoryTitleText!: Phaser.GameObjects.Text;
  private statusTitleText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private logLines: string[] = [];
  private playerHp = 12;
  private readonly playerMaxHp = 12;
  private isRunComplete = false;

  constructor() {
    super('run');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#050608');
    this.mapGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();

    this.hudText = this.add.text(40, 16, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8e0ea',
    });

    this.logTitleText = this.add.text(SIDEBAR_X + 16, 61, 'LOG EVENTI', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d8e0ea',
    });

    this.inventoryTitleText = this.add.text(SIDEBAR_X + 16, 309, 'STATO E INVENTARIO', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d8e0ea',
    });

    this.statusTitleText = this.add.text(SIDEBAR_X + 16, 549, 'COMANDI E DETTAGLI', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d8e0ea',
    });

    this.logText = this.add.text(SIDEBAR_X + 18, 78, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#9fb0c2',
      wordWrap: { width: PANEL_WIDTH - 36 },
    });

    this.inventoryText = this.add.text(SIDEBAR_X + 18, 326, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#d8e0ea',
      wordWrap: { width: PANEL_WIDTH - 36 },
    });

    this.statusText = this.add.text(SIDEBAR_X + 18, 560, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#a9b4c2',
      wordWrap: { width: PANEL_WIDTH - 36 },
    });

    this.playerRect = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, 0x8be9fd);

    this.setupRun();
    this.bindInput();
  }

  private setupRun(): void {
    const dungeon = generateDungeon();
    const safeSpawnArea = [
      dungeon.playerStart,
      dungeon.objective,
      dungeon.extraction,
      { x: dungeon.playerStart.x + 1, y: dungeon.playerStart.y },
      { x: dungeon.playerStart.x - 1, y: dungeon.playerStart.y },
      { x: dungeon.playerStart.x, y: dungeon.playerStart.y + 1 },
      { x: dungeon.playerStart.x, y: dungeon.playerStart.y - 1 },
    ];

    this.tiles = dungeon.tiles;
    this.player = { ...dungeon.playerStart };
    this.monsters = spawnMonsters(this.tiles, safeSpawnArea);
    this.groundItems = spawnGroundItems(this.tiles, safeSpawnArea);
    this.inventory = Array(INVENTORY_SIZE).fill(null);
    this.selectedSlot = 0;
    this.objectiveCollected = false;
    this.extractionUnlocked = false;
    this.playerHp = this.playerMaxHp;
    this.isRunComplete = false;
    this.turnEngine = new TurnEngine();
    this.logLines = [
      'Sei entrato nell\'archivio.',
      'Raccogli oggetti, gestisci 4 slot e sopravvivi.',
      'DCSS style: pickup a terra, inventario rapido, pressione tattica.',
    ];

    this.drawMap();
    this.updatePlayerVisual();
    this.addLogLines(['Run avviata']);
    this.refreshHud();
  }

  private bindInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isRunComplete) {
        if (event.code === 'KeyR') {
          this.setupRun();
        }

        if (event.code === 'Space') {
          this.scene.start('menu');
        }
        return;
      }

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.tryMove(0, -1);
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.tryMove(0, 1);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.tryMove(-1, 0);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.tryMove(1, 0);
          break;
        case 'KeyE':
          this.interact();
          break;
        case 'KeyG':
          this.pickUpItem();
          break;
        case 'KeyF':
          this.useSelectedItem();
          break;
        case 'KeyQ':
          this.dropSelectedItem();
          break;
        case 'Tab':
          event.preventDefault();
          this.selectNextSlot();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          this.selectInventorySlot(Number(event.code.replace('Digit', '')) - 1);
          break;
        case 'KeyR':
          this.setupRun();
          break;
        default:
          break;
      }
    });
  }

  private tryMove(dx: number, dy: number): void {
    const next = { x: this.player.x + dx, y: this.player.y + dy };
    const targetMonster = this.getMonsterAt(next.x, next.y);

    if (targetMonster) {
      this.resolvePlayerTurn(this.attackMonster(targetMonster));
      return;
    }

    if (!this.isWalkable(next.x, next.y)) {
      this.addLogLines(['Urti contro il muro.']);
      this.refreshHud();
      return;
    }

    this.player = next;
    const tile = this.tiles[next.y][next.x];
    let logLine = 'Ti muovi nel buio.';

    if (tile === 'objective' && !this.objectiveCollected) {
      this.objectiveCollected = true;
      this.extractionUnlocked = true;
      logLine = 'Hai recuperato il reperto. L\'uscita ora e aperta.';
      this.tiles[next.y][next.x] = 'floor';
    } else if (tile === 'extraction') {
      logLine = this.extractionUnlocked
        ? 'Sei sulla zona di estrazione. Premi E per uscire.'
        : 'L\'estrazione e sigillata. Ti manca il reperto.';
    } else if (this.getGroundItemAt(this.player.x, this.player.y)) {
      logLine = 'C\'e un oggetto qui. Premi G per raccoglierlo.';
    }

    this.resolvePlayerTurn([logLine]);
  }

  private interact(): void {
    const tile = this.tiles[this.player.y][this.player.x];

    if (tile === 'extraction' && this.extractionUnlocked) {
      this.isRunComplete = true;
      this.turnEngine.next('Estrazione completata. Sei sopravvissuto.');
      this.addLogLines([
        'Estrazione completata. Sei sopravvissuto.',
        'Premi R per una nuova run o SPACE per tornare al menu.',
      ]);
      this.drawMap();
      this.refreshHud();
      return;
    }

    this.resolvePlayerTurn(['Qui non c\'e nulla da attivare.']);
  }

  private pickUpItem(): void {
    const groundItem = this.getGroundItemAt(this.player.x, this.player.y);
    if (!groundItem) {
      this.addLogLines(['Non c\'e nulla da raccogliere qui.']);
      this.refreshHud();
      return;
    }

    const freeSlot = this.inventory.findIndex((item) => item === null);
    if (freeSlot === -1) {
      this.addLogLines(['Inventario pieno. Hai solo 4 slot.']);
      this.refreshHud();
      return;
    }

    this.inventory[freeSlot] = groundItem.item;
    this.selectedSlot = freeSlot;
    this.groundItems = this.groundItems.filter((entry) => entry.item.id !== groundItem.item.id);
    this.resolvePlayerTurn([`Raccogli ${groundItem.item.name} nello slot ${freeSlot + 1}.`]);
  }

  private useSelectedItem(): void {
    const item = this.inventory[this.selectedSlot];
    if (!item) {
      this.addLogLines([`Lo slot ${this.selectedSlot + 1} e vuoto.`]);
      this.refreshHud();
      return;
    }

    const result = applyItemEffect({
      item,
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      playerPosition: this.player,
      monsters: this.monsters,
    });
    if (!result.consumed) {
      this.addLogLines(result.logLines);
      this.refreshHud();
      return;
    }

    this.playerHp = result.nextPlayerHp;

    if (item.kind === 'ember-bomb') {
      const adjacentTargets = this.monsters.filter((monster) => isAdjacent(monster.position, this.player));
      for (const monster of adjacentTargets) {
        monster.hp -= item.damageAmount ?? 0;
      }

      const removedMonsters = this.monsters.filter((monster) => result.removedMonsterIds.includes(monster.id));
      this.monsters = this.monsters.filter((monster) => !result.removedMonsterIds.includes(monster.id));

      for (const monster of removedMonsters) {
        this.dropItemFromMonster(monster);
      }
    }

    this.inventory[this.selectedSlot] = null;
    this.resolvePlayerTurn(result.logLines);
  }

  private dropSelectedItem(): void {
    const item = this.inventory[this.selectedSlot];
    if (!item) {
      this.addLogLines([`Lo slot ${this.selectedSlot + 1} e vuoto.`]);
      this.refreshHud();
      return;
    }

    if (this.getGroundItemAt(this.player.x, this.player.y)) {
      this.addLogLines(['C\'e gia un oggetto a terra su questa casella.']);
      this.refreshHud();
      return;
    }

    this.inventory[this.selectedSlot] = null;
    this.groundItems.push({
      item,
      position: { ...this.player },
    });
    this.resolvePlayerTurn([`Lasci ${item.name} a terra.`]);
  }

  private selectNextSlot(): void {
    this.selectedSlot = (this.selectedSlot + 1) % INVENTORY_SIZE;
    this.addLogLines([`Slot attivo: ${this.selectedSlot + 1}.`]);
    this.refreshHud();
  }

  private selectInventorySlot(slotIndex: number): void {
    this.selectedSlot = slotIndex;
    this.addLogLines([`Slot attivo: ${this.selectedSlot + 1}.`]);
    this.refreshHud();
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
      return false;
    }

    return this.tiles[y][x] !== 'wall';
  }

  private drawMap(): void {
    this.mapGraphics.clear();
    this.uiGraphics.clear();

    this.uiGraphics.fillStyle(0x0f141b, 0.95);
    this.uiGraphics.fillRoundedRect(SIDEBAR_X, 56, PANEL_WIDTH, 228, 10);
    this.uiGraphics.fillRoundedRect(SIDEBAR_X, 304, PANEL_WIDTH, 232, 10);
    this.uiGraphics.fillRoundedRect(SIDEBAR_X, 544, PANEL_WIDTH, 132, 10);

    this.uiGraphics.lineStyle(1, 0x2b3440, 1);
    this.uiGraphics.strokeRoundedRect(SIDEBAR_X, 56, PANEL_WIDTH, 228, 10);
    this.uiGraphics.strokeRoundedRect(SIDEBAR_X, 304, PANEL_WIDTH, 232, 10);
    this.uiGraphics.strokeRoundedRect(SIDEBAR_X, 544, PANEL_WIDTH, 132, 10);

    this.uiGraphics.fillStyle(0x18202b, 1);
    this.uiGraphics.fillRoundedRect(SIDEBAR_X, 56, PANEL_WIDTH, 28, 10);
    this.uiGraphics.fillRoundedRect(SIDEBAR_X, 304, PANEL_WIDTH, 28, 10);
    this.uiGraphics.fillRoundedRect(SIDEBAR_X, 544, PANEL_WIDTH, 28, 10);

    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const tile = this.tiles[y][x];
        const color = this.getTileColor(tile);

        this.mapGraphics.fillStyle(color, 1);
        this.mapGraphics.fillRect(
          OFFSET_X + x * TILE_SIZE,
          OFFSET_Y + y * TILE_SIZE,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
        );
      }
    }

    for (const groundItem of this.groundItems) {
      this.mapGraphics.fillStyle(groundItem.item.color, 1);
      this.mapGraphics.fillCircle(
        OFFSET_X + groundItem.position.x * TILE_SIZE + TILE_SIZE / 2,
        OFFSET_Y + groundItem.position.y * TILE_SIZE + TILE_SIZE / 2,
        5,
      );
    }

    for (const monster of this.monsters) {
      this.mapGraphics.fillStyle(monster.color, 1);
      this.mapGraphics.fillRect(
        OFFSET_X + monster.position.x * TILE_SIZE + 4,
        OFFSET_Y + monster.position.y * TILE_SIZE + 4,
        TILE_SIZE - 8,
        TILE_SIZE - 8,
      );

      this.mapGraphics.fillStyle(0x101419, 1);
      this.mapGraphics.fillRect(
        OFFSET_X + monster.position.x * TILE_SIZE + 8,
        OFFSET_Y + monster.position.y * TILE_SIZE + 8,
        TILE_SIZE - 16,
        4,
      );
    }
  }

  private getTileColor(tile: TileType): number {
    switch (tile) {
      case 'wall':
        return 0x12161d;
      case 'floor':
        return 0x29313d;
      case 'objective':
        return 0xd9a441;
      case 'extraction':
        return this.extractionUnlocked ? 0x4bc97b : 0x4a5c68;
      default:
        return 0xffffff;
    }
  }

  private updatePlayerVisual(): void {
    this.playerRect.setPosition(
      OFFSET_X + this.player.x * TILE_SIZE + TILE_SIZE / 2,
      OFFSET_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2,
    );
  }

  private refreshHud(): void {
    this.hudText.setText(
      [
        `Turno: ${this.turnEngine.currentTurn}`,
        `HP: ${this.playerHp}/${this.playerMaxHp}`,
        `Reperto: ${this.objectiveCollected ? 'RECUPERATO' : 'MANCANTE'}`,
        `Estrazione: ${this.extractionUnlocked ? 'ATTIVA' : 'BLOCCATA'}`,
        `Mostri: ${this.monsters.length}`,
      ].join('   |   '),
    );

    this.inventoryText.setText(this.buildInventoryText());
    this.statusText.setText(this.buildStatusText());
    this.updateLog();
  }

  private updateLog(): void {
    this.logText.setText(this.logLines.join('\n'));
  }

  private buildInventoryText(): string {
    const lines = [`Vita: ${this.playerHp}/${this.playerMaxHp}`, '', 'INVENTARIO'];

    for (let index = 0; index < INVENTORY_SIZE; index += 1) {
      const item = this.inventory[index];
      const marker = index === this.selectedSlot ? '>' : ' ';
      lines.push(`${marker} [${index + 1}] ${item ? item.name : '(vuoto)'}`);
    }

    const groundItem = this.getGroundItemAt(this.player.x, this.player.y);
    lines.push('');
    lines.push('A TERRA');
    lines.push(groundItem ? `${groundItem.item.name}` : '(nulla)');

    return lines.join('\n');
  }

  private buildStatusText(): string {
    const selectedItem = this.inventory[this.selectedSlot];

    return [
      'G raccogli',
      'F usa slot attivo',
      'Q lascia a terra',
      'TAB o 1-4 cambia slot',
      '',
      'DETTAGLIO SLOT',
      selectedItem ? `${selectedItem.name}` : '(vuoto)',
      selectedItem ? selectedItem.description : 'Seleziona uno slot pieno per usarlo.',
    ].join('\n');
  }

  private resolvePlayerTurn(logLines: string[]): void {
    if (this.isRunComplete) {
      return;
    }

    this.turnEngine.next(logLines[0] ?? 'Azione');
    const monsterLogLines = this.runMonsterTurn();

    this.updatePlayerVisual();
    this.drawMap();
    this.addLogLines([...logLines, ...monsterLogLines]);
    this.refreshHud();
  }

  private addLogLines(lines: string[]): void {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      this.logLines.unshift(lines[index]);
    }

    this.logLines = this.logLines.slice(0, 8);
  }

  private getMonsterAt(x: number, y: number): Monster | undefined {
    return this.monsters.find((monster) => monster.position.x === x && monster.position.y === y);
  }

  private getGroundItemAt(x: number, y: number): GroundItem | undefined {
    return this.groundItems.find((entry) => entry.position.x === x && entry.position.y === y);
  }

  private attackMonster(monster: Monster): string[] {
    const damage = rollDamage(2, 4);
    monster.hp -= damage;

    if (monster.hp <= 0) {
      this.monsters = this.monsters.filter((candidate) => candidate.id !== monster.id);
      this.dropItemFromMonster(monster);
      return [`Colpisci ${monster.name} per ${damage} e lo abbatti.`];
    }

    return [`Colpisci ${monster.name} per ${damage}. Gli restano ${monster.hp} HP.`];
  }

  private dropItemFromMonster(monster: Monster): void {
    const droppedItem = rollMonsterDrop();
    if (!droppedItem) {
      return;
    }

    const occupied = this.getGroundItemAt(monster.position.x, monster.position.y);
    if (occupied) {
      return;
    }

    this.groundItems.push({
      item: droppedItem,
      position: { ...monster.position },
    });

    this.addLogLines([`${monster.name} lascia ${droppedItem.name}.`]);
  }

  private runMonsterTurn(): string[] {
    const logLines: string[] = [];

    for (const monster of this.monsters) {
      if (this.isRunComplete) {
        break;
      }

      if (isAdjacent(monster.position, this.player)) {
        this.attackPlayer(monster, logLines);
        continue;
      }

      const distanceToPlayer =
        Math.abs(monster.position.x - this.player.x) + Math.abs(monster.position.y - this.player.y);

      if (distanceToPlayer <= monster.alertRange) {
        const chaseSteps = getStepTowardTarget(monster.position, this.player);
        if (this.tryMoveMonster(monster, chaseSteps)) {
          continue;
        }
      }

      if (Math.random() > 0.35) {
        continue;
      }

      this.tryMoveMonster(monster, getRandomNeighborSteps(monster.position));
    }

    return logLines;
  }

  private tryMoveMonster(monster: Monster, steps: Point[]): boolean {
    for (const step of steps) {
      if (!this.isWalkable(step.x, step.y)) {
        continue;
      }

      if (step.x === this.player.x && step.y === this.player.y) {
        continue;
      }

      if (this.getMonsterAt(step.x, step.y)) {
        continue;
      }

      monster.position = step;
      return true;
    }

    return false;
  }

  private attackPlayer(monster: Monster, logLines: string[]): void {
    const damage = rollDamage(monster.damageMin, monster.damageMax);
    this.playerHp = Math.max(0, this.playerHp - damage);

    if (this.playerHp === 0) {
      this.isRunComplete = true;
      logLines.push(`${monster.name} ti infligge ${damage} danni. Sei morto nell'archivio.`);
      logLines.push('Premi R per una nuova run o SPACE per tornare al menu.');
      return;
    }

    logLines.push(`${monster.name} ti colpisce per ${damage}. Ti restano ${this.playerHp} HP.`);
  }
}
