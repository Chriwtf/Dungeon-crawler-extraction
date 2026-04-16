# Dungeon-crawler-extraction

Browser prototype for a turn-based dungeon crawler extraction game.

## Playtest distribution

The easiest way to let friends try the game on Windows, Linux, or macOS is to publish it as a static website.
This repo is now configured for GitHub Pages deployment through GitHub Actions.

### Option 1: GitHub Pages

1. Push this repository to GitHub.
2. In GitHub open `Settings -> Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` or manually run the `Deploy To GitHub Pages` workflow.
5. Share the Pages URL with your friends.

Your friends only need:
- a modern browser
- the link to the published game

### Local development

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
```

The static output is generated in `dist/`.

### Notes for Linux users

No platform-specific install is required for players.
If the game is hosted online, Linux users can open it directly in Firefox, Chromium, Chrome, or other modern browsers.
