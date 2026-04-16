import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { TurnEngine } from '../core/TurnEngine';
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

export class RunScene extends Phaser.Scene {
  private tiles: TileGrid = [];
  private player!: Point;
  private objectiveCollected = false;
  private extractionUnlocked = false;
  private turnEngine = new TurnEngine();
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private playerRect!: Phaser.GameObjects.Rectangle;
  private hudText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private logLines: string[] = [];
  private isRunComplete = false;

  constructor() {
    super('run');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#050608');
    this.mapGraphics = this.add.graphics();

    this.hudText = this.add.text(40, 16, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8e0ea',
    });

    this.logText = this.add.text(GAME_WIDTH - 270, 60, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fb0c2',
      wordWrap: { width: 220 },
    });

    this.playerRect = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, 0x8be9fd);

    this.setupRun();
    this.bindInput();
  }

  private setupRun(): void {
    const dungeon = generateDungeon();
    this.tiles = dungeon.tiles;
    this.player = { ...dungeon.playerStart };
    this.objectiveCollected = false;
    this.extractionUnlocked = false;
    this.isRunComplete = false;
    this.turnEngine = new TurnEngine();
    this.logLines = [
      'Sei entrato nell\'archivio.',
      'Recupera il reperto (!) e raggiungi l\'uscita (>).',
    ];

    this.drawMap();
    this.updatePlayerVisual();
    this.refreshHud('Run avviata');
  }

  private bindInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isRunComplete) {
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

    if (!this.isWalkable(next.x, next.y)) {
      this.refreshHud(this.turnEngine.next('Urti contro il muro.').logLine);
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
    }

    this.updatePlayerVisual();
    this.drawMap();
    this.refreshHud(this.turnEngine.next(logLine).logLine);
  }

  private interact(): void {
    const tile = this.tiles[this.player.y][this.player.x];

    if (tile === 'extraction' && this.extractionUnlocked) {
      this.isRunComplete = true;
      this.refreshHud(this.turnEngine.next('Estrazione completata. Sei sopravvissuto.').logLine);
      this.logLines.unshift('Premi SPACE per tornare al menu.');
      this.updateLog();
      return;
    }

    this.refreshHud(this.turnEngine.next('Qui non c\'e nulla da attivare.').logLine);
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
      return false;
    }

    const tile = this.tiles[y][x];
    return tile !== 'wall';
  }

  private drawMap(): void {
    this.mapGraphics.clear();

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

  private refreshHud(logLine: string): void {
    this.logLines.unshift(logLine);
    this.logLines = this.logLines.slice(0, 8);
    this.updateLog();

    this.hudText.setText(
      [
        `Turno: ${this.turnEngine.currentTurn}`,
        `Reperto: ${this.objectiveCollected ? 'RECUPERATO' : 'MANCANTE'}`,
        `Estrazione: ${this.extractionUnlocked ? 'ATTIVA' : 'BLOCCATA'}`,
      ].join('   |   '),
    );
  }

  private updateLog(): void {
    this.logText.setText(['LOG', '', ...this.logLines].join('\n'));
  }
}
