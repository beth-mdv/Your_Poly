// draw.js — з підтримкою пошуку найближчого туалету
(function () {
  // ---------- КОНФІГ ----------
  const JSON_PATH = './building.json';
  const IMG_FLOOR = { 1: './1 поверх.svg', 2: './2 поверх.svg' };
  const START_ID = 'start';

  // Еталонні розміри (під які знімали координати)
  const REF = { 1: { w: 2000, h: 1500 }, 2: { w: 2000, h: 1500 } };
  const REF_AUTO = false;

  // Калібрування (зсув, якщо у SVG є поля)
  const CAL = {
    1: { ox: 0, oy: 0 },
    2: { ox: 0, oy: 0 }
  };

  // Стиль маршруту + анімація
  const STYLE = {
    lineWidth: 10,
    outlineWidth: 16,
    glow: 12,
    color: '#1463ff',
    durationMs: 1400
  };

  const NODE_DOT_R = 3.5;
  const DEST_DOT_R = 8;

  // ---------- ГРАФ / PATHFINDER ----------
  const PF = window.Pathfinder; // з pathfinder.js
  if (!PF) {
    console.error('Не знайдено window.Pathfinder. Перевірте підключення pathfinder.js.');
  }

  // ---------- DOM ----------
  const $room = document.getElementById('room');
  const $go = document.getElementById('go');
  const $status = document.getElementById('status');
  const $showNodes = document.getElementById('showNodes');

  const canvases = {
    1: document.getElementById('floor1'),
    2: document.getElementById('floor2')
  };
  const ctx = {
    1: canvases[1]?.getContext('2d'),
    2: canvases[2]?.getContext('2d')
  };

  // ---------- СТАН ----------
  let byId, neighbors; // граф
  const img = {};      // фони

  function setStatus(msg, ok = false) {
    if (!$status) return;
    $status.textContent = msg || '';
    $status.className = 'legend ' + (ok ? 'ok' : (msg ? 'err' : ''));
  }

  // ---------- ТРАНСФОРМАЦІЯ КООРДИНАТ ----------
  function getTransform(floor) {
    const cv = canvases[floor];
    const sx = cv.width / REF[floor].w;
    const sy = cv.height / REF[floor].h;
    const { ox, oy } = CAL[floor];
    return { sx, sy, ox, oy };
  }
  function T(floor, pt) {
    const { sx, sy, ox, oy } = getTransform(floor);
    return { x: pt.x * sx + ox, y: pt.y * sy + oy };
  }

  // ---------- УТИЛІТИ ДЛЯ МАРШРУТІВ ----------
  function pathToPoints(floor, ids, mapById) {
    const pts = [];
    for (const id of ids) {
      const n = mapById.get(id);
      if (!n || n.floor !== floor) continue;
      pts.push(T(floor, n.координати));
    }
    return pts;
  }
  function totalLength(points) {
    let L = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      L += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return L;
  }
  function strokePartial(c, points, Lcut) {
    if (!points.length) return;
    let L = 0;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (L + seg <= Lcut) {
        c.lineTo(b.x, b.y);
        L += seg;
      } else {
        const t = Math.max(0, (Lcut - L) / seg);
        c.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        break;
      }
    }
    c.stroke();
  }
  const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // ---------- РЕНДЕР ----------
  function drawBackground(floor) {
    const c = ctx[floor], cv = canvases[floor];
    c.clearRect(0, 0, cv.width, cv.height);
    if (img[floor]) c.drawImage(img[floor], 0, 0, cv.width, cv.height);
  }
  function drawNodesDebug(floor) {
    const c = ctx[floor];
    c.save();
    c.fillStyle = 'rgba(0,0,0,.85)';
    for (const node of byId.values()) {
      if (node.floor !== floor) continue;
      const p = T(floor, node.координати);
      c.beginPath();
      c.arc(p.x, p.y, NODE_DOT_R, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawPath(ids, floor) {
    if (!ids || !ids.length) return;
    const c = ctx[floor];
    const points = pathToPoints(floor, ids, byId);
    if (points.length < 2) return;

    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';

    // біла підкладка
    c.lineWidth = STYLE.outlineWidth;
    c.strokeStyle = 'rgba(255,255,255,0.96)';
    c.shadowBlur = 0;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.stroke();

    // основна лінія
    c.lineWidth = STYLE.lineWidth;
    c.strokeStyle = STYLE.color;
    c.shadowColor = STYLE.color;
    c.shadowBlur = STYLE.glow;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.stroke();

    // маркер цілі
    const last = points[points.length - 1];
    c.fillStyle = STYLE.color;
    c.shadowBlur = STYLE.glow * 0.8;
    c.beginPath();
    c.arc(last.x, last.y, DEST_DOT_R, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // ---------- Поділ повного шляху на 2 етапи (поверхи) ----------
  function splitAtFloorChange(pathIds, mapById) {
    if (!pathIds || pathIds.length < 2) return { first: null, second: null, changed: false };
    for (let i = 1; i < pathIds.length; i++) {
      const a = mapById.get(pathIds[i - 1]);
      const b = mapById.get(pathIds[i]);
      if (!a || !b) continue;
      if (a.floor !== b.floor) {
        return { first: pathIds.slice(0, i), second: pathIds.slice(i), changed: true };
      }
    }
    return { first: pathIds.slice(), second: null, changed: false };
  }

  function animateSingleFloor(ids, showNodes = false, keepFloors = new Set()) {
    if (!ids || !ids.length) return Promise.resolve();
    const floor = byId.get(ids[0])?.floor;
    if (!floor) return Promise.resolve();

    const points = pathToPoints(floor, ids, byId);
    if (points.length < 2) return Promise.resolve();

    const L = totalLength(points);
    const t0 = performance.now();

    return new Promise((resolve) => {
      function frame(ts) {
        const el = Math.min(1, (ts - t0) / STYLE.durationMs);
        const t = easeIO(el);

        // Перемальовуємо лише ті поверхи, які НЕ в keepFloors
        for (const f of [1, 2]) {
          if (keepFloors.has(f)) continue;
          drawBackground(f);
          if (showNodes) drawNodesDebug(f);
        }

        const c = ctx[floor];
        c.save();
        c.lineJoin = 'round';
        c.lineCap = 'round';

        // підкладка
        c.lineWidth = STYLE.outlineWidth;
        c.strokeStyle = 'rgba(255,255,255,0.96)';
        c.shadowBlur = 0;
        strokePartial(c, points, L * t);

        // основна
        c.lineWidth = STYLE.lineWidth;
        c.strokeStyle = STYLE.color;
        c.shadowColor = STYLE.color;
        c.shadowBlur = STYLE.glow;
        strokePartial(c, points, L * t);

        if (t >= 1) {
          const last = points[points.length - 1];
          c.fillStyle = STYLE.color;
          c.shadowBlur = STYLE.glow * 0.8;
          c.beginPath();
          c.arc(last.x, last.y, DEST_DOT_R, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();

        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  async function animateTwoPhase(fullPathIds, showNodes = false) {
    const { first, second, changed } = splitAtFloorChange(fullPathIds, byId);
    if (!changed) {
      await animateSingleFloor(first, showNodes);
      return;
    }
    // 1F
    await animateSingleFloor(first, showNodes);
    // зафіксуємо шлях 1F
    drawBackground(1);
    if (showNodes) drawNodesDebug(1);
    drawPath(first, 1);
    // 2F — не чіпаємо 1F
    await animateSingleFloor(second, showNodes, new Set([1]));
  }

  // ---------- Пошук цілі з введення ----------
  const TOILET_IDS = [
    'Woman_toilet', 'man_toilet',       // 1F ліве крило
    'Woman_toilet1', 'man_toilet1'      // 1F праве крило
  ];

  function isToiletQuery(s) {
    const q = s.toLowerCase();
    return /(туал|вбир|wc|toilet)/.test(q);
  }
  function wantedGender(s) {
    const q = s.toLowerCase();
    if (/жін|жіно/.test(q)) return 'female';
    if (/чол|чолов/.test(q)) return 'male';
    return 'any';
  }

  // Обчислити “вартість” шляху (за сирими координатами вузлів + штраф за перехід поверху — як у A*)
  function pathCostByCoords(ids) {
    if (!ids || ids.length < 2) return Infinity;
    let cost = 0;
    for (let i = 1; i < ids.length; i++) {
      const a = byId.get(ids[i - 1]);
      const b = byId.get(ids[i]);
      if (!a || !b) return Infinity;
      cost += Math.hypot(a.координати.x - b.координати.x, a.координати.y - b.координати.y);
      if (a.floor !== b.floor) cost += 200; // такий самий штраф, як у PF.edgeCost
    }
    return cost;
  }

  function resolveGoalIdFromInput(input) {
    if (!isToiletQuery(input)) return { type: 'room', id: input.trim() };

    const gender = wantedGender(input);
    let candidates = TOILET_IDS.slice();
    if (gender === 'female') candidates = candidates.filter(id => id.startsWith('Woman'));
    if (gender === 'male')   candidates = candidates.filter(id => id.startsWith('man'));

    // з кандидатів залишимо ті, що реально існують у графі
    candidates = candidates.filter(id => byId.has(id));
    if (!candidates.length) return { type: 'room', id: input.trim() };

    // вибираємо найкоротший шлях від START_ID
    let best = null, bestCost = Infinity;
    for (const id of candidates) {
      const path = PF.aStar(START_ID, id, byId, neighbors);
      if (!path) continue;
      const cost = pathCostByCoords(path);
      if (cost < bestCost) { bestCost = cost; best = id; }
    }
    if (!best) return { type: 'room', id: input.trim() };
    return { type: 'toilet', id: best };
  }

  // ---------- ПОШУК І ВІДМАЛЬОВКА ----------
  async function runSearch() {
    const query = $room.value.trim();
    setStatus('');
    if (!query) { setStatus('Введи номер аудиторії або "туалет"'); return; }

    const goalInfo = resolveGoalIdFromInput(query);
    const goalId = goalInfo.id;

    if (!byId.has(goalId)) { setStatus(`Ціль "${goalId}" не знайдено у JSON`); return; }

    const path = PF.aStar(START_ID, goalId, byId, neighbors);
    if (!path) { setStatus('Маршрут не знайдено'); return; }

    const goalFloor = byId.get(goalId)?.floor;
    if (goalFloor === 1) {
      await animateSingleFloor(path, $showNodes.checked);
    } else {
      await animateTwoPhase(path, $showNodes.checked);
    }

    const label = goalInfo.type === 'toilet' ? 'туалет' : 'аудиторію';
    setStatus(`Готово: ${START_ID} → ${goalId} (${label}), вузлів: ${path.length}`, true);
  }

  // ---------- INIT ----------
  (async function init() {
    try {
      const data = await fetch(JSON_PATH).then(r => {
        if (!r.ok) throw new Error('fetch building.json failed');
        return r.json();
      });

      const g = PF.buildGraph(data);
      byId = g.byId; neighbors = g.neighbors;

      if (REF_AUTO) {
        const getMax = (floor) => {
          let maxX = 0, maxY = 0;
          for (const node of byId.values()) {
            if (node.floor !== floor) continue;
            maxX = Math.max(maxX, node.координати.x);
            maxY = Math.max(maxY, node.координати.y);
          }
          return { w: maxX, h: maxY };
        };
        REF[1] = getMax(1);
        REF[2] = getMax(2);
      }

      for (const f of [1, 2]) {
        img[f] = await new Promise(res => {
          const im = new Image();
          im.onload = () => res(im);
          im.src = encodeURI(IMG_FLOOR[f]); // на випадок пробілів/кирилиці
        });
        const cv = canvases[f];
        const natW = img[f].naturalWidth || img[f].width;
        const natH = img[f].naturalHeight || img[f].height;
        cv.width = natW;
        cv.height = natH;
      }

      for (const f of [1, 2]) drawBackground(f);

      $go.addEventListener('click', runSearch);
      $room.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
      $showNodes.addEventListener('change', () => {
        for (const f of [1, 2]) {
          drawBackground(f);
          if ($showNodes.checked) drawNodesDebug(f);
        }
      });
      $room.focus();
    } catch (e) {
      console.error(e);
      setStatus('Помилка ініціалізації (перевір JSON/SVG/Pathfinder)', false);
    }
  })();
})();
