import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { applyTextGlow, createTextStyle, drawBackdrop, drawScanlines, drawScreenFrame, drawTerminalPanel, matrixPalette, } from '../ui/matrixTheme';
export class MenuScene extends Phaser.Scene {
    constructor() {
        super('menu');
        Object.defineProperty(this, "rainTexts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
    }
    create() {
        this.cameras.main.setBackgroundColor('#020604');
        const backdrop = this.add.graphics();
        drawBackdrop(backdrop, GAME_WIDTH, GAME_HEIGHT);
        this.createRain();
        const frame = this.add.graphics();
        drawScreenFrame(frame, GAME_WIDTH, GAME_HEIGHT);
        const panel = this.add.graphics();
        drawTerminalPanel({
            graphics: panel,
            x: 120,
            y: 96,
            width: GAME_WIDTH - 240,
            height: GAME_HEIGHT - 188,
            headerHeight: 36,
        });
        applyTextGlow(this.add
            .text(GAME_WIDTH / 2, 102, 'ARCHIVE LINK // DUNGEON EXTRACTION', createTextStyle('15px', matrixPalette.textDim, 'center'))
            .setOrigin(0.5), matrixPalette.accent, 8);
        applyTextGlow(this.add
            .text(GAME_WIDTH / 2, 176, 'DUNGEON CRAWLER EXTRACTION', createTextStyle('34px', matrixPalette.accent, 'center'))
            .setOrigin(0.5), matrixPalette.accent, 18);
        this.add
            .text(GAME_WIDTH / 2, 228, 'Terminale roguelike a turni. Recupera il reperto, estrai vivo, decidi se tornare o scendere piu a fondo.', {
            ...createTextStyle('16px', matrixPalette.textDim, 'center'),
            wordWrap: { width: 800 },
            lineSpacing: 3,
        })
            .setOrigin(0.5);
        this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, [
            'MOVIMENTO       WASD / FRECCE',
            'INTERAZIONE     E',
            'RACCOGLI        G',
            'USA SLOT        F',
            'LASCIA OGGETTO  Q',
            'CAMBIA SLOT     TAB / 1-4',
            'RITORNO BASE    R',
            '',
            'TARGET: recupera il reperto (!), apri l\'estrazione (>), sopravvivi.',
        ].join('\n'), {
            ...createTextStyle('20px', matrixPalette.text, 'left'),
            lineSpacing: 8,
        })
            .setOrigin(0.5);
        const start = applyTextGlow(this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT - 118, 'PRESS SPACE // ENTER THE SAFEHOUSE', createTextStyle('24px', matrixPalette.warning, 'center'))
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true }), matrixPalette.warning, 14);
        start.on('pointerdown', () => this.scene.start('base'));
        this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('base'));
        this.tweens.add({
            targets: start,
            alpha: 0.45,
            duration: 820,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
        const scanlines = this.add.graphics();
        drawScanlines(scanlines, GAME_WIDTH, GAME_HEIGHT, 4);
    }
    createRain() {
        const glyphs = '01アイウエオ<>/[]{}+$#';
        const columns = 18;
        for (let index = 0; index < columns; index += 1) {
            const text = this.add.text(36 + index * 66, Phaser.Math.Between(-320, GAME_HEIGHT - 80), this.buildRainColumn(glyphs), {
                ...createTextStyle('16px', matrixPalette.textMuted, 'center'),
                lineSpacing: 4,
            });
            text.setAlpha(index % 3 === 0 ? 0.34 : 0.18);
            this.rainTexts.push(text);
            this.tweens.add({
                targets: text,
                y: GAME_HEIGHT + 180,
                duration: Phaser.Math.Between(5000, 9000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2400),
                onRepeat: () => {
                    text.y = Phaser.Math.Between(-360, -120);
                    text.setText(this.buildRainColumn(glyphs));
                },
            });
        }
    }
    buildRainColumn(glyphs) {
        return Array.from({ length: 18 }, () => glyphs[Phaser.Math.Between(0, glyphs.length - 1)]).join('\n');
    }
}
