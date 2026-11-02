// The one 도파# game list. Its order sets the 도파# 00N numbers on the hub and in every game's header
// (each game repo mirrors it in dopasharp/dopasharp.js). Add a game here, then update that copy.
window.DOPA_GAMES = [
  { id: 'soju-game',     emoji: '🍶', name: '짠! 소주 따르기', hook: '회사에서 몰래? 소주 따르기!',  tags: ['solo', 'duo', 'party'],  meta: ['폰 2대', '술자리'] },
  { id: 'ppro_game',     emoji: '🍫', name: '빼빼로게임',     hook: '만나서 즐겨요. 폰사이를 넘나드는 곰돌이', tags: ['duo', 'event'],       meta: ['폰 2대'] },
  { id: 'croc-chomp',    emoji: '🐊', name: '악어 이빨 게임', hook: '우리 악어는 물어요. 이빨을 눌러보세요.',         tags: ['solo', 'duo', 'party'], meta: ['돌아가며', '3D'] },
  { id: 'hbd-lotto', emoji: '🎟️', name: '생일 복권', hook: '확률조작! 100% 당첨복권. 친구에게 도파민을 선물하세요', tags: ['duo', 'event'], meta: ['생일', '복권'] },
  { id: 'birthday-hoo',  emoji: '🎂', name: '생일 케이크', hook: '촛불을 못 불 땐? 도파# 케이크를 불어보세요!',    tags: ['solo', 'duo', 'party', 'event'],         meta: ['보내기', '마이크'] },
  { id: 'axe-throwing',  emoji: '🪓', name: '도끼 던지기',    hook: '스트레스 해소엔 도끼던지기!! 더 생길수도..', tags: ['solo', 'duo', 'party'], meta: ['폰 2대', '동작 센서'] },
  { id: 'truth-mirror',  emoji: '🪞', name: '진실의 거울',    hook: '거울은 솔직해요. 가끔은 너무요.',     tags: ['solo', 'party'], meta: ['카메라', '장난'] },
  { id: 'gacha-capsule', emoji: '🎰', name: '랜덤 뽑기',     hook: '오늘의 운, 한 번 뽑아보세요.',        tags: ['solo', 'party'],          meta: ['혼자', '행운 테스트'] },
  { id: 'blanket-game', emoji: '🛌', name: '이불뺏기 게임', hook: '재미를 준비하고 있어요. 잠시만요!', tags: [], meta: ['COMING SOON'], comingSoon: true },
];
window.DOPA_FILTERS = [
  ['all', '전체'], ['solo', '혼자서'], ['duo', '둘이서'], ['party', '모임에서'], ['event', '이벤트'],
];
