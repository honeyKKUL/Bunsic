// ===== 스프라이트 시스템 =====
// assets/sprites/ 폴더에 아래 이름의 PNG 파일을 넣으면 자동으로 적용됩니다.
// 파일이 없으면 코드로 그린 기본 그래픽(폴백)을 사용하므로, 일부만 교체해도 게임은 항상 동작합니다.
//
//   player.png            48 x 64   (발끝이 아래 중앙)
//   table.png             96 x 64   (테이블 중심 기준)
//   station.png          110 x 70   (조리대 중심 기준)
//   food_<메뉴id>.png     36 x 24   (예: food_tteok.png)
//   cust_<손님id>.png     44 x 60   (예: cust_student.png, 발끝이 아래 중앙)
//
// 도트(픽셀아트)가 선명하게 보이도록 확대 시 보간을 끕니다.

const Sprites = {
  images: {},

  load() {
    const keys = [
      'player', 'table', 'station',
      ...MENUS.map(m => 'food_' + m.id),
      ...CUSTOMERS.map(c => 'cust_' + c.id)
    ];
    keys.forEach(key => {
      const img = new Image();
      img.onload = () => { Sprites.images[key] = img; };
      img.onerror = () => {}; // 파일 없으면 폴백 그래픽 사용
      img.src = 'assets/sprites/' + key + '.png';
    });
  },

  has(key) {
    return !!Sprites.images[key];
  },

  // (cx, cy)를 중심으로 w x h 크기로 그림
  drawCenter(ctx, key, cx, cy, w, h) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Sprites.images[key], cx - w / 2, cy - h / 2, w, h);
  },

  // (fx, fy)가 발끝(아래 중앙)이 되도록 그림 — 캐릭터용
  drawFeet(ctx, key, fx, fy, w, h) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Sprites.images[key], fx - w / 2, fy - h, w, h);
  }
};
