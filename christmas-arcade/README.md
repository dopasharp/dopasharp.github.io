# 🎄 도파# 크리스마스 오락실

여러 명이 같이 돌아다니는 3D 크리스마스 오락실. 인형뽑기는 [claw-machine](https://github.com/dopasharp/claw-machine)의 기계·집게·인형 물리를 그대로 가져왔어요.

👉 https://dopasharp.github.io/christmas-arcade/

- **폰 하나로**: 화면 왼쪽 아래 조이스틱으로 걷고, 오른쪽 버튼으로 플레이.
- **PC**: `WASD` 이동 · `E` 플레이 · `Q` 인사 · `Esc` 나가기 · `V` 집게 시점.
- **PC + 폰 조종기**: PC 오른쪽 아래 **폰으로 조종**을 누르고 QR을 스캔하면 폰이 조이스틱이 돼요 (`pad.html`).

## 지금 들어 있는 것

| | 오락기 | 상태 |
|---|---|---|
| 🧸 | 인형뽑기 | 플레이 가능 · 코인 1번 = 🎟️1 · 뽑으면 🎟️+3 · 다른 사람은 집게 움직임을 구경 |
| ⏱️ | 10초 맞추기 | 플레이 가능 · 3초 뒤 숫자가 사라짐 · ±0.03초 🎟️+10 |
| 🎡 | 행운 룰렛 | 플레이 가능 · 꽝/1/2/3/5 · 다른 사람 화면에서도 같이 돌아감 |
| 🏀 🎯 🎁 | 농구 · 핀볼 · 선물 교환소 | 모델만 (COMING SOON) |

- 기계 하나에 한 명. 누가 하고 있으면 `E`로 **줄 서기** → 캐릭터가 기계 앞에 순서대로 서요.
- 내 차례가 오면 10초 안에 `E`. 안 누르면 다음 사람에게 넘어가요.
- 하는 사람의 연결이 15초 넘게 끊기면 자리가 비어요. 줄 선 사람이 있는데 20초 동안 아무것도 안 하면 자동으로 비켜 줘요.
- 🎟️ 티켓은 **재미용**이에요. 기기마다(localStorage) 따로 저장되고 매일 최소 10장으로 충전돼요. 서버 검증이 없어서 조작할 수 있으니 경품·순위에 쓰지 마세요.

## Firebase 설정 (멀티플레이 켜기)

`js/firebase-config.js`가 `YOUR_…` 그대로면 **로컬 테스트 모드**예요. 혼자서는 다 할 수 있고, 같은 브라우저의 탭끼리만 서로 보여요. 다른 기기끼리 만나려면:

1. [Firebase 콘솔](https://console.firebase.google.com) → **프로젝트 추가** (예: `dopasharp-arcade`). 인형뽑기 프로젝트와 따로 만드는 걸 추천해요.
2. 빌드 → **Authentication** → 시작하기 → 로그인 방법 → **익명** 사용 설정.
3. Authentication → 설정 → **승인된 도메인**에 `dopasharp.github.io` 추가.
4. 빌드 → **Realtime Database** → 데이터베이스 만들기 (위치: 싱가포르 `asia-southeast1`, 잠금 모드).
5. Realtime Database → **규칙** 탭에 [`database.rules.json`](database.rules.json) 내용을 붙여넣고 **게시**.
6. 프로젝트 설정(⚙️) → 내 앱 → **웹 앱(</>) 추가** → `firebaseConfig` 값을 [`js/firebase-config.js`](js/firebase-config.js)에 붙여넣기 (`databaseURL` 꼭 포함).

> 웹 설정값(apiKey 등)은 공개돼도 되는 값이에요. 보안은 익명 로그인 + DB 규칙으로 지켜요. Firestore·Cloud Functions는 아직 안 써요 (무료 Spark 요금제로 충분).

설정 후에도 주소에 `?local`을 붙이면 로컬 모드로 테스트할 수 있어요.

## 로컬 실행

```bash
# 저장소 루트(dopasharp.github.io)에서
python -m http.server 4180
```

http://localhost:4180/christmas-arcade/ 를 탭 두 개로 열면 두 캐릭터가 같은 오락실에 있어요.

## 파일 구조

```
index.html            오락실 (입장 화면 · HUD · 터치 조작)
pad.html              폰 조종기 (PC 화면의 QR로 들어옴)
css/arcade.css        스타일
js/main.js            장면 · 캐릭터 이동/충돌 · 카메라 · 멀티플레이 · 대기열 · 티켓
js/world.js           맵 (바닥·벽·트리·장식·눈) · 오락기 모델 · 충돌 상자 · 기계 자리(MACHINES)
js/claw.js            인형뽑기 기계 모듈 (claw-machine/js/machine.js 에서 옮김)
js/avatar.js          캐릭터 (옷 6종 · 걷기/인사 애니메이션 · 닉네임 표시)
js/minigames.js       10초 맞추기 · 행운 룰렛
js/net.js             Firebase 익명 로그인 + RTDB / 로컬(BroadcastChannel) 연동
js/sound.js           효과음 (claw-machine 과 같음)
js/firebase-config.js Firebase 설정
database.rules.json   Realtime Database 보안 규칙
dopasharp/            도파# 공통 브랜드 프레임 (원본: soju-game/dopasharp/)
```

### 연동 데이터 (`arcade/xmas`)

| 경로 | 쓰는 사람 | 내용 |
| --- | --- | --- |
| `players/{uid}` | 본인만 | 닉네임·옷·위치·방향·상태. 움직일 때 최대 10회/초, 가만히 있으면 3초마다. 끊기면 삭제 |
| `machines/{id}/player` | 트랜잭션 | 지금 하는 사람 `{uid, n, beat}`. 3초마다 beat, 15초 멈추면 비어 있는 걸로 봄 |
| `machines/{id}/queue/{uid}` | 본인만 | 줄 선 순서 `{n, at}` |
| `machines/{id}/live` | 하는 사람만 | 구경용 화면 상태 (집게 위치, 룰렛 각도, 10초 화면) |
| `pads/{코드}` | PC/폰 | QR 조종기: `owner`(PC) · `pad`(폰 접속) · `in`(조이스틱/버튼) · `ui`(버튼 글자) |

## 다음 단계

- 허브(`games.js`)에 한 줄 추가해서 공개 (Firebase 설정 후)
- 농구 · 핀볼 플레이
- 선물 교환소: 티켓 → 꾸미기 아이템 (서버 검증이 필요하면 Cloud Functions, Blaze 요금제 필요)
- 12/1~12/24 날짜별 이벤트 (트리 장식 하나씩, 매일 보너스 티켓)
