// ===== 분식 타이쿤 메인 게임 =====

// ---------- 저장 / 불러오기 (localStorage) ----------
function defaultSave() {
  return { money: 0, day: 1, unlocked: ['eomuk', 'gimbap'], collection: {} };
}

function loadSave() {
  const def = defaultSave();
  try {
    const raw = localStorage.getItem(GAME.SAVE_KEY);
    if (raw) return Object.assign(def, JSON.parse(raw));
  } catch (e) { /* 시크릿 모드 등에서 저장 불가 시 무시 */ }
  return def;
}

function persist() {
  try { localStorage.setItem(GAME.SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

let save = loadSave();

// ---------- DOM 헬퍼 ----------
const $ = id => document.getElementById(id);

function showScreen(name) {
  ['lobby', 'shop', 'collection', 'day', 'summary'].forEach(s => {
    $('screen-' + s).classList.toggle('hidden', s !== name);
  });
}

// ---------- 로비 ----------
function renderLobby() {
  $('hud-day').textContent = save.day + '일차';
  $('lobby-money').textContent = won(save.money);
  const collected = Object.keys(save.collection).length;
  $('lobby-collect').textContent = collected + ' / ' + CUSTOMERS.length;
  const menuNames = MENUS.filter(m => save.unlocked.includes(m.id)).map(m => m.name).join(' · ');
  $('lobby-menus').textContent = '판매 중인 메뉴: ' + menuNames;
  showScreen('lobby');
}

// ---------- 레시피 상점 ----------
function renderShop() {
  $('shop-money').textContent = won(save.money);
  const list = $('shop-list');
  list.innerHTML = '';
  MENUS.forEach(m => {
    const owned = save.unlocked.includes(m.id);
    const card = document.createElement('div');
    card.className = 'card' + (owned ? ' owned' : '');
    const perSec = Math.round(m.price / (m.cookMs / 1000));
    card.innerHTML =
      '<div class="card-head"><span class="dot" style="background:' + m.c1 + '"></span>' +
      '<strong>' + m.name + '</strong></div>' +
      '<p class="card-line">판매가 ' + won(m.price) + ' · 조리 ' + (m.cookMs / 1000).toFixed(1) + '초</p>' +
      '<p class="card-line sub">효율 약 ' + won(perSec) + '/초</p>';
    if (owned) {
      card.innerHTML += '<span class="badge">보유 중</span>';
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn small primary';
      btn.textContent = won(m.cost) + '에 구매';
      btn.disabled = save.money < m.cost;
      btn.onclick = () => {
        save.money -= m.cost;
        save.unlocked.push(m.id);
        persist();
        renderShop();
      };
      card.appendChild(btn);
    }
    list.appendChild(card);
  });
}

// ---------- 손님 도감 ----------
function renderCollection() {
  const list = $('collection-list');
  list.innerHTML = '';
  CUSTOMERS.forEach(c => {
    const count = save.collection[c.id] || 0;
    const card = document.createElement('div');
    card.className = 'card' + (count ? '' : ' locked');
    if (count) {
      card.innerHTML =
        '<div class="card-head"><span class="dot" style="background:' + c.body + '"></span>' +
        '<strong>' + c.name + '</strong></div>' +
        '<p class="card-line">희귀도: ' + rarityLabel(c.weight) + '</p>' +
        '<p class="card-line sub">팁 배율 x' + c.tip + ' · ' + count + '번 서빙</p>';
    } else {
      card.innerHTML =
        '<div class="card-head"><span class="dot gray"></span><strong>???</strong></div>' +
        '<p class="card-line">희귀도: ' + rarityLabel(c.weight) + '</p>' +
        '<p class="card-line sub">서빙에 성공하면 등록됩니다</p>';
    }
    list.appendChild(card);
  });
}

// ---------- 하루 영업 ----------
const cv = $('cv');
const ctx = cv.getContext('2d');
let D = null;          // 진행 중인 하루의 상태
let raf = null, last = 0;

function pickCustomerType() {
  const total = CUSTOMERS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CUSTOMERS) { r -= c.weight; if (r <= 0) return c; }
  return CUSTOMERS[0];
}

function startDay() {
  const menus = MENUS.filter(m => save.unlocked.includes(m.id));
  const n = menus.length;
  const sw = (GAME.W - 20) / n;
  D = {
    menus,
    stations: menus.map((m, i) => ({
      menu: m,
      x: 10 + sw * i + sw / 2,
      y: 78,
      hw: Math.min(74, sw / 2 - 4),
      state: 'idle',
      t: 0
    })),
    tables: [
      { x: 160, y: 230 }, { x: 480, y: 230 },
      { x: 160, y: 370 }, { x: 480, y: 370 }
    ].map(p => ({ x: p.x, y: p.y, cust: null })),
    player: { x: GAME.W / 2, y: GAME.H - 50, tx: GAME.W / 2, ty: GAME.H - 50, carrying: null, onArrive: null, face: 1 },
    money: 0, served: 0, missed: 0,
    timeLeft: GAME.DAY_MS,
    spawnT: 1000,
    spawnBase: Math.max(1700, 3200 - (save.day - 1) * 120), // 날이 갈수록 손님이 빨리 옴
    flashes: [],
    newTypes: []
  };
  setMsg('영업 시작! 화구를 클릭해 조리하고, 완성된 음식을 들고 손님에게 가세요.');
  $('hud-earn').textContent = '0원';
  showScreen('day');
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

function setMsg(t) { $('msg').textContent = t; }

function addFlash(x, y, text, color) {
  D.flashes.push({ x, y, text, color, t: 1200 });
}

function spawnCustomer() {
  const empty = D.tables.filter(t => !t.cust);
  if (!empty.length) return;
  const table = empty[Math.floor(Math.random() * empty.length)];
  const type = pickCustomerType();
  const order = D.menus[Math.floor(Math.random() * D.menus.length)];
  const max = GAME.PATIENCE_MS * type.pat;
  table.cust = { type, order, patience: max, max };
}

function walkTo(x, y, fn) {
  D.player.tx = Math.max(20, Math.min(GAME.W - 20, x));
  D.player.ty = Math.max(140, Math.min(GAME.H - 25, y));
  D.player.onArrive = fn;
}

cv.addEventListener('pointerdown', e => {
  if (!D) return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (GAME.W / r.width);
  const y = (e.clientY - r.top) * (GAME.H / r.height);

  for (const s of D.stations) {
    if (Math.abs(x - s.x) < s.hw + 6 && Math.abs(y - s.y) < 55) {
      walkTo(s.x, s.y + 58, () => {
        if (s.state === 'ready' && !D.player.carrying) {
          D.player.carrying = s.menu;
          s.state = 'idle';
          setMsg(s.menu.name + '을(를) 들었습니다! 주문한 손님에게 가져다주세요.');
        } else if (s.state === 'ready') {
          setMsg('이미 음식을 들고 있어요. 먼저 서빙하세요!');
        } else if (s.state === 'idle') {
          s.state = 'cooking';
          s.t = s.menu.cookMs;
          setMsg(s.menu.name + ' 조리를 시작했습니다.');
        }
      });
      return;
    }
  }
  for (const t of D.tables) {
    if (Math.abs(x - t.x) < 70 && Math.abs(y - t.y) < 60) {
      walkTo(t.x, t.y + 52, () => serveAt(t));
      return;
    }
  }
  walkTo(x, y, null);
});

function serveAt(table) {
  const c = table.cust;
  if (!c) { setMsg('빈 테이블입니다.'); return; }
  if (!D.player.carrying) { setMsg('손님: "' + c.order.name + ' 주세요!"'); return; }

  if (D.player.carrying.id === c.order.id) {
    const pay = Math.round(c.order.price * c.type.tip / 100) * 100;
    D.money += pay;
    D.served++;
    addFlash(table.x, table.y - 64, '+' + won(pay), '#1D9E75');
    if (!save.collection[c.type.id]) {
      D.newTypes.push(c.type);
      addFlash(table.x, table.y - 86, 'NEW! ' + c.type.name + ' 도감 등록', '#534AB7');
    }
    save.collection[c.type.id] = (save.collection[c.type.id] || 0) + 1;
    persist();
    setMsg(c.type.name + ' 손님이 맛있게 먹고 갔습니다!' + (c.type.tip > 1 ? ' (팁 x' + c.type.tip + ')' : ''));
    table.cust = null;
    D.player.carrying = null;
    $('hud-earn').textContent = won(D.money);
  } else {
    c.patience -= 5000;
    addFlash(table.x, table.y - 64, '주문 틀림!', '#E24B4A');
    setMsg('이게 아닌데요... ' + c.type.name + ' 손님이 짜증을 냅니다.');
  }
}

function update(dt) {
  D.timeLeft -= dt;
  D.spawnT -= dt;
  if (D.spawnT <= 0) {
    spawnCustomer();
    D.spawnT = D.spawnBase + Math.random() * 2500;
  }
  D.tables.forEach(t => {
    if (!t.cust) return;
    t.cust.patience -= dt;
    if (t.cust.patience <= 0) {
      t.cust = null;
      D.missed++;
      setMsg('손님이 기다리다 그냥 갔습니다...');
    }
  });
  D.stations.forEach(s => {
    if (s.state === 'cooking') {
      s.t -= dt;
      if (s.t <= 0) s.state = 'ready';
    }
  });
  const p = D.player;
  const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
  if (d > 3) {
    const mv = Math.min(d, GAME.SPEED * dt / 1000);
    p.x += dx / d * mv;
    p.y += dy / d * mv;
    if (Math.abs(dx) > 1) p.face = dx > 0 ? 1 : -1;
    p.moving = true;
  } else {
    p.moving = false;
    if (p.onArrive) { const f = p.onArrive; p.onArrive = null; f(); }
  }
  D.flashes.forEach(f => { f.t -= dt; f.y -= dt * 0.02; });
  D.flashes = D.flashes.filter(f => f.t > 0);

  $('hud-time').textContent = Math.max(0, Math.ceil(D.timeLeft / 1000)) + '초';
  if (D.timeLeft <= 0) endDay();
}

// ---------- 그리기 (스프라이트 우선, 없으면 폴백) ----------
function drawFoodFB(x, y, m, sc) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  if (m.shape === 'roll') {
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = '#2C2C2A'; ctx.beginPath(); ctx.arc(i * 11, 0, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#F1EFE8'; ctx.beginPath(); ctx.arc(i * 11, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = m.c1; ctx.beginPath(); ctx.arc(i * 11, 0, 1.8, 0, 7); ctx.fill();
    }
  } else if (m.shape === 'skewer') {
    ctx.strokeStyle = '#B4885A'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(12, -8); ctx.stroke();
    ctx.fillStyle = m.c2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * 7, -i * 4.5, 6, 4.5, -0.6, 0, 7); ctx.fill(); }
  } else if (m.shape === 'sundae') {
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 2, 15, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#D3D1C7'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = m.c1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * 8, 0, 5, 6, 0.4, 0, 7); ctx.fill(); }
  } else if (m.shape === 'plate') {
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 9.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#D3D1C7'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = m.c1; ctx.beginPath(); ctx.roundRect(-10, -4, 20, 9, 4); ctx.fill();
    ctx.strokeStyle = m.c2; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -3); ctx.lineTo(i * 5, 4); ctx.stroke(); }
  } else { // bowl / noodle
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 2, 15, 9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#D3D1C7'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = m.c1; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0, 0, 7); ctx.fill();
    if (m.shape === 'noodle') {
      ctx.strokeStyle = m.c2; ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 5 - 3, -2); ctx.quadraticCurveTo(i * 5, 3, i * 5 + 3, -1); ctx.stroke();
      }
    } else {
      ctx.fillStyle = m.c2;
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 6 - 3, -2, 6, 3);
    }
  }
  ctx.restore();
}

function drawFood(x, y, m, sc) {
  const key = 'food_' + m.id;
  if (Sprites.has(key)) Sprites.drawCenter(ctx, key, x, y, 36 * sc, 24 * sc);
  else drawFoodFB(x, y, m, sc);
}

function drawPersonFB(x, y, bodyC, face, apron, bob) {
  ctx.save(); ctx.translate(x, y + (bob || 0));
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(0, 16, 13, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.roundRect(-10, -10, 20, 26, 8); ctx.fill();
  if (apron) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(-7, -4, 14, 18, 5); ctx.fill(); }
  ctx.fillStyle = '#EFC9A8';
  ctx.beginPath(); ctx.arc(0, -18, 10, 0, 7); ctx.fill();
  ctx.fillStyle = '#2C2C2A';
  ctx.beginPath(); ctx.arc(face * 3 - 2, -19, 1.4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(face * 3 + 3, -19, 1.4, 0, 7); ctx.fill();
  ctx.restore();
}

// 캐릭터는 (x, y)가 몸 중심, 발끝은 y+16
function drawCharacter(spriteKey, x, y, bodyC, face, apron, bob) {
  if (Sprites.has(spriteKey)) {
    const h = spriteKey === 'player' ? 64 : 60;
    const w = spriteKey === 'player' ? 48 : 44;
    Sprites.drawFeet(ctx, spriteKey, x, y + 16 + (bob || 0), w, h);
  } else {
    drawPersonFB(x, y, bodyC, face, apron, bob);
  }
}

function draw(now) {
  ctx.clearRect(0, 0, GAME.W, GAME.H);
  // 바닥
  ctx.fillStyle = '#EFE7D8';
  ctx.fillRect(0, 0, GAME.W, GAME.H);
  ctx.strokeStyle = 'rgba(0,0,0,0.045)'; ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 80, 135); ctx.lineTo(i * 80, GAME.H); ctx.stroke(); }
  for (let j = 2; j < 6; j++) { ctx.beginPath(); ctx.moveTo(0, j * 80 + 15); ctx.lineTo(GAME.W, j * 80 + 15); ctx.stroke(); }
  ctx.fillStyle = '#D9CBB0'; ctx.fillRect(0, 0, GAME.W, 118);
  ctx.fillStyle = '#B4885A'; ctx.fillRect(0, 118, GAME.W, 18);

  // 조리대
  D.stations.forEach(s => {
    if (Sprites.has('station')) {
      Sprites.drawCenter(ctx, 'station', s.x, s.y, Math.min(110, s.hw * 2), 70);
    } else {
      ctx.fillStyle = '#8A8276';
      ctx.beginPath(); ctx.roundRect(s.x - s.hw, s.y - 32, s.hw * 2, 68, 8); ctx.fill();
      ctx.fillStyle = '#5F5E5A'; ctx.beginPath(); ctx.arc(s.x, s.y - 6, 17, 0, 7); ctx.fill();
      ctx.fillStyle = '#444441'; ctx.beginPath(); ctx.arc(s.x, s.y - 6, 13, 0, 7); ctx.fill();
    }
    if (s.state === 'cooking') {
      ctx.fillStyle = s.menu.c2; ctx.beginPath(); ctx.arc(s.x, s.y - 6, 10, 0, 7); ctx.fill();
      const p = 1 - s.t / s.menu.cookMs;
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(s.x - 24, s.y + 14, 48, 5);
      ctx.fillStyle = s.menu.c1; ctx.fillRect(s.x - 24, s.y + 14, 48 * p, 5);
    }
    if (s.state === 'ready') {
      drawFood(s.x, s.y - 7, s.menu, 1.05);
      ctx.fillStyle = '#085041'; ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('완성!', s.x, s.y + 24);
    }
    ctx.fillStyle = '#FFFFFF'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(s.menu.name, s.x, s.y - 40);
  });

  // 테이블과 손님
  D.tables.forEach(t => {
    if (Sprites.has('table')) {
      Sprites.drawCenter(ctx, 'table', t.x, t.y - 2, 96, 64);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.ellipse(t.x, t.y + 8, 40, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#C99B62'; ctx.beginPath(); ctx.ellipse(t.x, t.y, 42, 26, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#B4885A'; ctx.beginPath(); ctx.ellipse(t.x, t.y - 4, 42, 26, 0, 0, 7); ctx.fill();
    }
    if (t.cust) {
      const c = t.cust;
      drawCharacter('cust_' + c.type.id, t.x, t.y - 42, c.type.body, 1, false, 0);
      // 주문 말풍선
      const bx = t.x + 44, by = t.y - 72;
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(bx - 26, by - 16, 52, 34, 10); ctx.fill();
      ctx.strokeStyle = '#D3D1C7'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 14, by + 17); ctx.lineTo(bx - 20, by + 26); ctx.lineTo(bx - 5, by + 18); ctx.fill();
      drawFood(bx, by + 1, c.order, 0.85);
      // 인내심 바
      const pct = Math.max(0, c.patience / c.max);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(t.x - 22, t.y - 78, 44, 5);
      ctx.fillStyle = pct > 0.5 ? '#1D9E75' : (pct > 0.25 ? '#EF9F27' : '#E24B4A');
      ctx.fillRect(t.x - 22, t.y - 78, 44 * pct, 5);
    }
  });

  // 플레이어
  const p = D.player;
  const bob = p.moving ? Math.sin(now / 90) * 2 : 0;
  drawCharacter('player', p.x, p.y, '#534AB7', p.face, true, bob);
  if (p.carrying) drawFood(p.x, p.y - 38 + bob, p.carrying, 0.95);

  // 플로팅 텍스트
  D.flashes.forEach(f => {
    ctx.globalAlpha = Math.min(1, f.t / 600);
    ctx.fillStyle = f.color; ctx.font = '600 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  });
}

function loop(now) {
  if (!D) return;
  const dt = Math.min(50, now - last);
  last = now;
  update(dt);
  if (D) draw(now);
  if (D) raf = requestAnimationFrame(loop);
}

// ---------- 하루 마감 ----------
function endDay() {
  cancelAnimationFrame(raf);
  const result = D;
  D = null;
  save.money += result.money;
  save.day += 1;
  persist();

  $('sum-earn').textContent = won(result.money);
  $('sum-served').textContent = result.served + '명';
  $('sum-missed').textContent = result.missed + '명';
  $('sum-total').textContent = '보유 자산 ' + won(save.money);

  const newBox = $('sum-new');
  if (result.newTypes.length) {
    newBox.classList.remove('hidden');
    newBox.innerHTML = '<strong>도감에 새 손님 등록!</strong> ' +
      result.newTypes.map(t => t.name + ' (' + rarityLabel(t.weight) + ')').join(', ');
  } else {
    newBox.classList.add('hidden');
  }
  showScreen('summary');
}

// ---------- 버튼 연결 ----------
$('btn-start').onclick = startDay;
$('btn-shop').onclick = () => { renderShop(); showScreen('shop'); };
$('btn-collection').onclick = () => { renderCollection(); showScreen('collection'); };
$('btn-shop-back').onclick = renderLobby;
$('btn-col-back').onclick = renderLobby;
$('btn-next-day').onclick = renderLobby;
$('btn-sum-shop').onclick = () => { renderShop(); showScreen('shop'); };
$('btn-reset').onclick = () => {
  if (confirm('저장된 자산, 레시피, 도감이 모두 삭제됩니다. 처음부터 시작할까요?')) {
    save = defaultSave();
    persist();
    renderLobby();
  }
};

// ---------- 시작 ----------
Sprites.load();
renderLobby();
