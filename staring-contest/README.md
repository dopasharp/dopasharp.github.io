# 👁️ 눈싸움

먼저 깜빡이면 진다. 전면 카메라가 내 눈을 읽어서 깜빡이는 순간을 잡아내는 눈싸움 게임.

👉 https://dopasharp.github.io/staring-contest/

- **혼자 하기**: 졸린 고양이 → 부엉이 → 압박 면접관 → 물고기(보스). 이기면 다음 상대가 열려요.
  상대는 하품·웃긴 표정·확대·파리·바람·"깜빡한 척"·말 걸기로 계속 방해하고, 오래 버틸수록 방해가 잦아져요.
  양쪽 다 눈이 충혈되고 12초부터 눈물이 나요. 물고기는 눈꺼풀이 없어서 30초 버티면 승리.
- **친구랑 1:1 (아바타 모드)**: 방을 만들고 링크/4자리 코드로 초대. 내 눈·입·눈썹·고개 기울기가
  캐릭터(곰·토끼·개구리·병아리)로 상대 화면에 실시간으로 보여요. 둘 다 "준비 완료"를 누르면 시작.
- 결과 화면: 깜빡한 순간 사진(폰 안에서만 만들어짐), 결과 공유, 사진 저장.

## 개인정보

- 카메라 영상은 **폰 안에서만** MediaPipe Face Landmarker로 처리하고, 저장하거나 전송하지 않아요.
- 1:1에서 서버로 가는 건 숫자뿐이에요: 눈 뜬 정도(좌/우), 입 벌림, 눈썹, 고개 기울기, 얼굴 보임 여부(초당 10번),
  준비 상태, 깜빡인 시각. 방에서 나가면 내 데이터는 지워져요.

## 판정

- 시작할 때 **눈 뜨기 → 눈 감기**로 보정해서, 사람마다 다른 눈 크기에 맞춰 기준을 잡아요.
- 깜빡임 점수가 기준을 **2프레임 연속** 넘으면 "깜빡!" (순간적인 인식 튐은 무시).
- 얼굴이 1.2초 넘게 안 보이면(가리기, 다른 앱으로 나가기) 반칙패.
- 1:1은 서버 시간에 맞춰 동시에 시작하고, 각자 폰이 자기 눈을 판정해서 깜빡인 시각을 올려요.
  첫 기록이 오면 0.8초 기다렸다가 비교하고, 0.04초 이내면 무승부. 90초 동안 아무도 안 깜빡이면 무승부.

## Firebase 설정 (1:1을 서로 다른 폰끼리 하려면)

`js/firebase-config.js`가 비어 있으면 **로컬 테스트 모드**예요. 같은 브라우저의 탭끼리만 1:1이 돼요.

**방법 A. 소원의 연못(wish-pond) Firebase 프로젝트를 같이 쓰기** (익명 로그인이 이미 켜져 있어서 간단해요)
1. Firebase 콘솔 › wish-pond 프로젝트 › Realtime Database › **규칙** 탭을 열어요.
2. 기존 규칙의 `"rules"` 안에, `"wishPond": {...}` 옆에 [`database.rules.json`](database.rules.json)의
   `"stareDown": {...}` 블록을 그대로 추가하고 **게시**해요. (기존 wishPond 규칙은 건드리지 않아요)
3. wish-pond 저장소의 `js/firebase-config.js` 값을 이 폴더의 `js/firebase-config.js`에 복사해요.

**방법 B. 새 프로젝트 만들기**
1. [Firebase 콘솔](https://console.firebase.google.com) › 프로젝트 추가.
2. Realtime Database 만들기 (싱가포르 `asia-southeast1` 추천) › 규칙 탭에 `database.rules.json` 전체를 붙여넣고 게시.
3. Authentication › 시작하기 › 로그인 방법 › **익명** 사용 설정.
4. 프로젝트 설정 › 웹 앱 추가 › `firebaseConfig` 값을 `js/firebase-config.js`에 붙여넣기 (`databaseURL` 필수).

DB 규칙이 지키는 것: 방 코드는 4자리 숫자, 2시간 지난 방만 다시 쓸 수 있음, 내 자리·내 얼굴 값·내 아웃 기록만 쓸 수 있음,
아웃 기록과 시작 시각은 한 번 쓰면 못 바꿈, 얼굴 값은 0~1 숫자만.

무료(Spark) 요금제는 동시 접속 100개까지예요. 1:1 한 판에 2개씩 써요.

## 테스트

```bash
# 저장소 루트에서
python3 -m http.server 4180
```

- `http://localhost:4180/staring-contest/` (localhost는 HTTP여도 카메라가 켜져요)
- 주소에 `?test`를 붙이면 카메라 없이 **스페이스바**(또는 화면의 버튼을 꾹)로 눈을 감는 테스트 모드.
- 1:1은 같은 브라우저에서 탭 두 개로: 한 탭에서 방 만들기 → 다른 탭에서 `?test&room=코드`.
- `?local`을 붙이면 Firebase 설정이 있어도 로컬 모드로 동작해요.

## 파일

```
index.html             화면 + 스타일
js/main.js             화면 흐름, 혼자 하기(상대·방해 공작), 1:1(대기실·동시 시작·판정), 결과 사진
js/face.js             카메라 + MediaPipe 눈 인식, 보정, 패배 순간 사진, ?test 모드
js/avatar.js           캐릭터 그리기 (눈꺼풀·충혈·눈물·입·눈썹·기울기)
js/net.js              1:1 연동 (Firebase RTDB + 익명 로그인 / 로컬 BroadcastChannel)
js/sound.js            WebAudio 효과음, 진동
js/firebase-config.js  Firebase 설정 (비어 있으면 로컬 모드)
database.rules.json    Realtime Database 규칙 (stareDown 경로)
dopasharp/             도파# 공통 프레임 (wish-pond 복사본 + 게임 목록에 staring-contest 추가)
```

이 게임은 허브 저장소(`dopasharp.github.io`)의 폴더로 들어가 있어서 `/staring-contest/` 주소로 열려요.
다른 게임처럼 별도 저장소로 옮기려면 이 폴더를 새 저장소 `staring-contest`의 루트에 그대로 올리고, 허브에서는 폴더를 지우면 돼요.
