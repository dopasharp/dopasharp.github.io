# 도파# · dopa.shap

**쓸데없지만, 심심하니까.** 누르면 재밌는 것들만 모아둔 도파# 게임 허브.

👉 https://dopasharp.github.io

| | 놀거리 | 주소 |
|---|---|---|
| 🎰 | 랜덤 뽑기 | [/gacha-capsule/](https://dopasharp.github.io/gacha-capsule/) |
| 🐊 | 악어 이빨 게임 | [/croc-chomp/](https://dopasharp.github.io/croc-chomp/) |
| 🎟️ | 생일 복권 | [/hbd-lotto/](https://dopasharp.github.io/hbd-lotto/) |
| 🎂 | 생일 축하 파티 | [/birthday-hoo/](https://dopasharp.github.io/birthday-hoo/) |
| 🪓 | 도끼 던지기 | [/axe-throwing/](https://dopasharp.github.io/axe-throwing/) |
| 🪞 | 진실의 거울 | [/truth-mirror/](https://dopasharp.github.io/truth-mirror/) |
| 🍶 | 짠! 소주 따르기 | [/soju-game/](https://dopasharp.github.io/soju-game/) |
| 🍫 | 빼빼로게임 | [/ppro_game/](https://dopasharp.github.io/ppro_game/) |
| 🪙 | 소원의 연못 | [/wish-pond/](https://dopasharp.github.io/wish-pond/) |
| 👁️ | 눈싸움 | [/blink-battle/](https://dopasharp.github.io/blink-battle/) |
| ✉️ | 내기 보물찾기! | [/bet-room/](https://dopasharp.github.io/bet-room/) |
| 🧸 | 인형뽑기 | [/claw-machine/](https://dopasharp.github.io/claw-machine/) |

전체 게임 목록은 [/games/](https://dopasharp.github.io/games/)에 있어요. 각 게임의 "다른 게임 보기"가 이 페이지로 연결되고, `?from=저장소이름`으로 들어오면 방금 한 게임은 목록에서 빠지고 돌아가기 링크가 생겨요.

새 게임을 추가하려면 `games.js`의 `DOPA_GAMES` 배열에 한 줄(`code` 포함) 추가하면 됩니다. 홈과 /games/, 그리고 각 게임 헤더(`dopasharp/dopasharp.js`가 이 파일을 허브에서 불러와요)가 모두 같은 목록을 써요. 순서가 `도파# 00N` 번호가 되고, `code`는 게임 헤더의 `GAME 00N / CODE`에 나와요. 게임 저장소는 따로 고칠 필요 없어요.

로컬 실행: `python -m http.server 4180` 후 http://localhost:4180
