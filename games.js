// The one 도파# game list. Its order sets the 도파# 00N numbers on the hub and in every game's header:
// each game's dopasharp/dopasharp.js loads this file from the hub, so adding a game here is all it takes. code is the header's GAME 00N / CODE.
// Never reorder or remove a line (that renumbers every game after it). New games go at the end.
// Hub display: group = 'bet' (내기) | 'solo' (혼자 놀기) | 'event' (이벤트·선물), rank = order inside the group (lower = higher up),
// play = what you need to start, quick = playable right away on one phone, hidden = kept for numbering but not listed.
window.DOPA_GAMES = [
  { id: 'soju-game', code: 'SOJU', emoji: '🍶', name: '짠! 소주 따르기', hook: '회사에서 몰래? 소주 따르기!',  tags: ['solo', 'duo', 'party'],  meta: ['폰 2대', '술자리'], group: 'solo', rank: 2, play: '💻📱 PC + 폰 / 폰 2대' },
  { id: 'ppro_game', code: 'PEPERO', emoji: '🍫', name: '빼빼로게임',     hook: '만나서 즐겨요. 폰사이를 넘나드는 곰돌이', tags: ['duo', 'event'],       meta: ['폰 2대'], group: 'event', rank: 3, play: '📱📱 둘이 1대씩' },
  { id: 'croc-chomp', code: 'CROC', emoji: '🐊', name: '악어 이빨 게임', hook: '우리 악어는 물어요. 이빨을 눌러보세요.',         tags: ['solo', 'duo', 'party'], meta: ['돌아가며', '3D'], group: 'bet', rank: 1, play: '📱 폰 1대', quick: true },
  { id: 'hbd-lotto', code: 'LOTTO', emoji: '🎟️', name: '생일 복권', hook: '확률조작! 100% 당첨복권. 친구에게 도파민을 선물하세요', tags: ['duo', 'event'], meta: ['생일', '복권'], group: 'event', rank: 2, play: '📱 만들어서 보내기', quick: true },
  { id: 'birthday-hoo', code: 'BIRTHDAY', emoji: '🎂', name: '생일 케이크', hook: '촛불을 못 불 땐? 도파# 케이크를 불어보세요!',    tags: ['solo', 'duo', 'party', 'event'],         meta: ['보내기', '마이크'], group: 'event', rank: 1, play: '📱 이름 넣고 보내기', quick: true },
  { id: 'axe-throwing', code: 'AXE', emoji: '🪓', name: '도끼 던지기',    hook: '스트레스 해소엔 도끼던지기!! 더 생길수도..', tags: ['solo', 'duo', 'party'], meta: ['폰 2대', '동작 센서'], group: 'solo', rank: 3, play: '💻📱 PC + 폰 / 폰 2대' },
  { id: 'truth-mirror', code: 'MIRROR', emoji: '🪞', name: '진실의 거울',    hook: '거울은 솔직해요. 가끔은 너무요.',     tags: ['solo', 'party'], meta: ['카메라', '장난'], group: 'bet', rank: 4, play: '📱 폰 1대 · 카메라', quick: true },
  { id: 'gacha-capsule', code: 'GACHA', emoji: '🎰', name: '랜덤 뽑기',     hook: '오늘의 운, 한 번 뽑아보세요.',        tags: ['solo', 'party'],          meta: ['혼자', '행운 테스트'], group: 'solo', rank: 5, play: '📱 폰 1대', quick: true },
  { id: 'wish-pond', code: 'WISH', emoji: '🪙', name: '소원의 연못',  hook: '내가 꾸민 동전을 던져 소원을! 거북 등에 올리면 소원 성취!', tags: ['solo', 'party', 'event'], meta: ['QR', '3D', '여러 명'], group: 'solo', rank: 6, play: '💻📱 큰 화면 + 폰' },
  { id: 'blink-battle', code: 'BLINK', emoji: '👁️', name: '눈싸움', hook: '먼저 깜빡이면 진다. 카메라가 다 보고 있어요.', tags: ['solo', 'duo'], meta: ['카메라', '실시간 1:1'], group: 'bet', rank: 2, play: '📱 폰 1대 · 카메라', quick: true },
  { id: 'bet-room', code: 'BET', emoji: '✉️', name: '내기 보물찾기!', hook: '내기 봉투를 숨기고, 먼저 찾으면 이겨요!', tags: ['solo', 'duo'], meta: ['방 코드', '3D'], group: 'bet', rank: 9, play: '📱 폰 1대', hidden: true },
  { id: 'claw-machine', code: 'CLAW', emoji: '🧸', name: '인형뽑기', hook: 'PC는 기계, 폰은 조이스틱! 코인 5개로 몇 개나 뽑을까?', tags: ['solo', 'duo', 'party'], meta: ['PC + 폰', '3D'], group: 'solo', rank: 4, play: '📱 폰 1대도 OK', quick: true },
  { id: 'snowball-fight', code: 'SNOW', emoji: '☃️', name: '눈덩이 싸움', hook: '초코·딸기·케첩·간장! 눈덩이에 뭘 넣어 던질래?', tags: ['solo', 'duo'], meta: ['실시간 1:1', '소스 6종'], group: 'bet', rank: 3, play: '📱 폰 1대', quick: true },
  { id: 'clover-hunt', code: 'CLOVER', emoji: '🍀', name: '네잎클로버 찾기', hook: '전 세계에 하루 10개. 먼저 찾는 사람이 임자!', tags: ['solo', 'event'], meta: ['매일 낮 12시', '선착순'], group: 'solo', rank: 1, play: '📱 폰 1대', quick: true },
];
// Hub groups, in the order they appear. key matches a game's group; 'quick' shows only games with quick: true.
window.DOPA_GROUPS = [
  { key: 'bet', label: '내기', title: '내기 한 판', desc: '친구랑 겨뤄요. 진 사람이 벌칙!' },
  { key: 'solo', label: '혼자 놀기', title: '혼자 놀기', desc: '일하다 잠깐, 몰래 한 판.' },
  { key: 'event', label: '이벤트·선물', title: '이벤트·선물', desc: '특별한 한 사람에게 보내요.' },
];
window.DOPA_FILTERS = [
  ['all', '전체'], ['quick', '📱 폰 1대로 바로'], ['bet', '내기'], ['solo', '혼자 놀기'], ['event', '이벤트·선물'],
];
