// ===== 게임 기본 설정 =====
const GAME = {
  W: 640,
  H: 460,
  DAY_MS: 120000,        // 하루 영업 시간 (ms)
  PATIENCE_MS: 22000,    // 기본 손님 인내심 (ms)
  SPEED: 190,            // 플레이어 이동 속도 (px/s)
  SAVE_KEY: 'bunsik-tycoon-save-v1'
};

// ===== 메뉴 데이터 =====
// cost: 레시피 상점 구매 가격 (0이면 기본 보유)
// shape: 스프라이트가 없을 때 기본 그래픽 모양 (bowl / noodle / roll / skewer / sundae / plate)
// 스프라이트 파일명: assets/sprites/food_<id>.png
const MENUS = [
  { id: 'eomuk',    name: '어묵',   price: 2000, cookMs: 1800, cost: 0,     shape: 'skewer', c1: '#0F6E56', c2: '#5DCAA5' },
  { id: 'gimbap',   name: '김밥',   price: 3000, cookMs: 2500, cost: 0,     shape: 'roll',   c1: '#3B6D11', c2: '#97C459' },
  { id: 'tteok',    name: '떡볶이', price: 4500, cookMs: 3200, cost: 12000, shape: 'bowl',   c1: '#D85A30', c2: '#F0997B' },
  { id: 'ramyeon',  name: '라면',   price: 5000, cookMs: 4200, cost: 22000, shape: 'noodle', c1: '#BA7517', c2: '#FAC775' },
  { id: 'sundae',   name: '순대',   price: 6500, cookMs: 3800, cost: 40000, shape: 'sundae', c1: '#444441', c2: '#888780' },
  { id: 'donkatsu', name: '돈까스', price: 9000, cookMs: 5400, cost: 70000, shape: 'plate',  c1: '#993C1D', c2: '#F0997B' }
];

// ===== 손님 타입 데이터 (도감) =====
// weight: 등장 확률 가중치 (클수록 자주 등장)
// tip: 결제 배율 (가격 x tip), pat: 인내심 배율
// 스프라이트 파일명: assets/sprites/cust_<id>.png
const CUSTOMERS = [
  { id: 'student',  name: '학생',          weight: 30, tip: 1.0,  pat: 1.0,  body: '#378ADD' },
  { id: 'office',   name: '회사원',        weight: 25, tip: 1.1,  pat: 0.9,  body: '#5F5E5A' },
  { id: 'ajeossi',  name: '동네 아저씨',   weight: 20, tip: 1.0,  pat: 1.2,  body: '#993C1D' },
  { id: 'grandma',  name: '할머니',        weight: 10, tip: 1.3,  pat: 1.4,  body: '#72243E' },
  { id: 'trainer',  name: '헬스 트레이너', weight: 8,  tip: 1.2,  pat: 0.7,  body: '#0F6E56' },
  { id: 'kid',      name: '유치원생',      weight: 8,  tip: 1.0,  pat: 0.6,  body: '#EF9F27' },
  { id: 'youtuber', name: '먹방 유튜버',   weight: 4,  tip: 2.0,  pat: 0.8,  body: '#D4537E' },
  { id: 'critic',   name: '음식 평론가',   weight: 3,  tip: 2.5,  pat: 0.7,  body: '#534AB7' },
  { id: 'celeb',    name: '연예인',        weight: 2,  tip: 3.0,  pat: 0.55, body: '#E24B4A' }
];

function rarityLabel(weight) {
  if (weight >= 20) return '흔함';
  if (weight >= 8)  return '보통';
  if (weight >= 3)  return '희귀';
  return '전설';
}

function won(n) {
  return n.toLocaleString('ko-KR') + '원';
}
