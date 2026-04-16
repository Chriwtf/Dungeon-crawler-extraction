# Project Overview

Questo repository contiene uno starter kit per un **dungeon crawler extraction single-player**, giocabile da browser.

## Visione
- roguelike a turni
- atmosfera horror
- mappe procedurali
- run brevi
- obiettivo di recupero + estrazione

## Giocabile adesso
Il prototipo corrente include:
- generazione di un piccolo dungeon a stanze e corridoi
- movimento a turni su griglia
- reperto da recuperare
- uscita bloccata fino al recupero del reperto
- HUD e log eventi

## Avvio locale
```bash
npm install
npm run dev
```

## Controlli
- WASD / frecce: movimento
- E: interazione / estrazione
- R: rigenera la run
- SPACE: avvia o torna al menu

## Struttura
```text
src/
  game/
    config.ts
    core/
      TurnEngine.ts
    scenes/
      BootScene.ts
      MenuScene.ts
      RunScene.ts
    world/
      DungeonGenerator.ts
  main.ts
  styles.css

docs/
  mini-gdd.md
```

## Roadmap consigliata
1. Field of view e oscurita.
2. Sistema rumore.
3. Inventario a slot.
4. Nemico stalker/apex.
5. Loot secondario.
6. Progressione meta light.
