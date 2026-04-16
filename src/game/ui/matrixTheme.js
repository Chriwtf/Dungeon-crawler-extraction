export const MATRIX_FONT = '"Lucida Console", "Courier New", monospace';
export const matrixPalette = {
    bg: 0x020605,
    bgAlt: 0x06110d,
    panel: 0x081711,
    panelSoft: 0x0b1e16,
    header: 0x103222,
    border: 0x2a7a4b,
    borderDim: 0x19412b,
    text: '#c8ffd7',
    textDim: '#7fb58e',
    textMuted: '#4f7d60',
    accent: '#7dff9b',
    warning: '#d7ff6c',
    danger: '#66ffcc',
};
export const toCssColor = (value) => `#${value.toString(16).padStart(6, '0')}`;
export const createTextStyle = (fontSize, color = matrixPalette.text, align = 'left') => ({
    fontFamily: MATRIX_FONT,
    fontSize,
    color,
    align,
});
export const applyTextGlow = (text, color = matrixPalette.accent, blur = 10) => text.setShadow(0, 0, color, blur, true, true);
export const drawBackdrop = (graphics, width, height) => {
    graphics.clear();
    graphics.fillGradientStyle(matrixPalette.bgAlt, matrixPalette.bgAlt, matrixPalette.bg, matrixPalette.bg, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(1, matrixPalette.borderDim, 0.14);
    for (let x = 0; x <= width; x += 32) {
        graphics.lineBetween(x, 0, x, height);
    }
    graphics.lineStyle(1, matrixPalette.borderDim, 0.1);
    for (let y = 0; y <= height; y += 18) {
        graphics.lineBetween(0, y, width, y);
    }
    graphics.fillStyle(0x7dff9b, 0.035);
    graphics.fillEllipse(width * 0.15, height * 0.12, 320, 160);
    graphics.fillEllipse(width * 0.82, height * 0.8, 420, 220);
};
export const drawScanlines = (graphics, width, height, step = 4) => {
    graphics.clear();
    graphics.fillStyle(0x000000, 0.12);
    for (let y = 0; y <= height; y += step) {
        graphics.fillRect(0, y, width, 1);
    }
};
export const drawTerminalPanel = ({ graphics, x, y, width, height, headerHeight = 32, }) => {
    graphics.fillStyle(matrixPalette.panel, 0.94);
    graphics.fillRoundedRect(x, y, width, height, 12);
    graphics.fillStyle(matrixPalette.header, 0.94);
    graphics.fillRoundedRect(x, y, width, headerHeight, 12);
    graphics.fillStyle(matrixPalette.bgAlt, 0.42);
    graphics.fillRoundedRect(x + 10, y + headerHeight + 12, width - 20, height - headerHeight - 22, 8);
    graphics.lineStyle(2, matrixPalette.border, 0.95);
    graphics.strokeRoundedRect(x, y, width, height, 12);
    graphics.lineStyle(1, matrixPalette.border, 0.25);
    graphics.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 9);
    graphics.lineStyle(1, matrixPalette.border, 0.4);
    graphics.lineBetween(x + 14, y + headerHeight - 5, x + width - 14, y + headerHeight - 5);
    graphics.fillStyle(0x7dff9b, 0.85);
    graphics.fillCircle(x + 16, y + 16, 3);
    graphics.fillStyle(0xd7ff6c, 0.7);
    graphics.fillCircle(x + 28, y + 16, 3);
    graphics.fillStyle(0x66ffcc, 0.65);
    graphics.fillCircle(x + 40, y + 16, 3);
};
export const drawScreenFrame = (graphics, width, height) => {
    graphics.lineStyle(2, matrixPalette.borderDim, 0.75);
    graphics.strokeRect(12, 12, width - 24, height - 24);
    graphics.lineStyle(1, matrixPalette.border, 0.3);
    graphics.strokeRect(18, 18, width - 36, height - 36);
};
