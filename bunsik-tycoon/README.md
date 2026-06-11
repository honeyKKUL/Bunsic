# 분식 타이쿤

하루 단위로 분식집을 운영하는 웹 게임. 캐릭터를 움직여 음식을 조리하고 손님 테이블에 서빙하세요.
순수 HTML/CSS/JS로 만들어져 별도 빌드 없이 GitHub Pages에 바로 배포할 수 있습니다.

## 게임 방법

1. **영업 시작** — 하루 120초 동안 장사합니다.
2. **조리** — 화구를 클릭하면 캐릭터가 이동해 조리를 시작합니다.
3. **서빙** — "완성!" 표시가 뜬 음식을 클릭해 들고, 주문한 손님 테이블을 클릭하면 서빙합니다.
4. **레시피 상점** — 모은 돈으로 더 비싸고 효율 좋은 메뉴를 배웁니다.
5. **손님 도감** — 처음 서빙한 손님 타입이 도감에 등록됩니다. 희귀 손님은 팁을 많이 줍니다.

진행 상황(자산, 레시피, 도감)은 브라우저 localStorage에 자동 저장됩니다.

## 폴더 구조

```
bunsik-tycoon/
├── index.html          화면 구조
├── style.css           UI 스타일
├── js/
│   ├── data.js         메뉴·손님 데이터 (밸런스 조정은 여기서)
│   ├── sprites.js      스프라이트 로더 (이미지 없으면 기본 그래픽)
│   └── game.js         게임 로직
└── assets/
    └── sprites/        직접 그린 PNG를 넣는 곳 (규격은 폴더 안 README 참고)
```

## 로컬에서 실행

파일을 더블클릭해도 대부분 동작하지만, 스프라이트 이미지 로딩까지 확실하게 테스트하려면 로컬 서버를 권장합니다.

```bash
# 프로젝트 폴더에서
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

VS Code를 쓴다면 Live Server 확장으로 열어도 됩니다.

## GitHub Pages 배포

1. GitHub에 새 저장소를 만들고 이 폴더의 파일을 모두 push 합니다.
   ```bash
   git init
   git add .
   git commit -m "분식 타이쿤 초기 버전"
   git branch -M main
   git remote add origin https://github.com/<아이디>/<저장소이름>.git
   git push -u origin main
   ```
2. 저장소의 **Settings → Pages**로 이동합니다.
3. Source를 **Deploy from a branch**, Branch를 **main / (root)** 로 설정하고 저장합니다.
4. 잠시 후 `https://<아이디>.github.io/<저장소이름>/` 에서 플레이할 수 있습니다.

모든 경로가 상대 경로라서 저장소 이름이 무엇이든 그대로 동작합니다.

## 커스터마이징 포인트

- **메뉴 추가/밸런스**: `js/data.js`의 `MENUS` 배열. 가격, 조리 시간, 상점 가격을 자유롭게 조정하세요.
- **손님 타입 추가**: `js/data.js`의 `CUSTOMERS` 배열. weight(등장 확률), tip(팁 배율), pat(인내심 배율)로 개성을 만듭니다.
- **난이도**: `js/data.js`의 `GAME` 상수(하루 길이, 인내심, 이동 속도)와 `js/game.js`의 `spawnBase` 계산식.
- **그래픽 교체**: `assets/sprites/README.md` 참고.
