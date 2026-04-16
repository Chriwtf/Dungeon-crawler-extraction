import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
export class MenuScene extends Phaser.Scene {
    constructor() {
        super('menu');
    }
    create() {
        this.add
            .text(GAME_WIDTH / 2, 150, 'DUNGEON CRAWLER EXTRACTION', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#d8e0ea',
        })
            .setOrigin(0.5);
        this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, [
            'Roguelike horror a turni per browser',
            '',
            'WASD / Frecce: muovi',
            'E: interagisci / estrai',
            'R: rigenera dungeon',
            '',
            'Recupera il reperto (!) e raggiungi l\'uscita (>)',
        ].join('\n'), {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#a9b4c2',
            align: 'center',
        })
            .setOrigin(0.5);
        const start = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 140, 'Premi SPACE per iniziare', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#9be7a7',
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        start.on('pointerdown', () => this.scene.start('run'));
        this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('run'));
    }
}
