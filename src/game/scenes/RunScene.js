import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { getRandomNeighborSteps, getStepTowardTarget, isAdjacent, rollDamage, spawnMonsters, } from '../combat/monsters';
import { TurnEngine } from '../core/TurnEngine';
import { generateDungeon, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, } from '../world/DungeonGenerator';
const OFFSET_X = 40;
const OFFSET_Y = 60;
export class RunScene extends Phaser.Scene {
    constructor() {
        super('run');
        Object.defineProperty(this, "tiles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "monsters", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "objectiveCollected", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "extractionUnlocked", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "turnEngine", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new TurnEngine()
        });
        Object.defineProperty(this, "mapGraphics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "playerRect", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "hudText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "logText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "logLines", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "playerHp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 12
        });
        Object.defineProperty(this, "playerMaxHp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 12
        });
        Object.defineProperty(this, "isRunComplete", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    create() {
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
    setupRun() {
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
        this.objectiveCollected = false;
        this.extractionUnlocked = false;
        this.playerHp = this.playerMaxHp;
        this.isRunComplete = false;
        this.turnEngine = new TurnEngine();
        this.logLines = [
            'Sei entrato nell\'archivio.',
            'Recupera il reperto (!), sopravvivi ai mostri e raggiungi l\'uscita (>).',
            'Entra in un mostro per attaccarlo.',
        ];
        this.drawMap();
        this.updatePlayerVisual();
        this.addLogLines(['Run avviata']);
        this.refreshHud();
    }
    bindInput() {
        this.input.keyboard?.on('keydown', (event) => {
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
                case 'KeyR':
                    this.setupRun();
                    break;
                default:
                    break;
            }
        });
    }
    tryMove(dx, dy) {
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
        }
        else if (tile === 'extraction') {
            logLine = this.extractionUnlocked
                ? 'Sei sulla zona di estrazione. Premi E per uscire.'
                : 'L\'estrazione e sigillata. Ti manca il reperto.';
        }
        this.resolvePlayerTurn([logLine]);
    }
    interact() {
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
    isWalkable(x, y) {
        if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
            return false;
        }
        return this.tiles[y][x] !== 'wall';
    }
    drawMap() {
        this.mapGraphics.clear();
        for (let y = 0; y < MAP_HEIGHT; y += 1) {
            for (let x = 0; x < MAP_WIDTH; x += 1) {
                const tile = this.tiles[y][x];
                const color = this.getTileColor(tile);
                this.mapGraphics.fillStyle(color, 1);
                this.mapGraphics.fillRect(OFFSET_X + x * TILE_SIZE, OFFSET_Y + y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
            }
        }
        for (const monster of this.monsters) {
            this.mapGraphics.fillStyle(monster.color, 1);
            this.mapGraphics.fillRect(OFFSET_X + monster.position.x * TILE_SIZE + 4, OFFSET_Y + monster.position.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            this.mapGraphics.fillStyle(0x101419, 1);
            this.mapGraphics.fillRect(OFFSET_X + monster.position.x * TILE_SIZE + 8, OFFSET_Y + monster.position.y * TILE_SIZE + 8, TILE_SIZE - 16, 4);
        }
    }
    getTileColor(tile) {
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
    updatePlayerVisual() {
        this.playerRect.setPosition(OFFSET_X + this.player.x * TILE_SIZE + TILE_SIZE / 2, OFFSET_Y + this.player.y * TILE_SIZE + TILE_SIZE / 2);
    }
    refreshHud() {
        this.hudText.setText([
            `Turno: ${this.turnEngine.currentTurn}`,
            `HP: ${this.playerHp}/${this.playerMaxHp}`,
            `Reperto: ${this.objectiveCollected ? 'RECUPERATO' : 'MANCANTE'}`,
            `Estrazione: ${this.extractionUnlocked ? 'ATTIVA' : 'BLOCCATA'}`,
            `Mostri: ${this.monsters.length}`,
        ].join('   |   '));
        this.updateLog();
    }
    updateLog() {
        this.logText.setText(['LOG', '', ...this.logLines].join('\n'));
    }
    resolvePlayerTurn(logLines) {
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
    addLogLines(lines) {
        for (let index = lines.length - 1; index >= 0; index -= 1) {
            this.logLines.unshift(lines[index]);
        }
        this.logLines = this.logLines.slice(0, 10);
    }
    getMonsterAt(x, y) {
        return this.monsters.find((monster) => monster.position.x === x && monster.position.y === y);
    }
    attackMonster(monster) {
        const damage = rollDamage(2, 4);
        monster.hp -= damage;
        if (monster.hp <= 0) {
            this.monsters = this.monsters.filter((candidate) => candidate.id !== monster.id);
            return [`Colpisci ${monster.name} per ${damage} e lo abbatti.`];
        }
        return [`Colpisci ${monster.name} per ${damage}. Gli restano ${monster.hp} HP.`];
    }
    runMonsterTurn() {
        const logLines = [];
        for (const monster of this.monsters) {
            if (this.isRunComplete) {
                break;
            }
            if (isAdjacent(monster.position, this.player)) {
                this.attackPlayer(monster, logLines);
                continue;
            }
            const distanceToPlayer = Math.abs(monster.position.x - this.player.x) + Math.abs(monster.position.y - this.player.y);
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
    tryMoveMonster(monster, steps) {
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
    attackPlayer(monster, logLines) {
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
