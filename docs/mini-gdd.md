# Mini GDD — Dungeon Crawler Extraction

## High concept
Single-player browser roguelike horror a turni. Il giocatore entra in un archivio sotterraneo procedurale, recupera un reperto e tenta l'estrazione prima che l'ambiente diventi ostile.

## Pillars
1. **Informazione incompleta** — visuale limitata, log eventi, pochi indizi ma leggibili.
2. **Rischio vs bottino** — restare più a lungo dovrebbe offrire più valore ma aumentare la probabilità di morire.
3. **Extraction over combat** — il combattimento è un costo, non il centro dell'esperienza.
4. **Run brevi** — 10–15 minuti, facili da ripetere e testare.

## Core loop
1. Entrata nel dungeon.
2. Esplorazione a turni su griglia.
3. Recupero del reperto principale.
4. Apertura dell'estrazione.
5. Fuga verso l'uscita.
6. Meta progressione leggera tra una run e l'altra.

## MVP
- Mappa procedurale a stanze e corridoi.
- Movimento a turni.
- Objective item unico.
- Extraction zone.
- HUD con stato run.
- Event log testuale.
- Un nemico apex in milestone successiva.

## UI
- Barra superiore: turno, stato reperto, stato estrazione.
- Pannello destro: log eventi.
- Area centrale: griglia del dungeon.

## Contenuti prima milestone
- 1 tileset.
- 1 bioma: archivio/laboratorio sotterraneo.
- 1 tipo di objective.
- 1 extraction outcome.

## Backlog immediato
1. FOV e darkness.
2. Inventario a slot.
3. Rumore come sistema.
4. Nemico stalker/apex.
5. Loot secondario.
6. Meta progressione basilare.
