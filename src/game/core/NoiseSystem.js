/**
 * Computes the traversable acoustic field for a turn. Future enemies consume the same pulse
 * instead of using line-of-sight or renderer data, keeping hearing deterministic and testable.
 */
export function propagateNoise(dungeon, origin, intensity, noiseLevel) {
    const radiusTiles = intensity === 0 ? 0 : Math.min(8, Math.max(intensity, Math.ceil(noiseLevel / 2)));
    if (radiusTiles === 0)
        return { origin, intensity, radiusTiles, reachedTiles: 0, audibleTiles: new Set() };
    const queue = [{ point: origin, distance: 0 }];
    const visited = new Set([keyOf(origin)]);
    let reachedTiles = 0;
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined)
            break;
        reachedTiles += 1;
        if (current.distance >= radiusTiles)
            continue;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const next = { x: current.point.x + dx, y: current.point.y + dy };
            if (dungeon.tiles[next.y]?.[next.x] === undefined || dungeon.tiles[next.y][next.x] === 'wall')
                continue;
            const key = keyOf(next);
            if (visited.has(key))
                continue;
            visited.add(key);
            queue.push({ point: next, distance: current.distance + 1 });
        }
    }
    return { origin, intensity, radiusTiles, reachedTiles, audibleTiles: visited };
}
export function isNoiseAudibleAt(pulse, point) {
    return pulse.audibleTiles.has(keyOf(point));
}
function keyOf(point) {
    return `${point.x},${point.y}`;
}
