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
import {
  cloneItem,
  rollMonsterDrop,
  spawnGroundItems,
  type GroundItem,
  type Item,
} from '../items/inventory';
import {
  BASE_PLAYER_STATS,
  derivePlayerStats,
  getRunBonusesForLevel,
  getXpToNextLevel,
  type PlayerStats,
} from '../items/playerStats';
import { depositInventoryToStash } from '../state/metaProgression';
import {
  createDungeonConfigForDepth,
  generateDungeon,
  type Point,
  type TileGrid,
  type TileType,
} from '../world/DungeonGenerator';
import {
  applyTextGlow,
  createTextStyle,
  drawBackdrop,
  drawScanlines,
  drawScreenFrame,
  drawTerminalPanel,
  matrixPalette,
} from '../ui/matrixTheme';
import {
  getItemAsciiArt,
  getItemAsciiLabel,
  getMonsterAsciiArt,
  PLAYER_ASCII_ART,
  PLAYER_GLYPH,
} from '../ui/asciiModels';

const INVENTORY_SIZE = 4;
const MAP_AREA_X = 40;
const MAP_AREA_Y = 56;
const MAP_AREA_WIDTH = 760;
const MAP_AREA_HEIGHT = 620;
const SIDEBAR_X = 840;
const PANEL_WIDTH = 360;
const PANEL_GAP = 16;
const LOG_PANEL_Y = 56;
const LOG_PANEL_HEIGHT = 170;
const INVENTORY_PANEL_Y = LOG_PANEL_Y + LOG_PANEL_HEIGHT + PANEL_GAP;
const INVENTORY_PANEL_HEIGHT = 238;
const DETAILS_PANEL_Y = INVENTORY_PANEL_Y + INVENTORY_PANEL_HEIGHT + PANEL_GAP;
const DETAILS_PANEL_HEIGHT = 180;
const PANEL_HEADER_HEIGHT = 30;
const PASSIVE_REGEN_INTERVAL = 6;

type CompletionState = 'none' | 'extracted' | 'dead';

type RunSceneData = {
  depth?: number;
  startingInventory?: Array<Item | null>;
  carriedHp?: number;
};

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
  private backdropGraphics!: Phaser.GameObjects.Graphics;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private scanlineGraphics!: Phaser.GameObjects.Graphics;
  private playerRect!: Phaser.GameObjects.Rectangle;
  private mapGlyphTexts: Phaser.GameObjects.Text[] = [];
  private hudText!: Phaser.GameObjects.Text;
  private logTitleText!: Phaser.GameObjects.Text;
  private inventoryTitleText!: Phaser.GameObjects.Text;
  private statusTitleText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private asciiPreviewText!: Phaser.GameObjects.Text;
  private logLines: string[] = [];
  private playerHp = 12;
  private playerStats: PlayerStats = BASE_PLAYER_STATS;
  private currentLevel = 1;
  private currentXp = 0;
  private xpToNextLevel = getXpToNextLevel(1);
  private isRunComplete = false;
  private completionState: CompletionState = 'none';
  private currentDepth = 1;
  private mapWidth = 0;
  private mapHeight = 0;
  private tileSize = 24;
  private mapOriginX = MAP_AREA_X;
  private mapOriginY = MAP_AREA_Y;

  constructor() {
    super('run');
  }

  init(data: RunSceneData): void {
    this.currentDepth = Math.max(1, data.depth ?? 1);
    this.inventory = this.normalizeInventory(data.startingInventory);
    this.playerHp = data.carriedHp ?? BASE_PLAYER_STATS.maxHp;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020604');
    this.backdropGraphics = this.add.graphics();
    drawBackdrop(this.backdropGraphics, GAME_WIDTH, GAME_HEIGHT);

    this.mapGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();
    this.scanlineGraphics = this.add.graphics();

    const frame = this.add.graphics();
    drawScreenFrame(frame, GAME_WIDTH, GAME_HEIGHT);

    this.hudText = this.add.text(40, 16, '', {
      ...createTextStyle('17px', matrixPalette.text),
    });
    applyTextGlow(this.hudText, matrixPalette.accent, 8);

    this.logTitleText = this.add.text(SIDEBAR_X + 16, 61, 'SYS LOG', createTextStyle('15px', matrixPalette.text));

    this.inventoryTitleText = this.add.text(
      SIDEBAR_X + 16,
      INVENTORY_PANEL_Y + 5,
      'STATUS // INVENTORY',
      createTextStyle('15px', matrixPalette.text),
    );

    this.statusTitleText = this.add.text(
      SIDEBAR_X + 16,
      DETAILS_PANEL_Y + 5,
      'COMMANDS // DETAIL',
      createTextStyle('15px', matrixPalette.text),
    );

    this.logText = this.add.text(SIDEBAR_X + 18, LOG_PANEL_Y + PANEL_HEADER_HEIGHT + 12, '', {
      ...createTextStyle('13px', matrixPalette.textDim),
      wordWrap: { width: PANEL_WIDTH - 36 },
      lineSpacing: 1,
    });

    this.inventoryText = this.add.text(SIDEBAR_X + 18, INVENTORY_PANEL_Y + PANEL_HEADER_HEIGHT + 12, '', {
      ...createTextStyle('13px', matrixPalette.text),
      wordWrap: { width: PANEL_WIDTH - 36 },
      lineSpacing: 1,
    });

    this.statusText = this.add.text(SIDEBAR_X + 18, DETAILS_PANEL_Y + PANEL_HEADER_HEIGHT + 12, '', {
      ...createTextStyle('13px', matrixPalette.textDim),
      wordWrap: { width: PANEL_WIDTH - 36 },
      lineSpacing: 1,
    });

    this.asciiPreviewText = this.add.text(
      SIDEBAR_X + 182,
      DETAILS_PANEL_Y + PANEL_HEADER_HEIGHT + 22,
      '',
      {
        ...createTextStyle('15px', matrixPalette.accent, 'center'),
        lineSpacing: 6,
      },
    ).setOrigin(0.5, 0);
    applyTextGlow(this.asciiPreviewText, matrixPalette.accent, 10);

    this.playerRect = this.add.rectangle(0, 0, this.tileSize - 8, this.tileSize - 8, 0x7dff9b, 0.16);
    this.playerRect.setStrokeStyle(1, 0xc8ffd7, 0.7);

    this.setupRun({
      depth: this.currentDepth,
      carryInventory: this.inventory,
      carryHp: this.playerHp,
    });
    this.bindInput();
    drawScanlines(this.scanlineGraphics, GAME_WIDTH, GAME_HEIGHT, 4);
  }

  private normalizeInventory(source?: Array<Item | null>): Array<Item | null> {
    const inventory = Array(INVENTORY_SIZE).fill(null) as Array<Item | null>;

    if (!source) {
      return inventory;
    }

    for (let index = 0; index < Math.min(source.length, INVENTORY_SIZE); index += 1) {
      inventory[index] = source[index] ? cloneItem(source[index] as Item) : null;
    }

    return inventory;
  }

  private setupRun({
    depth,
    carryInventory,
    carryHp,
  }: {
    depth: number;
    carryInventory?: Array<Item | null>;
    carryHp?: number;
  }): void {
    const dungeonConfig = createDungeonConfigForDepth(depth);
    const dungeon = generateDungeon(dungeonConfig);
    const safeSpawnArea = [
      dungeon.playerStart,
      dungeon.objective,
      dungeon.extraction,
      { x: dungeon.playerStart.x + 1, y: dungeon.playerStart.y },
      { x: dungeon.playerStart.x - 1, y: dungeon.playerStart.y },
      { x: dungeon.playerStart.x, y: dungeon.playerStart.y + 1 },
      { x: dungeon.playerStart.x, y: dungeon.playerStart.y - 1 },
    ];

    this.currentDepth = depth;
    this.tiles = dungeon.tiles;
    this.player = { ...dungeon.playerStart };
    this.monsters = spawnMonsters(this.tiles, safeSpawnArea, depth);
    this.groundItems = spawnGroundItems(this.tiles, safeSpawnArea, depth);
    this.inventory = this.normalizeInventory(carryInventory);
    this.selectedSlot = 0;
    this.objectiveCollected = false;
    this.extractionUnlocked = false;
    if (depth === 1) {
      this.currentLevel = 1;
      this.currentXp = 0;
      this.xpToNextLevel = getXpToNextLevel(this.currentLevel);
    }
    this.playerStats = derivePlayerStats(this.inventory, getRunBonusesForLevel(this.currentLevel));
    this.playerHp = Math.min(carryHp ?? this.playerStats.maxHp, this.playerStats.maxHp);
    this.isRunComplete = false;
    this.completionState = 'none';
    this.turnEngine = new TurnEngine();
    this.logLines = [
      `Sei nel livello ${this.currentDepth} dell'archivio.`,
      depth === 1
        ? 'Recupera il reperto, saccheggia e valuta se approfondire o rientrare.'
        : 'Il dungeon si espande. Nemici e corridoi diventano piu letali.',
      'Se torni alla base, tutto cio che porti con te finira nella stash.',
    ];

    this.updateMapMetrics();
    this.drawMap();
    this.updatePlayerVisual();
    this.addLogLines([`Run avviata al livello ${this.currentDepth}.`]);
    this.refreshHud();
  }

  private updateMapMetrics(): void {
    this.mapHeight = this.tiles.length;
    this.mapWidth = this.tiles[0]?.length ?? 0;
    this.tileSize = Math.max(16, Math.floor(Math.min(MAP_AREA_WIDTH / this.mapWidth, MAP_AREA_HEIGHT / this.mapHeight)));

    const mapPixelWidth = this.mapWidth * this.tileSize;
    const mapPixelHeight = this.mapHeight * this.tileSize;
    this.mapOriginX = MAP_AREA_X + Math.floor((MAP_AREA_WIDTH - mapPixelWidth) / 2);
    this.mapOriginY = MAP_AREA_Y + Math.floor((MAP_AREA_HEIGHT - mapPixelHeight) / 2);
    this.playerRect.setSize(this.tileSize - 8, this.tileSize - 8);
  }

  private bindInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isRunComplete) {
        this.handleRunCompleteInput(event.code);
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
          this.scene.start('base');
          break;
        default:
          break;
      }
    });
  }

  private handleRunCompleteInput(code: string): void {
    if (this.completionState === 'extracted') {
      if (code === 'KeyC') {
        this.setupRun({
          depth: this.currentDepth + 1,
          carryInventory: this.inventory,
          carryHp: this.playerHp,
        });
        return;
      }

      if (code === 'KeyB') {
        depositInventoryToStash(this.inventory);
        this.scene.start('base');
        return;
      }
    }

    if (code === 'KeyB') {
      this.scene.start('base');
      return;
    }

    if (code === 'Space') {
      this.scene.start('menu');
    }
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
        ? 'Sei sulla zona di estrazione. Premi E per decidere se continuare o tornare alla base.'
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
      this.completionState = 'extracted';
      this.turnEngine.next('Estrazione raggiunta. Scegli se continuare o tornare alla base.');
      this.addLogLines([
        'Hai raggiunto l\'estrazione con successo.',
        'Premi C per una mappa piu grande e difficile.',
        'Premi B per tornare alla base e depositare tutto nella stash.',
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
    this.recalculatePlayerStats();
    this.resolvePlayerTurn([`Raccogli ${groundItem.item.name} nello slot ${freeSlot + 1}.`]);
  }

  private useSelectedItem(): void {
    const item = this.inventory[this.selectedSlot];
    if (!item) {
      this.addLogLines([`Lo slot ${this.selectedSlot + 1} e vuoto.`]);
      this.refreshHud();
      return;
    }

    if (item.category !== 'consumable') {
      this.addLogLines([`${item.name} e passivo: il bonus resta finche occupa lo slot.`]);
      this.refreshHud();
      return;
    }

    const result = applyItemEffect({
      item,
      playerHp: this.playerHp,
      playerMaxHp: this.playerStats.maxHp,
      playerPosition: this.player,
      monsters: this.monsters,
    });
    if (!result.consumed) {
      this.addLogLines(result.logLines);
      this.refreshHud();
      return;
    }

    this.playerHp = result.nextPlayerHp;
    const bonusLogLines: string[] = [];

    if (item.kind === 'ember-bomb') {
      const adjacentTargets = this.monsters.filter((monster) => isAdjacent(monster.position, this.player));
      for (const monster of adjacentTargets) {
        monster.hp -= item.damageAmount ?? 0;
      }

      const removedMonsters = this.monsters.filter((monster) => result.removedMonsterIds.includes(monster.id));
      this.monsters = this.monsters.filter((monster) => !result.removedMonsterIds.includes(monster.id));

      for (const monster of removedMonsters) {
        this.dropItemFromMonster(monster);
        bonusLogLines.push(...this.grantExperience(monster.expReward));
      }
    }

    this.inventory[this.selectedSlot] = null;
    this.recalculatePlayerStats();
    this.resolvePlayerTurn([...result.logLines, ...bonusLogLines]);
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
    this.recalculatePlayerStats();
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
    if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
      return false;
    }

    return this.tiles[y][x] !== 'wall';
  }

  private drawMap(): void {
    this.mapGraphics.clear();
    this.uiGraphics.clear();
    this.clearMapGlyphs();

    this.uiGraphics.fillStyle(0x08130f, 0.42);
    this.uiGraphics.fillRoundedRect(MAP_AREA_X - 18, MAP_AREA_Y - 18, MAP_AREA_WIDTH + 36, MAP_AREA_HEIGHT + 36, 14);
    this.uiGraphics.lineStyle(2, 0x2a7a4b, 0.5);
    this.uiGraphics.strokeRoundedRect(MAP_AREA_X - 18, MAP_AREA_Y - 18, MAP_AREA_WIDTH + 36, MAP_AREA_HEIGHT + 36, 14);
    this.uiGraphics.lineStyle(1, 0x19412b, 0.22);
    for (let x = MAP_AREA_X; x <= MAP_AREA_X + MAP_AREA_WIDTH; x += 24) {
      this.uiGraphics.lineBetween(x, MAP_AREA_Y, x, MAP_AREA_Y + MAP_AREA_HEIGHT);
    }
    for (let y = MAP_AREA_Y; y <= MAP_AREA_Y + MAP_AREA_HEIGHT; y += 24) {
      this.uiGraphics.lineBetween(MAP_AREA_X, y, MAP_AREA_X + MAP_AREA_WIDTH, y);
    }

    drawTerminalPanel({ graphics: this.uiGraphics, x: SIDEBAR_X, y: LOG_PANEL_Y, width: PANEL_WIDTH, height: LOG_PANEL_HEIGHT, headerHeight: PANEL_HEADER_HEIGHT });
    drawTerminalPanel({
      graphics: this.uiGraphics,
      x: SIDEBAR_X,
      y: INVENTORY_PANEL_Y,
      width: PANEL_WIDTH,
      height: INVENTORY_PANEL_HEIGHT,
      headerHeight: PANEL_HEADER_HEIGHT,
    });
    drawTerminalPanel({
      graphics: this.uiGraphics,
      x: SIDEBAR_X,
      y: DETAILS_PANEL_Y,
      width: PANEL_WIDTH,
      height: DETAILS_PANEL_HEIGHT,
      headerHeight: PANEL_HEADER_HEIGHT,
    });

    for (let y = 0; y < this.mapHeight; y += 1) {
      for (let x = 0; x < this.mapWidth; x += 1) {
        const tile = this.tiles[y][x];
        const color = this.getTileColor(tile);

        this.mapGraphics.fillStyle(color, tile === 'wall' ? 0.82 : 1);
        this.mapGraphics.fillRect(
          this.mapOriginX + x * this.tileSize,
          this.mapOriginY + y * this.tileSize,
          this.tileSize - 1,
          this.tileSize - 1,
        );

        if (tile !== 'wall') {
          this.mapGraphics.fillStyle(0xc8ffd7, tile === 'floor' ? 0.025 : 0.06);
          this.mapGraphics.fillRect(
            this.mapOriginX + x * this.tileSize + 2,
            this.mapOriginY + y * this.tileSize + 2,
            this.tileSize - 5,
            Math.max(2, Math.floor(this.tileSize * 0.12)),
          );
        }
      }
    }

    for (const groundItem of this.groundItems) {
      this.mapGraphics.fillStyle(groundItem.item.color, 1);
      this.mapGraphics.fillCircle(
        this.mapOriginX + groundItem.position.x * this.tileSize + this.tileSize / 2,
        this.mapOriginY + groundItem.position.y * this.tileSize + this.tileSize / 2,
        Math.max(4, Math.floor(this.tileSize * 0.22)),
      );
      this.mapGraphics.lineStyle(1, 0xc8ffd7, 0.35);
      this.mapGraphics.strokeCircle(
        this.mapOriginX + groundItem.position.x * this.tileSize + this.tileSize / 2,
        this.mapOriginY + groundItem.position.y * this.tileSize + this.tileSize / 2,
        Math.max(6, Math.floor(this.tileSize * 0.28)),
      );
      this.addMapGlyph(
        groundItem.position.x,
        groundItem.position.y,
        groundItem.item.glyph,
        `#${groundItem.item.color.toString(16).padStart(6, '0')}`,
        0.92,
      );
    }

    for (const monster of this.monsters) {
      this.mapGraphics.fillStyle(monster.color, 1);
      this.mapGraphics.fillRect(
        this.mapOriginX + monster.position.x * this.tileSize + 4,
        this.mapOriginY + monster.position.y * this.tileSize + 4,
        this.tileSize - 8,
        this.tileSize - 8,
      );
      this.mapGraphics.lineStyle(1, 0x020604, 0.7);
      this.mapGraphics.strokeRect(
        this.mapOriginX + monster.position.x * this.tileSize + 4,
        this.mapOriginY + monster.position.y * this.tileSize + 4,
        this.tileSize - 8,
        this.tileSize - 8,
      );
      this.addMapGlyph(monster.position.x, monster.position.y, monster.glyph, `#${monster.color.toString(16).padStart(6, '0')}`);
    }

    for (let y = 0; y < this.mapHeight; y += 1) {
      for (let x = 0; x < this.mapWidth; x += 1) {
        const tile = this.tiles[y][x];

        if (tile === 'objective') {
          this.addMapGlyph(x, y, '!', matrixPalette.warning, 0.88);
        } else if (tile === 'extraction') {
          this.addMapGlyph(x, y, '>', this.extractionUnlocked ? matrixPalette.danger : matrixPalette.textMuted, 0.88);
        }
      }
    }

    this.addMapGlyph(this.player.x, this.player.y, PLAYER_GLYPH, matrixPalette.accent, 1);
  }

  private getTileColor(tile: TileType): number {
    switch (tile) {
      case 'wall':
        return 0x08110d;
      case 'floor':
        return 0x103222;
      case 'objective':
        return 0xd7ff6c;
      case 'extraction':
        return this.extractionUnlocked ? 0x66ffcc : 0x295344;
      default:
        return 0xffffff;
    }
  }

  private updatePlayerVisual(): void {
    this.playerRect.setPosition(
      this.mapOriginX + this.player.x * this.tileSize + this.tileSize / 2,
      this.mapOriginY + this.player.y * this.tileSize + this.tileSize / 2,
    );
  }

  private refreshHud(): void {
    this.hudText.setText(
      [
        `Livello: ${this.currentDepth}`,
        `LVL: ${this.currentLevel}`,
        `EXP: ${this.currentXp}/${this.xpToNextLevel}`,
        `Mappa: ${this.mapWidth}x${this.mapHeight}`,
        `HP: ${this.playerHp}/${this.playerStats.maxHp}`,
        `ATT: ${this.playerStats.attackMin}-${this.playerStats.attackMax}`,
        `ARM: ${this.playerStats.armor}`,
        `Reperto: ${this.objectiveCollected ? 'RECUPERATO' : 'MANCANTE'}`,
        `Mostri: ${this.monsters.length}`,
      ].join('   |   '),
    );

    this.inventoryText.setText(this.buildInventoryText());
    this.statusText.setText(this.buildStatusText());
    this.asciiPreviewText.setText(this.buildAsciiPreviewText());
    this.updateLog();
  }

  private updateLog(): void {
    this.logText.setText(this.logLines.join('\n'));
  }

  private buildInventoryText(): string {
    const lines = [
      `Integrita ${this.playerHp}/${this.playerStats.maxHp}`,
      `Livello ${this.currentLevel}   EXP ${this.currentXp}/${this.xpToNextLevel}`,
      `Danno ${this.playerStats.attackMin}-${this.playerStats.attackMax}`,
      `Armatura ${this.playerStats.armor}`,
      '',
      'INVENTARIO ATTIVO',
    ];

    for (let index = 0; index < INVENTORY_SIZE; index += 1) {
      const item = this.inventory[index];
      const marker = index === this.selectedSlot ? '[>]' : '[ ]';
      const itemLabel = item ? `${item.name}${this.getPassiveTag(item)}` : '(vuoto)';
      lines.push(`${marker} [${index + 1}] ${itemLabel}`);
    }

    const groundItem = this.getGroundItemAt(this.player.x, this.player.y);
    lines.push('');
    lines.push('A TERRA');
    lines.push(groundItem ? `${groundItem.item.name}` : '(nulla)');

    return lines.join('\n');
  }

  private buildStatusText(): string {
    if (this.isRunComplete && this.completionState === 'extracted') {
      return [
        'ESTRAZIONE RIUSCITA',
        'C continua in un livello piu difficile',
        'B torna alla base e deposita la run',
        '',
        'Se torni alla base, tutti gli oggetti portati vengono messi nella stash.',
      ].join('\n');
    }

    if (this.isRunComplete && this.completionState === 'dead') {
      return [
        'SEI MORTO',
        'Gli oggetti equipaggiati in questa run sono persi.',
        'B torna alla base',
        'SPACE torna al menu',
      ].join('\n');
    }

    const selectedItem = this.inventory[this.selectedSlot];
    const groundItem = this.getGroundItemAt(this.player.x, this.player.y);
    const nearbyMonster = this.monsters.find((monster) => isAdjacent(monster.position, this.player));

    return [
      'G raccogli da terra',
      'F usa consumabile',
      'Q lascia oggetto',
      'TAB / 1-4 cambia slot',
      'E estrai quando l\'uscita e attiva',
      'R torna alla base subito',
      '',
      'PROGRESSIONE',
      `LVL ${this.currentLevel}   EXP ${this.currentXp}/${this.xpToNextLevel}`,
      `Rigenerazione passiva: +1 HP ogni ${PASSIVE_REGEN_INTERVAL} turni fuori dal combat`,
      '',
      'DETTAGLIO SLOT',
      selectedItem ? getItemAsciiLabel(selectedItem) : '...  (vuoto)',
      selectedItem ? selectedItem.description : 'Seleziona uno slot pieno per usarlo.',
      '',
      'SEGNALI LOCALI',
      nearbyMonster ? `${nearbyMonster.glyph}  ${nearbyMonster.name}` : groundItem ? `${groundItem.item.glyph}  ${groundItem.item.name}` : 'nessun contatto',
    ].join('\n');
  }

  private buildAsciiPreviewText(): string {
    const selectedItem = this.inventory[this.selectedSlot];
    const nearbyMonster = this.monsters.find((monster) => isAdjacent(monster.position, this.player));
    const groundItem = this.getGroundItemAt(this.player.x, this.player.y);

    if (selectedItem) {
      return getItemAsciiArt(selectedItem.kind);
    }

    if (nearbyMonster) {
      return getMonsterAsciiArt(nearbyMonster.kind);
    }

    if (groundItem) {
      return getItemAsciiArt(groundItem.item.kind);
    }

    return PLAYER_ASCII_ART;
  }

  private addMapGlyph(x: number, y: number, glyph: string, color: string, alpha = 1): void {
    const text = this.add.text(
      this.mapOriginX + x * this.tileSize + this.tileSize / 2,
      this.mapOriginY + y * this.tileSize + this.tileSize / 2,
      glyph,
      {
        ...createTextStyle(`${Math.max(14, Math.floor(this.tileSize * 0.72))}px`, color, 'center'),
      },
    );

    text.setOrigin(0.5);
    text.setAlpha(alpha);
    text.setShadow(0, 0, color, 8, true, true);
    this.mapGlyphTexts.push(text);
  }

  private clearMapGlyphs(): void {
    for (const text of this.mapGlyphTexts) {
      text.destroy();
    }

    this.mapGlyphTexts = [];
  }

  private getPassiveTag(item: Item): string {
    if (item.category === 'weapon') {
      return ` (+${item.attackBonus ?? 0} att)`;
    }

    if (item.category === 'armor') {
      return ` (+${item.armorBonus ?? 0} arm)`;
    }

    return '';
  }

  private recalculatePlayerStats(): void {
    const previousMaxHp = this.playerStats.maxHp;
    this.playerStats = derivePlayerStats(this.inventory, getRunBonusesForLevel(this.currentLevel));

    if (this.playerStats.maxHp !== previousMaxHp) {
      this.playerHp = Math.min(this.playerHp, this.playerStats.maxHp);
    }
  }

  private resolvePlayerTurn(logLines: string[]): void {
    if (this.isRunComplete) {
      return;
    }

    this.turnEngine.next(logLines[0] ?? 'Azione');
    const monsterLogLines = this.runMonsterTurn();
    const combatTriggeredThisTurn = this.didCombatHappenThisTurn(logLines, monsterLogLines);
    const regenLogLines = this.applyPassiveRegen(combatTriggeredThisTurn);

    this.updatePlayerVisual();
    this.drawMap();
    this.addLogLines([...logLines, ...monsterLogLines, ...regenLogLines]);
    this.refreshHud();
  }

  private addLogLines(lines: string[]): void {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      this.logLines.unshift(lines[index]);
    }

    this.logLines = this.logLines.slice(0, 6);
  }

  private getMonsterAt(x: number, y: number): Monster | undefined {
    return this.monsters.find((monster) => monster.position.x === x && monster.position.y === y);
  }

  private getGroundItemAt(x: number, y: number): GroundItem | undefined {
    return this.groundItems.find((entry) => entry.position.x === x && entry.position.y === y);
  }

  private attackMonster(monster: Monster): string[] {
    const damage = rollDamage(this.playerStats.attackMin, this.playerStats.attackMax);
    monster.hp -= damage;

    if (monster.hp <= 0) {
      this.monsters = this.monsters.filter((candidate) => candidate.id !== monster.id);
      this.dropItemFromMonster(monster);
      return [
        `Colpisci ${monster.name} per ${damage} e lo abbatti.`,
        ...this.grantExperience(monster.expReward),
      ];
    }

    return [`Colpisci ${monster.name} per ${damage}. Gli restano ${monster.hp} HP.`];
  }

  private dropItemFromMonster(monster: Monster): void {
    const droppedItem = rollMonsterDrop();
    if (!droppedItem) {
      return;
    }

    if (Math.random() > 0.5 || this.getGroundItemAt(monster.position.x, monster.position.y)) {
      return;
    }

    this.groundItems.push({
      item: droppedItem,
      position: { ...monster.position },
    });

    this.addLogLines([`${monster.name} lascia ${droppedItem.name}.`]);
  }

  private grantExperience(amount: number): string[] {
    const logLines = [`Ottieni ${amount} EXP.`];
    this.currentXp += amount;

    while (this.currentXp >= this.xpToNextLevel) {
      this.currentXp -= this.xpToNextLevel;
      this.currentLevel += 1;
      this.xpToNextLevel = getXpToNextLevel(this.currentLevel);
      this.recalculatePlayerStats();
      this.playerHp = Math.min(this.playerStats.maxHp, this.playerHp + 2);
      logLines.push(
        `LEVEL UP -> ${this.currentLevel}: statistiche migliorate.`,
        `Ora hai HP ${this.playerStats.maxHp}, ATT ${this.playerStats.attackMin}-${this.playerStats.attackMax}, ARM ${this.playerStats.armor}.`,
      );
    }

    return logLines;
  }

  private applyPassiveRegen(combatTriggeredThisTurn: boolean): string[] {
    if (this.isRunComplete || this.playerHp >= this.playerStats.maxHp) {
      return [];
    }

    if (combatTriggeredThisTurn || !this.isOutOfCombat()) {
      return [];
    }

    if (this.turnEngine.currentTurn % PASSIVE_REGEN_INTERVAL !== 0) {
      return [];
    }

    this.playerHp = Math.min(this.playerStats.maxHp, this.playerHp + 1);
    return ['Rigenerazione passiva: recuperi 1 HP.'];
  }

  private isOutOfCombat(): boolean {
    return this.monsters.every((monster) => {
      const distanceToPlayer =
        Math.abs(monster.position.x - this.player.x) + Math.abs(monster.position.y - this.player.y);

      return distanceToPlayer > monster.alertRange;
    });
  }

  private didCombatHappenThisTurn(playerLogLines: string[], monsterLogLines: string[]): boolean {
    if (monsterLogLines.length > 0) {
      return true;
    }

    return playerLogLines.some((line) =>
      line.startsWith('Colpisci') ||
      line.startsWith('Attivi ') ||
      line.includes('LEVEL UP ->'),
    );
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
    const incomingDamage = rollDamage(monster.damageMin, monster.damageMax);
    const mitigatedDamage = Math.max(1, incomingDamage - this.playerStats.armor);
    this.playerHp = Math.max(0, this.playerHp - mitigatedDamage);

    if (this.playerHp === 0) {
      this.isRunComplete = true;
      this.completionState = 'dead';
      logLines.push(`${monster.name} ti infligge ${mitigatedDamage} danni. Sei morto nell'archivio.`);
      logLines.push('Premi B per tornare alla base. Gli oggetti della run sono persi.');
      return;
    }

    logLines.push(`${monster.name} ti colpisce per ${mitigatedDamage}. Ti restano ${this.playerHp} HP.`);
  }
}
