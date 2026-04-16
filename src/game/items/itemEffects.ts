import { isAdjacent, type Monster } from '../combat/monsters';
import type { Point } from '../world/DungeonGenerator';
import type { Item } from './inventory';

export type ItemEffectResult = {
  consumed: boolean;
  logLines: string[];
  nextPlayerHp: number;
  removedMonsterIds: string[];
};

type ItemEffectInput = {
  item: Item;
  playerHp: number;
  playerMaxHp: number;
  playerPosition: Point;
  monsters: Monster[];
};

export const applyItemEffect = ({
  item,
  playerHp,
  playerMaxHp,
  playerPosition,
  monsters,
}: ItemEffectInput): ItemEffectResult => {
  if (item.kind === 'medkit' || item.kind === 'stim-pack') {
    if (playerHp >= playerMaxHp) {
      return {
        consumed: false,
        logLines: ['Sei gia al massimo della vita.'],
        nextPlayerHp: playerHp,
        removedMonsterIds: [],
      };
    }

    const healAmount = Math.min(item.healAmount ?? 0, playerMaxHp - playerHp);
    return {
      consumed: true,
      logLines: [`Usi ${item.name} e recuperi ${healAmount} HP.`],
      nextPlayerHp: playerHp + healAmount,
      removedMonsterIds: [],
    };
  }

  if (item.kind === 'ember-bomb') {
    const adjacentTargets = monsters.filter((monster) => isAdjacent(monster.position, playerPosition));
    if (adjacentTargets.length === 0) {
      return {
        consumed: false,
        logLines: ['Nessun mostro adiacente: la bomba sarebbe sprecata.'],
        nextPlayerHp: playerHp,
        removedMonsterIds: [],
      };
    }

    const removedMonsterIds = adjacentTargets
      .filter((monster) => monster.hp - (item.damageAmount ?? 0) <= 0)
      .map((monster) => monster.id);

    return {
      consumed: true,
      logLines: [
        `Attivi ${item.name}: la fiammata investe ${adjacentTargets.length} nemici.`,
        ...(removedMonsterIds.length > 0
          ? removedMonsterIds.map(() => 'Un mostro crolla tra le scintille.')
          : ['I mostri resistono all\'esplosione.']),
      ],
      nextPlayerHp: playerHp,
      removedMonsterIds,
    };
  }

  return {
    consumed: false,
    logLines: ['Non sai come usare questo oggetto.'],
    nextPlayerHp: playerHp,
    removedMonsterIds: [],
  };
};
