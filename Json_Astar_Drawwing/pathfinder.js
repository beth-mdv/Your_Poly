// pathfinder.js
(function () {
  function buildGraph(buildingData) {
    const byId = new Map();       // id -> node {id, назва, координати:{x,y}, floor}
    const neighbors = new Map();  // id -> [neighborId,...]

    for (const floor of buildingData.будівля.поверхи) {
      for (const n of floor.вузли) {
        const node = { ...n, floor: floor.номер_поверху };
        byId.set(node.id, node);
        neighbors.set(node.id, Array.from(new Set(node.сусіди || [])));
      }
    }
    // зробити граф неорієнтованим (симетрія ребер)
    for (const [id, list] of neighbors) {
      for (const nb of list) {
        if (!neighbors.has(nb)) continue;
        const back = neighbors.get(nb);
        if (!back.includes(id)) back.push(id);
      }
    }
    return { byId, neighbors };
  }

  const euclid = (a, b) =>
    Math.hypot(a.координати.x - b.координати.x, a.координати.y - b.координати.y);

  const edgeCost = (a, b) =>
    euclid(a, b) + (a.floor !== b.floor ? 200 : 0); // штраф за перехід між поверхами

  const validInterfloor = (aId, bId) =>
    (aId.endsWith('_stairs_1') && bId.endsWith('_stairs_2')) ||
    (aId.endsWith('_stairs_2') && bId.endsWith('_stairs_1'));

  function aStar(startId, goalId, byId, neighbors) {
    if (!byId.has(startId) || !byId.has(goalId)) return null;

    const open = new Set([startId]);
    const came = new Map();
    const g = new Map([[startId, 0]]);
    const h = (id) => euclid(byId.get(id), byId.get(goalId));
    const f = new Map([[startId, h(startId)]]);

    const pickBest = () => {
      let best = null, bestF = Infinity;
      for (const id of open) {
        const val = f.get(id) ?? Infinity;
        if (val < bestF) { bestF = val; best = id; }
      }
      return best;
    };

    while (open.size) {
      const current = pickBest();
      if (current === goalId) {
        const path = [current];
        let c = current;
        while (came.has(c)) { c = came.get(c); path.push(c); }
        return path.reverse();
      }
      open.delete(current);
      const A = byId.get(current);

      for (const nb of neighbors.get(current) || []) {
        const B = byId.get(nb);
        if (A.floor !== B.floor && !validInterfloor(A.id, B.id)) continue;

        const tentative = (g.get(current) ?? Infinity) + edgeCost(A, B);
        if (tentative < (g.get(nb) ?? Infinity)) {
          came.set(nb, current);
          g.set(nb, tentative);
          f.set(nb, tentative + h(nb));
          open.add(nb);
        }
      }
    }
    return null;
  }

  function splitPathByFloor(pathIds, byId) {
    if (!pathIds) return [];
    const segs = []; let cur = [];
    const flush = () => { if (cur.length) { segs.push(cur); cur = []; } };

    for (let i = 0; i < pathIds.length; i++) {
      const id = pathIds[i], node = byId.get(id);
      if (!node) continue;
      if (cur.length === 0) { cur.push(id); continue; }
      const prev = byId.get(cur[cur.length - 1]);
      if (prev.floor === node.floor) cur.push(id);
      else { cur.push(id); flush(); } // розділяємо при переході між поверхами
    }
    flush();
    return segs;
  }

  // Експорт у глобал
  window.Pathfinder = {
    buildGraph,
    aStar,
    splitPathByFloor
  };
})();
