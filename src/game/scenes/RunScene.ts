import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  getRandomNeighborSteps,
  getStepTowardTarget,
  isAdjacent,
  isBossDepth,
  isFinalDepth,
  MAX_DUNGEON_DEPTH,
  rollDamage,
  spawnMonsters,
  type Monster,
} from '../combat/monsters';
import { TurnEngine } from '../core/TurnEngine';
import { applyItemEffect } from '../items/itemEffects';
import {
  BASE_INVENTORY_SIZE,
  cloneItem,
  getInventorySizeBonus,
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
const PANEL_BODY_X = SIDEBAR_X + 18;
const PANEL_BODY_WIDTH = PANEL_WIDTH - 36;
const LOG_BODY_Y = LOG_PANEL_Y + PANEL_HEADER_HEIGHT + 12;
const LOG_BODY_HEIGHT = LOG_PANEL_HEIGHT - PANEL_HEADER_HEIGHT - 26;
const INVENTORY_BODY_Y = INVENTORY_PANEL_Y + PANEL_HEADER_HEIGHT + 12;
const INVENTORY_BODY_HEIGHT = INVENTORY_PANEL_HEIGHT - PANEL_HEADER_HEIGHT - 26;
const DETAILS_BODY_X = SIDEBAR_X + 18;
const DETAILS_BODY_Y = DETAILS_PANEL_Y + PANEL_HEADER_HEIGHT + 12;
const DETAILS_BODY_WIDTH = PANEL_WIDTH - 36;
const DETAILS_BODY_HEIGHT = DETAILS_PANEL_HEIGHT - PANEL_HEADER_HEIGHT - 26;
const DETAILS_LEFT_WIDTH = 168;
const DETAILS_COLUMN_GAP = 12;
const DETAILS_PREVIEW_X = DETAILS_BODY_X + DETAILS_LEFT_WIDTH + DETAILS_COLUMN_GAP + 72;
const DETAILS_FOOTER_Y = DETAILS_BODY_Y + 88;
const DETAILS_FOOTER_HEIGHT = DETAILS_BODY_HEIGHT - (DETAILS_FOOTER_Y - DETAILS_BODY_Y);
const MAX_LOG_HISTORY = 200;
const PANEL_SCROLL_STEP = 28;

type CompletionState = 'none' | 'extracted' | 'dead' | 'victory';

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
  private inventory: Array<Item | null> = Array(BASE_INVENTORY_SIZE).fill(null);
  private selectedSlot = 0;
  private objectiveCollected = false;
  private extractionUnlocked = false;
  private isBossFloor = false;
  private isFinalFloor = false;
  private bossDefeated = false;
  private bossMonsterId: string | null = null;
  private turnEngine = new TurnEngine();
  private backdropGraphics!: Phaser.GameObjects.Graphics;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private scanlineGraphics!: Phaser.GameObjects.Graphics;
  private playerRect!: Phaser.GameObjects.Rectangle;
  private mapGlyphTexts: Phaser.GameObjects.Text[] = [];
  private panelMaskGraphics: Phaser.GameObjects.Graphics[] = [];
  private hudText!: Phaser.GameObjects.Text;
  private logTitleText!: Phaser.GameObjects.Text;
  private inventoryTitleText!: Phaser.GameObjects.Text;
  private statusTitleText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private statusDetailText!: Phaser.GameObjects.Text;
  private asciiPreviewText!: Phaser.GameObjects.Text;
  private logLines: string[] = [];
  private logScrollOffset = 0;
  private statusDetailScrollOffset = 0;
  private lastStatusDetailContent = '';
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
    this.currentDepth = Phaser.Math.Clamp(data.depth ?? 1, 1, MAX_DUNGEON_DEPTH);
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

    this.logTitleText = this.add.text(
      SIDEBAR_X + 16,
      61,
      'SYS LOG // WHEEL',
      createTextStyle('15px', matrixPalette.text),
    );

    this.inventoryTitleText = this.add.text(
      SIDEBAR_X + 16,
      INVENTORY_PANEL_Y + 5,
      'STATUS // INVENTORY',
      createTextStyle('15px', matrixPalette.text),
    );

    this.statusTitleText = this.add.text(
      SIDEBAR_X + 16,
      DETAILS_PANEL_Y + 5,
      'COMMANDS // DETAIL // WHEEL',
      createTextStyle('15px', matrixPalette.text),
    );

    this.logText = this.add.text(PANEL_BODY_X, LOG_BODY_Y, '', {
      ...createTextStyle('13px', matrixPalette.textDim),
      wordWrap: { width: PANEL_BODY_WIDTH, useAdvancedWrap: true },
      lineSpacing: 1,
    });
    this.constrainTextToPanel(this.logText, PANEL_BODY_X, LOG_BODY_Y, PANEL_BODY_WIDTH, LOG_BODY_HEIGHT);

    this.inventoryText = this.add.text(PANEL_BODY_X, INVENTORY_BODY_Y, '', {
      ...createTextStyle('13px', matrixPalette.text),
      wordWrap: { width: PANEL_BODY_WIDTH, useAdvancedWrap: true },
      lineSpacing: 1,
    });
    this.constrainTextToPanel(
      this.inventoryText,
      PANEL_BODY_X,
      INVENTORY_BODY_Y,
      PANEL_BODY_WIDTH,
      INVENTORY_BODY_HEIGHT,
    );

    this.statusText = this.add.text(DETAILS_BODY_X, DETAILS_BODY_Y, '', {
      ...createTextStyle('13px', matrixPalette.textDim),
      wordWrap: { width: DETAILS_LEFT_WIDTH, useAdvancedWrap: true },
      lineSpacing: 2,
    });
    this.constrainTextToPanel(this.statusText, DETAILS_BODY_X, DETAILS_BODY_Y, DETAILS_LEFT_WIDTH, 82);

    this.statusDetailText = this.add.text(DETAILS_BODY_X, DETAILS_FOOTER_Y, '', {
      ...createTextStyle('12px', matrixPalette.textDim),
      wordWrap: { width: DETAILS_BODY_WIDTH, useAdvancedWrap: true },
      lineSpacing: 2,
    });
    this.constrainTextToPanel(
      this.statusDetailText,
      DETAILS_BODY_X,
      DETAILS_FOOTER_Y,
      DETAILS_BODY_WIDTH,
      DETAILS_FOOTER_HEIGHT,
    );

    this.asciiPreviewText = this.add.text(
      DETAILS_PREVIEW_X,
      DETAILS_BODY_Y + 8,
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
    const sourceItems = (source ?? []).filter((item): item is Item => item !== null);
    const derivedSize = BASE_INVENTORY_SIZE + getInventorySizeBonus(sourceItems);
    const targetSize = Math.max(BASE_INVENTORY_SIZE, derivedSize, source?.length ?? 0);
    const inventory = Array(targetSize).fill(null) as Array<Item | null>;

    if (!source) {
      return inventory;
    }

    for (let index = 0; index < Math.min(source.length, targetSize); index += 1) {
      inventory[index] = source[index] ? cloneItem(source[index] as Item) : null;
    }

    return inventory;
  }

  private getInventorySize(): number {
    return this.playerStats.inventorySize;
  }

  private getOccupiedSlots(): number {
    return this.inventory.filter((item) => item !== null).length;
  }

  private syncInventoryCapacity(): void {
    const targetSize = this.getInventorySize();

    if (this.inventory.length < targetSize) {
      this.inventory = [...this.inventory, ...Array(targetSize - this.inventory.length).fill(null)];
    } else if (this.inventory.length > targetSize) {
      this.inventory = this.inventory.slice(0, targetSize);
    }

    this.selectedSlot = Phaser.Math.Clamp(this.selectedSlot, 0, Math.max(0, targetSize - 1));
  }

  private canRemoveItemWithoutOverflow(item: Item): boolean {
    const nextInventorySize = BASE_INVENTORY_SIZE + getInventorySizeBonus(
      this.inventory.filter((entry) => entry !== null && entry.id !== item.id),
    );

    return this.getOccupiedSlots() - 1 <= nextInventorySize;
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
    const clampedDepth = Phaser.Math.Clamp(depth, 1, MAX_DUNGEON_DEPTH);
    const dungeonConfig = createDungeonConfigForDepth(clampedDepth);
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

    this.currentDepth = clampedDepth;
    this.tiles = dungeon.tiles;
    this.isBossFloor = isBossDepth(clampedDepth);
    this.isFinalFloor = isFinalDepth(clampedDepth);

    if (this.isBossFloor) {
      this.tiles[dungeon.objective.y][dungeon.objective.x] = 'floor';
    }

    this.player = { ...dungeon.playerStart };
    this.monsters = spawnMonsters(this.tiles, safeSpawnArea, clampedDepth);
    this.groundItems = spawnGroundItems(this.tiles, safeSpawnArea, clampedDepth);
    this.inventory = this.normalizeInventory(carryInventory);
    this.selectedSlot = 0;
    this.objectiveCollected = this.isBossFloor;
    this.extractionUnlocked = false;
    this.bossDefeated = false;
    this.bossMonsterId = this.monsters.find((monster) => monster.isBoss)?.id ?? null;
    if (clampedDepth === 1) {
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
      this.getDepthIntroLine(),
      this.getDepthObjectiveLine(),
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
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9':
          this.selectInventorySlot(Number(event.code.replace('Digit', '')) - 1);
          break;
        case 'KeyR':
          this.scene.start('base');
          break;
        default:
          break;
      }
    });

    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _currentlyOver: unknown,
        _deltaX: number,
        deltaY: number,
      ) => {
        if (this.isPointerInsidePanel(pointer, PANEL_BODY_X, LOG_BODY_Y, PANEL_BODY_WIDTH, LOG_BODY_HEIGHT)) {
          this.scrollLog(deltaY);
          return;
        }

        if (this.isPointerInsidePanel(pointer, DETAILS_BODY_X, DETAILS_FOOTER_Y, DETAILS_BODY_WIDTH, DETAILS_FOOTER_HEIGHT)) {
          this.scrollStatusDetail(deltaY);
        }
      },
    );
  }

  private constrainTextToPanel(
    text: Phaser.GameObjects.Text,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    text.setFixedSize(width, height);
    text.setPadding(0, 0, 0, 0);
    text.setMask(this.createPanelMask(x, y, width, height));
  }

  private createPanelMask(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.Display.Masks.GeometryMask {
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(x, y, width, height);
    maskShape.setVisible(false);
    this.panelMaskGraphics.push(maskShape);
    return maskShape.createGeometryMask();
  }

  private isPointerInsidePanel(
    pointer: Phaser.Input.Pointer,
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean {
    return Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(x, y, width, height), pointer.x, pointer.y);
  }

  private syncLogScroll(): void {
    this.logScrollOffset = Phaser.Math.Clamp(this.logScrollOffset, 0, this.getMaxScroll(this.logText, LOG_BODY_HEIGHT));
    this.logText.setY(LOG_BODY_Y - this.logScrollOffset);
  }

  private syncStatusDetailScroll(): void {
    this.statusDetailScrollOffset = Phaser.Math.Clamp(
      this.statusDetailScrollOffset,
      0,
      this.getMaxScroll(this.statusDetailText, DETAILS_FOOTER_HEIGHT),
    );
    this.statusDetailText.setY(DETAILS_FOOTER_Y - this.statusDetailScrollOffset);
  }

  private getMaxScroll(text: Phaser.GameObjects.Text, viewportHeight: number): number {
    return Math.max(0, text.height - viewportHeight);
  }

  private isLogNearBottom(): boolean {
    return this.logScrollOffset >= this.getMaxScroll(this.logText, LOG_BODY_HEIGHT) - 4;
  }

  private scrollLog(deltaY: number): void {
    this.logScrollOffset += deltaY > 0 ? PANEL_SCROLL_STEP : -PANEL_SCROLL_STEP;
    this.syncLogScroll();
  }

  private scrollStatusDetail(deltaY: number): void {
    this.statusDetailScrollOffset += deltaY > 0 ? PANEL_SCROLL_STEP : -PANEL_SCROLL_STEP;
    this.syncStatusDetailScroll();
  }

  private handleRunCompleteInput(code: string): void {
    if (this.completionState === 'extracted') {
      if (code === 'KeyC') {
        if (this.currentDepth >= MAX_DUNGEON_DEPTH) {
          return;
        }

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

    if (this.completionState === 'victory') {
      if (code === 'KeyB') {
        depositInventoryToStash(this.inventory);
        this.scene.start('base');
      }
      return;
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
        : this.isBossFloor
          ? 'L\'estrazione e sigillata. Il boss di piano e ancora vivo.'
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
      const completionLines = this.currentDepth < MAX_DUNGEON_DEPTH
        ? [
            'Hai raggiunto l\'estrazione con successo.',
            'Premi C per una mappa piu grande e difficile.',
            'Premi B per tornare alla base e depositare tutto nella stash.',
          ]
        : [
            'Hai completato il dodicesimo livello.',
            'Non ci sono altri piani oltre questo archivio.',
            'Premi B per tornare alla base e depositare tutto nella stash.',
          ];

      this.addLogLines([
        ...completionLines,
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
      this.addLogLines([`Inventario pieno. Hai solo ${this.getInventorySize()} slot attivi in questa run.`]);
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

    if (item.category === 'backpack' && !this.canRemoveItemWithoutOverflow(item)) {
      this.addLogLines(['Non puoi rimuovere questo zaino: perderesti slot ancora occupati.']);
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

    if ((item.damageAmount ?? 0) > 0) {
      const adjacentTargets = this.monsters.filter((monster) => isAdjacent(monster.position, this.player));
      for (const monster of adjacentTargets) {
        monster.hp -= item.damageAmount ?? 0;
      }

      const removedMonsters = this.monsters.filter((monster) => result.removedMonsterIds.includes(monster.id));
      this.monsters = this.monsters.filter((monster) => !result.removedMonsterIds.includes(monster.id));

      for (const monster of removedMonsters) {
        this.dropItemFromMonster(monster);
        bonusLogLines.push(
          ...this.handleMonsterDefeat(monster, this.grantExperience(monster.expReward)),
        );
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

    if (item.category === 'backpack' && !this.canRemoveItemWithoutOverflow(item)) {
      this.addLogLines(['Non puoi lasciare questo zaino: perderesti slot ancora occupati.']);
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
    this.selectedSlot = (this.selectedSlot + 1) % this.getInventorySize();
    this.addLogLines([`Slot attivo: ${this.selectedSlot + 1}.`]);
    this.refreshHud();
  }

  private selectInventorySlot(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= this.getInventorySize()) {
      return;
    }

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
        `SLOT: ${this.getOccupiedSlots()}/${this.getInventorySize()}`,
        this.getObjectiveHudLabel(),
        `Mostri: ${this.monsters.length}`,
      ].join('   |   '),
    );

    this.inventoryText.setText(this.buildInventoryText());
    this.statusText.setText(this.buildStatusText());
    const nextStatusDetail = this.buildStatusDetailText();
    const hasStatusDetailChanged = nextStatusDetail !== this.lastStatusDetailContent;
    this.lastStatusDetailContent = nextStatusDetail;
    this.statusDetailText.setText(nextStatusDetail);
    if (hasStatusDetailChanged) {
      this.statusDetailScrollOffset = 0;
    }
    this.syncStatusDetailScroll();
    this.asciiPreviewText.setText(this.buildAsciiPreviewText());
    this.updateLog();
  }

  private updateLog(): void {
    this.logText.setText(this.logLines.join('\n'));
    this.syncLogScroll();
  }

  private buildInventoryText(): string {
    const lines = [
      `Integrita ${this.playerHp}/${this.playerStats.maxHp}`,
      `Livello ${this.currentLevel}   EXP ${this.currentXp}/${this.xpToNextLevel}`,
      `Danno ${this.playerStats.attackMin}-${this.playerStats.attackMax}`,
      `Armatura ${this.playerStats.armor}`,
      `Capienza ${this.getOccupiedSlots()}/${this.getInventorySize()}`,
      '',
      'INVENTARIO ATTIVO',
    ];

    for (let index = 0; index < this.getInventorySize(); index += 1) {
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
      const extractionOptions = this.currentDepth < MAX_DUNGEON_DEPTH
        ? 'C continua in un livello piu difficile'
        : 'B torna alla base e chiude la spedizione';

      return [
        'ESTRAZIONE',
        extractionOptions,
        'B deposita la run',
      ].join('\n');
    }

    if (this.isRunComplete && this.completionState === 'victory') {
      return [
        'VITTORIA',
        'B boss finale abbattuto',
        'B torna alla base',
      ].join('\n');
    }

    if (this.isRunComplete && this.completionState === 'dead') {
      return [
        'RUN FALLITA',
        'B torna alla base',
        'SPACE torna al menu',
      ].join('\n');
    }

    return [
      'COMANDI',
      'G raccogli',
      'F usa consumabile',
      'Q lascia oggetto',
      `TAB / 1-${this.getInventorySize()} cambia slot`,
      this.isFinalFloor ? 'E boss finale attivo' : 'E estrai se uscita attiva',
      'R torna alla base',
    ].join('\n');
  }

  private buildStatusDetailText(): string {
    if (this.isRunComplete && this.completionState === 'extracted') {
      return [
        'RUN SALVATA',
        'Gli oggetti portati vengono messi nella stash quando rientri alla base.',
      ].join('\n');
    }

    if (this.isRunComplete && this.completionState === 'victory') {
      return [
        'ARCHIVIO COLLASSATO',
        'La spedizione termina qui e tutto il bottino viene depositato nella stash.',
      ].join('\n');
    }

    if (this.isRunComplete && this.completionState === 'dead') {
      return [
        'STATO',
        'Gli oggetti equipaggiati in questa run sono persi.',
      ].join('\n');
    }

    const selectedItem = this.inventory[this.selectedSlot];
    const groundItem = this.getGroundItemAt(this.player.x, this.player.y);
    const nearbyMonster = this.monsters.find((monster) => isAdjacent(monster.position, this.player));
    const contactLabel = nearbyMonster
      ? `${nearbyMonster.glyph}  ${nearbyMonster.name}`
      : groundItem
        ? `${groundItem.item.glyph}  ${groundItem.item.name}`
        : 'nessun contatto';

    return [
      'PROGRESSIONE',
      `LVL ${this.currentLevel}   EXP ${this.currentXp}/${this.xpToNextLevel}`,
      `SLOT ${selectedItem ? getItemAsciiLabel(selectedItem) : '...  (vuoto)'}`,
      selectedItem ? selectedItem.description : 'Seleziona uno slot pieno per usarlo.',
      `SEGNALI ${contactLabel}`,
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

    if (item.category === 'backpack') {
      return ` (+${item.inventoryBonus ?? 0} slot run)`;
    }

    return '';
  }

  private recalculatePlayerStats(): void {
    const previousMaxHp = this.playerStats.maxHp;
    this.playerStats = derivePlayerStats(this.inventory, getRunBonusesForLevel(this.currentLevel));
    this.syncInventoryCapacity();

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

    this.updatePlayerVisual();
    this.drawMap();
    this.addLogLines([...logLines, ...monsterLogLines]);
    this.refreshHud();
  }

  private addLogLines(lines: string[]): void {
    const shouldStickToBottom = this.isLogNearBottom();
    this.logLines.push(...lines);
    if (this.logLines.length > MAX_LOG_HISTORY) {
      this.logLines = this.logLines.slice(this.logLines.length - MAX_LOG_HISTORY);
    }
    this.logText.setText(this.logLines.join('\n'));
    if (shouldStickToBottom) {
      this.logScrollOffset = this.getMaxScroll(this.logText, LOG_BODY_HEIGHT);
    }
    this.syncLogScroll();
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
      return this.handleMonsterDefeat(monster, [
        `Colpisci ${monster.name} per ${damage} e lo abbatti.`,
        ...this.grantExperience(monster.expReward),
      ]);
    }

    return [`Colpisci ${monster.name} per ${damage}. Gli restano ${monster.hp} HP.`];
  }

  private dropItemFromMonster(monster: Monster): void {
    const droppedItem = rollMonsterDrop(this.currentDepth);
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

  private handleMonsterDefeat(monster: Monster, logLines: string[]): string[] {
    if (!monster.isBoss || monster.id !== this.bossMonsterId) {
      return logLines;
    }

    this.bossDefeated = true;
    this.extractionUnlocked = !this.isFinalFloor;

    if (this.isFinalFloor) {
      this.isRunComplete = true;
      this.completionState = 'victory';
      return [
        ...logLines,
        'Il boss finale crolla. L archivio entra in lockdown.',
        'Premi B per tornare alla stash con il bottino della spedizione.',
      ];
    }

    return [
      ...logLines,
      'Il boss del piano e caduto.',
      'L estrazione ora e aperta: raggiungila e premi E per decidere se proseguire o rientrare.',
    ];
  }

  private getObjectiveHudLabel(): string {
    if (this.isFinalFloor) {
      return `Boss finale: ${this.bossDefeated ? 'ABBATTUTO' : 'ATTIVO'}`;
    }

    if (this.isBossFloor) {
      return `Boss: ${this.bossDefeated ? 'ABBATTUTO' : 'ATTIVO'}`;
    }

    return `Reperto: ${this.objectiveCollected ? 'RECUPERATO' : 'MANCANTE'}`;
  }

  private getDepthIntroLine(): string {
    if (this.isFinalFloor) {
      return 'Ultimo piano: il sovrintendente ti aspetta e non esiste un livello successivo.';
    }

    if (this.isBossFloor) {
      return 'Questo e un piano di boss. Per chiuderlo devi abbattere il custode.';
    }

    if (this.currentDepth === 1) {
      return 'Recupera il reperto, saccheggia e valuta se approfondire o rientrare.';
    }

    return 'Il dungeon si espande. Nemici e corridoi diventano piu letali.';
  }

  private getDepthObjectiveLine(): string {
    if (this.isFinalFloor) {
      return 'Sconfiggi il boss finale e sarai costretto a rientrare alla stash.';
    }

    if (this.isBossFloor) {
      return 'Finche il boss resta vivo, l estrazione del piano rimane sigillata.';
    }

    return 'Trova il reperto per aprire l uscita di estrazione.';
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
