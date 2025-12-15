const euclid = (a, b) =>
    Math.hypot(a.x - b.x, a.y - b.y);

const edgeCost = (a, b) =>
    euclid(a, b) + (a.floor !== b.floor ? 5000 : 0);

export function buildGraph(json) {
    console.log("🛠️ Pathfinder: Починаю обробку JSON...", json);

    const byId = new Map();
    const neighbors = new Map();

    if (!json) {
        console.error("❌ Pathfinder: JSON файл порожній або не переданий!");
        return { byId, neighbors };
    }

    const rootObj = json.будівля || json.building || json;
    const floors = rootObj?.поверхи || rootObj?.floors || rootObj?.poverhy || [];

    if (!floors || floors.length === 0) {
        console.error("❌ Pathfinder: Не знайдено масив 'поверхи' у JSON! Перевірте структуру файлу.");
        return { byId, neighbors };
    }

    floors.forEach(floorObj => {
        const floorNum = floorObj.номер_поверху || floorObj.floor_number || floorObj.floor;
        const nodes = floorObj.вузли || floorObj.nodes || [];

        nodes.forEach(rawNode => {
            const id = String(rawNode.id).trim();

            const coords = rawNode.координати || rawNode.coordinates || { x: 0, y: 0 };

            const node = {
                id: id,
                name: rawNode.назва || rawNode.name || id,
                x: coords.x || 0,
                y: coords.y || 0,
                floor: floorNum,
                neighborIds: (rawNode.сусіди || rawNode.neighbors || []).map(String)
            };

            byId.set(id, node);
        });
    });

    byId.forEach((node, id) => {
        const validNeighbors = node.neighborIds.filter(nId => {
            if (!byId.has(nId)) {
                return false;
            }
            return true;
        });
        neighbors.set(id, validNeighbors);
    });

    console.log(`✅ Pathfinder: Граф успішно побудовано! Вузлів: ${byId.size}`);
    return { byId, neighbors };
}

export function aStar(startId, goalId, graph) {
    if (!graph || !graph.byId) {
        console.error("❌ A* Error: Граф не ініціалізовано.");
        return null;
    }

    const start = String(startId);
    const goal = String(goalId);

    console.log(`🔍 A*: Старт [${start}] -> Фініш [${goal}]`);

    if (!graph.byId.has(start)) {
        console.error(`❌ A*: Точка старту "${start}" не знайдена.`);
        return null;
    }
    if (!graph.byId.has(goal)) {
        console.error(`❌ A*: Точка фінішу "${goal}" не знайдена.`);
        return null;
    }

    const frontier = new PriorityQueue();
    frontier.put(start, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();

    cameFrom.set(start, null);
    costSoFar.set(start, 0);

    while (!frontier.isEmpty()) {
        const currentId = frontier.get();

        if (currentId === goal) {
            const path = [];
            let curr = currentId;
            while (curr !== null) {
                path.push(curr);
                curr = cameFrom.get(curr);
            }
            return path.reverse();
        }

        const currentNode = graph.byId.get(currentId);
        const neighborsList = graph.neighbors.get(currentId) || [];

        for (let nextId of neighborsList) {
            const nextNode = graph.byId.get(nextId);
            const newCost = costSoFar.get(currentId) + edgeCost(currentNode, nextNode);

            if (!costSoFar.has(nextId) || newCost < costSoFar.get(nextId)) {
                costSoFar.set(nextId, newCost);
                const priority = newCost + euclid(nextNode, graph.byId.get(goal));
                frontier.put(nextId, priority);
                cameFrom.set(nextId, currentId);
            }
        }
    }
    return null;
}

export function splitPathByFloor(pathIds, byId) {
    if (!pathIds || pathIds.length === 0) return [];

    const segments = [];
    let currentSegment = { floor: byId.get(pathIds[0]).floor, path: [] };

    pathIds.forEach(id => {
        const node = byId.get(id);
        if (node.floor !== currentSegment.floor) {
            segments.push(currentSegment);
            currentSegment = { floor: node.floor, path: [id] };
        } else {
            currentSegment.path.push(id);
        }
    });
    segments.push(currentSegment);
    return segments;
}

export function resolveTargetId(query, startId, graphData) {
    if (!query) return null;
    const cleanQuery = String(query).trim();

    if (graphData.byId.has(cleanQuery)) return cleanQuery;

    for (let [id, node] of graphData.byId) {
        if (node.name && node.name.toLowerCase().includes(cleanQuery.toLowerCase())) {
            return id;
        }
    }

    if (cleanQuery.includes("туалет") || cleanQuery.includes("toilet")) {
        if (graphData.byId.has("man_toil")) return "man_toil";
    }

    return null;
}

class PriorityQueue {
    constructor() { this.elements = []; }
    isEmpty() { return this.elements.length === 0; }
    put(item, priority) {
        this.elements.push({ item, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }
    get() { return this.elements.shift().item; }
}