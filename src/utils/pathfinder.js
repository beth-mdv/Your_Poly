// src/utils/pathfinder.js

// --- 1. ДОПОМІЖНІ ФУНКЦІЇ ---

const euclid = (a, b) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  
const edgeCost = (a, b) =>
    euclid(a, b) + (a.floor !== b.floor ? 5000 : 0); // Штраф за перехід поверхами
  
// --- 2. ПОБУДОВА ГРАФА (ВИПРАВЛЕНО ТУТ 🛠️) ---
export function buildGraph(json) {
    console.log("🛠️ Pathfinder: Починаю обробку JSON...", json);
    
    const byId = new Map();
    const neighbors = new Map();
  
    if (!json) {
        console.error("❌ Pathfinder: JSON файл порожній або не переданий!");
        return { byId, neighbors };
    }

    // 1. БЕЗПЕЧНИЙ ПОШУК ДАНИХ
    // Ми шукаємо "поверхи" всюди, де вони можуть бути
    // Це виправить помилку "Cannot read properties of undefined"
    const rootObj = json.будівля || json.building || json; 
    const floors = rootObj?.поверхи || rootObj?.floors || rootObj?.poverhy || [];
  
    if (!floors || floors.length === 0) {
        console.error("❌ Pathfinder: Не знайдено масив 'поверхи' у JSON! Перевірте структуру файлу.");
        // Щоб не падало, повертаємо порожній граф
        return { byId, neighbors };
    }
  
    // 2. ЗАПОВНЕННЯ ГРАФА
    floors.forEach(floorObj => {
      const floorNum = floorObj.номер_поверху || floorObj.floor_number || floorObj.floor;
      const nodes = floorObj.вузли || floorObj.nodes || [];
  
      nodes.forEach(rawNode => {
        // Конвертуємо ID в рядок
        const id = String(rawNode.id).trim();
        
        // Отримуємо координати безпечно
        const coords = rawNode.координати || rawNode.coordinates || {x:0, y:0};

        const node = {
          id: id,
          name: rawNode.назва || rawNode.name || id,
          x: coords.x || 0,
          y: coords.y || 0,
          floor: floorNum,
          // Отримуємо сусідів
          neighborIds: (rawNode.сусіди || rawNode.neighbors || []).map(String) 
        };
  
        byId.set(id, node);
      });
    });
  
    // 3. ЗВ'ЯЗКИ
    byId.forEach((node, id) => {
        const validNeighbors = node.neighborIds.filter(nId => {
            if (!byId.has(nId)) {
                // Тихо ігноруємо биті посилання, щоб не засмічувати консоль
                return false;
            }
            return true;
        });
        neighbors.set(id, validNeighbors);
    });
  
    console.log(`✅ Pathfinder: Граф успішно побудовано! Вузлів: ${byId.size}`);
    return { byId, neighbors };
}
  
// --- 3. АЛГОРИТМ A* ---
export function aStar(startId, goalId, graph) {
    // Безпечна перевірка на null
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
  
// --- 4. РОЗБИТТЯ ПО ПОВЕРХАХ ---
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
  
// --- 5. ПОШУК ID ---
export function resolveTargetId(query, startId, graphData) {
    if (!query) return null;
    const cleanQuery = String(query).trim();
  
    // 1. Прямий збіг
    if (graphData.byId.has(cleanQuery)) return cleanQuery;
  
    // 2. Пошук по назві
    for (let [id, node] of graphData.byId) {
        if (node.name && node.name.toLowerCase().includes(cleanQuery.toLowerCase())) {
            return id;
        }
    }
    
    // 3. Туалети
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