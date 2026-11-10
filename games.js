// The one 도파# game list. Its order sets the 도파# 00N numbers on the hub and in every game's header:
// each game's dopasharp/dopasharp.js loads this file from the hub, so adding a game here is all it takes. code is the header's GAME 00N / CODE.
window.DOPA_GAMES = [
  { id: 'soju-game', code: 'SOJU', emoji: '🍶', name: '짠! 소주 따르기', hook: '회사에서 몰래? 소주 따르기!',  tags: ['solo', 'duo', 'party'],  meta: ['폰 2대', '술자리'] },
  { id: 'ppro_game', code: 'PEPERO', emoji: '🍫', name: '빼빼로게임',     hook: '만나서 즐겨요. 폰사이를 넘나드는 곰돌이', tags: ['duo', 'event'],       meta: ['폰 2대'] },
  { id: 'croc-chomp', code: 'CROC', emoji: '🐊', name: '악어 이빨 게임', hook: '우리 악어는 물어요. 이빨을 눌러보세요.',         tags: ['solo', 'duo', 'party'], meta: ['돌아가며', '3D'] },
  { id: 'hbd-lotto', code: 'LOTTO', emoji: '🎟️', name: '생일 복권', hook: '확률조작! 100% 당첨복권. 친구에게 도파민을 선물하세요', tags: ['duo', 'event'], meta: ['생일', '복권'] },
  { id: 'birthday-hoo', code: 'BIRTHDAY', emoji: '🎂', name: '생일 케이크', hook: '촛불을 못 불 땐? 도파# 케이크를 불어보세요!',    tags: ['solo', 'duo', 'party', 'event'],         meta: ['보내기', '마이크'] },
  { id: 'axe-throwing', code: 'AXE', emoji: '🪓', name: '도끼 던지기',    hook: '스트레스 해소엔 도끼던지기!! 더 생길수도..', tags: ['solo', 'duo', 'party'], meta: ['폰 2대', '동작 센서'] },
  { id: 'truth-mirror', code: 'MIRROR', emoji: '🪞', name: '진실의 거울',    hook: '거울은 솔직해요. 가끔은 너무요.',     tags: ['solo', 'party'], meta: ['카메라', '장난'] },
  { id: 'gacha-capsule', code: 'GACHA', emoji: '🎰', name: '랜덤 뽑기',     hook: '오늘의 운, 한 번 뽑아보세요.',        tags: ['solo', 'party'],          meta: ['혼자', '행운 테스트'] },
  { id: 'wish-pond', code: 'WISH', emoji: '🪙', name: '소원의 연못',  hook: '내가 꾸민 동전을 던져 소원을! 거북 등에 올리면 대길', tags: ['solo', 'party', 'event'], meta: ['QR', '3D', '여러 명'] },
  { id: 'blink-battle', code: 'BLINK', emoji: '👁️', name: '눈싸움', hook: '먼저 깜빡이면 진다. 카메라가 다 보고 있어요.', tags: ['solo', 'duo'], meta: ['카메라', '실시간 1:1'] },
  { id: 'bet-room', code: 'BET', emoji: '✉️', name: '내기 보물찾기!', hook: '내기 봉투를 숨기고, 먼저 찾으면 이겨요!', tags: ['solo', 'duo'], meta: ['방 코드', '3D'] },
];
window.DOPA_FILTERS = [
  ['all', '전체'], ['solo', '혼자서'], ['duo', '둘이서'], ['party', '모임에서'], ['event', '이벤트'],
];
