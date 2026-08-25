import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './game/config';
import { startVerticalSlice } from './drift/VerticalSlice';
if (new URLSearchParams(window.location.search).get('mode') === 'legacy') {
    void new Phaser.Game(gameConfig);
}
else {
    void startVerticalSlice();
}
