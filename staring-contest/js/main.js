// 눈싸움: 화면 흐름, 혼자 하기(vs 캐릭터), 친구랑 1:1.
import { EyeTracker, testMode } from './face.js';
import { drawAvatar, SKINS, PLAYER_SKINS } from './avatar.js';
import { sfx, buzz, unlockAudio, setSound, sound } from './sound.js';
import * as Net from './net.js';

const $ = (id) => document.getElementById(id);
const track = (name, params) => { try { window.DopaSharp && window.DopaSharp.track(name, params); } catch {} };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sec = (ms) => (Math.max(0, ms) / 1000).toFixed(2);
const r2 = (v) => Math.round(v * 100) / 100;

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('stare:' + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stare:' + k, JSON.stringify(v)); } catch {} },
};

// ---------------------------------------------------------------- 상대들
const ALL_EV = ['face', 'zoom', 'fly', 'wind', 'fake', 'talk'];
const FOES = [
  { id: 'cat', skin: 'cat', lv: 'LV.1', desc: '자꾸 하품해요. 몸풀기 상대', give: [6, 10], gap: [2.6, 3.8], ev: ['face', 'fake', 'talk', 'talk'],
    lines: ['냥…', '하아암~', '(꾸벅)', '졸려…', '츄르 줘'], taunt: '고양이한테 졌어요… 고양이는 졸고 있었는데요.', cry: '냥아악 눈 시려!!' },
  { id: 'owl', skin: 'owl', lv: 'LV.2', desc: '원래 눈이 커요. 방해도 잦아요', give: [12, 17], gap: [2.0, 3.0], ev: ALL_EV,
    lines: ['부엉?', '밤샘은 내 전문', '부엉부엉!', '후우우~', '눈 좀 감지?'], taunt: '부엉이는 밤새 안 깜빡여요. 연습하고 오세요.', cry: '부어어엉 눈 말라!!' },
  { id: 'boss', skin: 'boss', lv: 'LV.3', desc: '"그래서 본인의 단점은요?"', give: [20, 27], gap: [1.6, 2.5], ev: ALL_EV,
    lines: ['그래서 본인의 단점은요?', '연봉은 얼마 생각하세요?', '그건 경험이 아니죠.', '1분 자기소개 해보세요.', '다른 회사도 지원하셨죠?', '저희가 왜 뽑아야 하죠?', '공백기엔 뭐 하셨어요?'],
    taunt: '"아쉽지만 이번에는 함께하기 어렵게 되었습니다."', cry: '…합격입니다. 눈 좀 감을게요.' },
  { id: 'fish', skin: 'fish', lv: 'BOSS', desc: '눈꺼풀이 없어요. 30초 버티면 승리', goal: 30, gap: [1.3, 2.1], ev: ALL_EV,
    lines: ['뻐끔', '뻐끔뻐끔', '…(안 깜빡임)', '나는 눈꺼풀이 없지', '물 좀 마실래?'], taunt: '물고기는 원래 안 깜빡여요. 애초에 불공평했어요.', cry: '…졌다. 뻐끔.' },
];
let solo = store.get('solo', { beaten: {}, best: {} });
const unlocked = (i) => i === 0 || !!solo.beaten[FOES[i - 1].id];

// ---------------------------------------------------------------- 화면 전환
const SCREENS = ['home', 'pick', 'duo', 'setup', 'arena', 'result'];
let screen = 'home';
function show(id) {
  SCREENS.forEach((s) => { $(s).hidden = s !== id; });
  screen = id;
  window.scrollTo(0, 0);
  if (id === 'arena') requestAnimationFrame(fitCanvas);
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => goHome()));

function goHome() {
  game = null;
  leaveRoom();
  clearFx();
  show('home');
}

// ---------------------------------------------------------------- 소리 버튼
const soundBtn = $('soundBtn');
const paintSound = () => { soundBtn.textContent = sound.on ? '🔊' : '🔇'; soundBtn.setAttribute('aria-label', sound.on ? '소리 끄기' : '소리 켜기'); };
soundBtn.onclick = () => { unlockAudio(); setSound(!sound.on); paintSound(); };
paintSound();

// ---------------------------------------------------------------- 카메라 준비 + 보정
const video = $('video');
const eyes = new EyeTracker(video);
let camReady = false;
let afterSetup = null;

function ensureCamera(next) {
  if (camReady && eyes.calibrated) { next(); return; }
  afterSetup = next;
  $('setupCam').prepend(video);
  $('setupErr').textContent = '';
  $('camBtn').hidden = false;
  $('camBtn').disabled = false;
  $('camBtn').textContent = camReady ? '눈 인식 다시 맞추기' : '카메라 켜기';
  setMsg('카메라로 눈을 읽어요', '얼굴이 동그라미 안에 오게 해 주세요');
  setBar(0, 0);
  show('setup');
}
function setMsg(big, small = '') { $('setupMsg').innerHTML = ''; $('setupMsg').append(big); if (small) { const s = document.createElement('small'); s.textContent = small; $('setupMsg').append(s); } }
function setBar(pct, ms) { const b = $('setupBar'); b.style.transition = `width ${ms}ms linear`; b.style.width = pct + '%'; }

$('camBtn').onclick = async () => {
  unlockAudio();
  const btn = $('camBtn');
  btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  $('setupErr').textContent = '';
  try {
    if (!camReady) { await eyes.start((m) => setMsg(m)); camReady = true; }
  } catch (e) {
    $('setupErr').textContent = e.message;
    btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = '다시 시도';
    return;
  }
  btn.removeAttribute('aria-busy');
  btn.hidden = true;
  // 얼굴이 보일 때까지 잠깐 기다렸다가 보정
  setMsg('얼굴을 찾는 중…', '밝은 곳에서, 폰을 얼굴 정면에 들어 주세요');
  const found = await waitFace(8000);
  if (!found) return calibFail('얼굴이 안 보여요. 밝은 곳에서 화면 정면을 봐 주세요.');
  setMsg('눈을 크게 뜨고 화면을 보세요 👀');
  const res = await eyes.calibrate((step) => {
    if (step === 'open') setBar(50, 1500);
    if (step === 'shut') { setMsg('이제 눈을 꼭 감으세요 😑', '삐- 소리가 나면 떠요'); sfx.count(); buzz(80); setBar(100, 1500); }
    if (step === 'done') { sfx.go(); buzz([60, 40, 60]); setMsg('좋아요! 눈 인식 완료 ✅'); }
  });
  if (!res.ok) {
    sfx.go();
    return calibFail(res.why === 'face' ? '중간에 얼굴이 사라졌어요. 폰을 고정하고 다시 해 볼까요?' : '눈 감은 게 잘 구분되지 않아요. 더 밝은 곳에서, 안경 반사를 피해서 다시 해 주세요.');
  }
  setTimeout(() => { const f = afterSetup; afterSetup = null; f && f(); }, testMode ? 0 : 700);
};
function calibFail(msg) {
  setBar(0, 0);
  setMsg('다시 한 번 해 볼까요?');
  $('setupErr').textContent = msg;
  $('camBtn').hidden = false; $('camBtn').disabled = false; $('camBtn').textContent = '눈 인식 다시 맞추기';
}
function waitFace(ms) {
  return new Promise((resolve) => {
    if (eyes.state.face) return resolve(true);
    const t = setTimeout(() => { off(); resolve(false); }, ms);
    const off = eyes.on((st) => { if (st.face) { clearTimeout(t); off(); resolve(true); } });
  });
}

// ---------------------------------------------------------------- 홈 그림
const heroCanvas = $('heroCanvas');
const heroCtx = heroCanvas.getContext('2d');
const HERO = ['owl', 'cat', 'boss', 'fish'];
function drawHero(now) {
  if (screen !== 'home') return;
  const w = heroCanvas.width, h = heroCanvas.height, g = heroCtx;
  const skin = HERO[Math.floor(now / 3200) % HERO.length];
  const k = (now % 3200) / 3200;
  const blink = skin !== 'fish' && k > 0.9 && k < 0.95 ? 0 : 1;
  // 두 캐릭터가 서로 노려봐요 (각자 임시 캔버스에 그려서 겹치기)
  const a = heroTmp(0, w, h), b = heroTmp(1, w, h);
  drawAvatar(a.getContext('2d'), w, h, skin, { lookX: 1, red: k, scale: 0.85, openL: blink, openR: blink }, now);
  drawAvatar(b.getContext('2d'), w, h, 'bear', { lookX: -1, red: k, scale: 0.85, brow: k > 0.6 ? 0.8 : 0 }, now);
  g.clearRect(0, 0, w, h);
  g.drawImage(a, -w * 0.22, 0);
  g.drawImage(b, w * 0.22, 0);
}
const _tmp = [];
function heroTmp(i, w, h) { if (!_tmp[i]) { _tmp[i] = document.createElement('canvas'); _tmp[i].width = w; _tmp[i].height = h; } return _tmp[i]; }

// ---------------------------------------------------------------- 상대 고르기
function renderFoes() {
  const box = $('foes'); box.innerHTML = '';
  FOES.forEach((f, i) => {
    const open = unlocked(i);
    const b = document.createElement('button');
    b.className = 'foe'; b.type = 'button'; b.disabled = !open;
    const c = document.createElement('canvas'); c.width = 144; c.height = 144;
    drawAvatar(c.getContext('2d'), 144, 144, f.skin, { scale: 1.15, openL: open ? 1 : 0, openR: open ? 1 : 0 });
    const mid = document.createElement('span');
    mid.innerHTML = `<span class="lv"></span><b></b><small></small>`;
    mid.querySelector('.lv').textContent = f.lv + (solo.beaten[f.id] ? ' · 격파 ✓' : '');
    mid.querySelector('b').textContent = open ? SKINS[f.skin].name : '???';
    mid.querySelector('small').textContent = open ? f.desc : '앞 상대를 이기면 열려요 🔒';
    const rec = document.createElement('span'); rec.className = 'rec';
    rec.textContent = solo.best[f.id] ? `최고 ${sec(solo.best[f.id])}초` : '';
    b.append(c, mid, rec);
    b.onclick = () => { unlockAudio(); ensureCamera(() => startSolo(f)); };
    box.append(b);
  });
}
$('goSolo').onclick = () => { unlockAudio(); renderFoes(); show('pick'); };

// ---------------------------------------------------------------- 경기장 공통
const foeCanvas = $('foeCanvas');
const foeCtx = foeCanvas.getContext('2d');
const overlay = $('overlay');
const stage = $('stage');
function fitCanvas() {
  const r = foeCanvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  foeCanvas.width = Math.max(1, Math.round(r.width * dpr));
  foeCanvas.height = Math.max(1, Math.round(r.height * dpr));
}
addEventListener('resize', () => { if (screen === 'arena') fitCanvas(); });

function enterArena(mode) {
  $('cam').prepend(video);
  overlay.innerHTML = '';
  clearFx();
  stage.classList.remove('danger', 'shake');
  $('timer').textContent = '0.00';
  $('lobby').hidden = mode !== 'duo';
  $('vsTag').hidden = mode !== 'duo';
  $('testKey').hidden = !testMode;
  show('arena');
}
function overlayBig(text, cls = 'big') {
  overlay.innerHTML = '';
  const d = document.createElement('div'); d.className = cls; d.textContent = text;
  overlay.append(d);
}
function overlayTip(text) {
  const d = document.createElement('div'); d.className = 'tip'; d.textContent = text; overlay.append(d);
}
let bubbleT;
function say(text, ms = 1600) {
  const b = $('bubble'); b.textContent = text; b.hidden = false;
  // 같은 말풍선이 다시 튀어나오게
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(bubbleT); bubbleT = setTimeout(() => { b.hidden = true; }, ms);
}
function clearFx() { $('fx').innerHTML = ''; $('bubble').hidden = true; clearTimeout(bubbleT); }

// 테스트 모드: 화면 버튼을 꾹 누르면 눈 감기
const tk = $('testKey');
tk.addEventListener('pointerdown', (e) => { e.preventDefault(); eyes.heldKey = true; });
['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => tk.addEventListener(n, () => { eyes.heldKey = false; }));

// 내 눈 게이지
function paintMeter() {
  const st = eyes.state;
  const open = st.face ? (st.openL + st.openR) / 2 : 0;
  $('meterFill').style.width = (clamp(open || 0) * 100).toFixed(0) + '%';
  const span = Math.max(0.1, eyes.shut - eyes.open);
  const line = 1 - clamp((eyes.threshold - eyes.open) / span);
  $('meterLine').style.left = `calc(${(line * 100).toFixed(0)}% - 1px)`;
  $('meterTxt').textContent = !st.face ? '얼굴 없음' : st.closed ? '감음!' : open < line + 0.15 ? '위험…' : '뜬 상태';
  $('cam').classList.toggle('closed', !!st.closed);
  $('cam').classList.toggle('noface', !st.face);
}

// 날아다니는 파리, 바람
function spawnFly(ms) {
  const fx = $('fx');
  const el = document.createElement('div'); el.className = 'fly'; el.textContent = '🪰';
  fx.append(el);
  const w = fx.clientWidth, h = fx.clientHeight;
  const fromLeft = Math.random() < 0.5;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    const x = fromLeft ? -40 + k * (w + 80) : w + 40 - k * (w + 80);
    const toward = 1 - Math.abs(k - 0.5) * 2; // 가운데에서 화면 쪽으로 확 다가와요
    const y = h * 0.35 + Math.sin(k * 14) * h * 0.12 * (1 - toward * 0.5);
    pts.push({ transform: `translate(${x}px, ${y}px) scale(${1 + toward * 2.2}) rotate(${Math.sin(k * 20) * 25}deg)` });
  }
  el.animate(pts, { duration: ms, easing: 'linear' }).onfinish = () => el.remove();
}
function windFx() {
  const el = document.createElement('div'); el.className = 'wind'; el.textContent = '후우우우~~';
  $('fx').append(el); setTimeout(() => el.remove(), 1300);
  stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
}

const EVENTS = {
  face: { dur: 1300, start() { sfx.pop(); }, pose: (k) => ({ jaw: 0.95, brow: 1, shake: 1, roll: Math.sin(k * 20) * 0.25 }) },
  zoom: { dur: 1100, start() { sfx.whoosh(); buzz(60); }, pose: (k) => ({ scale: 1 + Math.sin(k * Math.PI) * 0.8, brow: 0.8 }) },
  fly: { dur: 2400, start() { spawnFly(2400); sfx.buzz(); setTimeout(sfx.buzz, 800); setTimeout(sfx.buzz, 1600); }, pose: (k) => ({ lookX: Math.sin(k * 12) * 0.9, lookY: Math.cos(k * 9) * 0.5 }) },
  wind: { dur: 1200, start() { windFx(); buzz([80, 40, 80]); sfx.whoosh(); }, pose: (k) => ({ roll: Math.sin(k * 30) * 0.12, jaw: 0.45 }) },
  fake: { dur: 1400, start() { say('어? 깜빡…?', 650); setTimeout(() => { if (game && game.state === 'play') say('…한 척 ㅋ', 800); }, 650); }, pose: (k) => (k < 0.35 ? { openL: 0.2, openR: 0.2 } : {}) },
  talk: { dur: 1900, start(f) { say(pick(f.lines), 1900); }, pose: (k) => ({ jaw: Math.abs(Math.sin(k * 18)) * 0.5 }) },
};

// ---------------------------------------------------------------- 게임 상태 + 메인 루프
/** @type {null | any} */
let game = null;
let lastBeat = 0;

function loop(now) {
  requestAnimationFrame(loop);
  if (screen === 'home') drawHero(now);
  if (screen !== 'arena') return;
  paintMeter();
  const W = foeCanvas.width, H = foeCanvas.height;
  if (!game) { drawAvatar(foeCtx, W, H, 'bear', { openL: 0, openR: 0 }, now); return; }
  if (game.mode === 'solo') soloFrame(now, W, H);
  else duoFrame(now, W, H);
}
requestAnimationFrame(loop);

function tension(t) {
  // 심장 소리가 점점 빨라져요
  const period = Math.max(380, 1100 - t * 0.03);
  const now = performance.now();
  if (now - lastBeat > period) { lastBeat = now; sfx.beat(t > 15000 ? 1 : 0); if (t > 15000) buzz(25); }
  stage.classList.toggle('danger', t > 10000);
}

// 내 눈 판정 (공통). 깜빡였거나 얼굴이 1.2초 넘게 사라지면 아웃
function myFoul(now, t) {
  const st = eyes.state;
  if (t < 150) return null;
  if (st.closed) return 'blink';
  const stale = !st.t || now - st.t > 1500; // 다른 앱으로 나갔거나 카메라 멈춤
  if (!st.face || stale) {
    if (!game.noFaceAt) game.noFaceAt = now;
    else if (now - game.noFaceAt > 1200) return 'face';
  } else game.noFaceAt = 0;
  return null;
}

function runCountdown(onGo) {
  game.state = 'count';
  let n = 3;
  const step = () => {
    if (!game || game.state !== 'count') return;
    if (n > 0) { overlayBig(String(n)); sfx.count(); buzz(30); n--; setTimeout(step, 800); }
    else { overlayBig('시작!'); sfx.go(); buzz(120); setTimeout(() => { if (overlay.firstChild && overlay.firstChild.textContent === '시작!') overlay.innerHTML = ''; }, 600); onGo(); }
  };
  step();
}

// ---------------------------------------------------------------- 혼자 하기
function startSolo(foe) {
  enterArena('solo');
  $('foeName').textContent = `VS ${SKINS[foe.skin].name}`;
  $('bestHud').textContent = solo.best[foe.id] ? `최고 ${sec(solo.best[foe.id])}초` : foe.goal ? `목표 ${foe.goal}초` : '';
  game = { mode: 'solo', foe, state: 'ready', t0: 0, ev: null, nextEv: 2000, giveAt: foe.give ? rand(foe.give[0], foe.give[1]) * 1000 : Infinity, end: null };
  overlayBig('준비', 'big');
  overlayTip(testMode ? '테스트 모드: 스페이스바나 아래 버튼을 누르면 눈을 감아요' : '폰을 얼굴 정면에. 깜빡이면 바로 끝나요!');
  track('game_start', { method: 'solo_' + foe.id });
  waitFace(10000).then(() => {
    if (!game || game.mode !== 'solo') return;
    setTimeout(() => runCountdown(() => { game.state = 'play'; game.t0 = performance.now(); }), 600);
  });
}

function soloFrame(now, W, H) {
  const g = game, f = g.foe;
  const t = g.state === 'play' ? now - g.t0 : g.state === 'end' ? g.endT : 0;
  if (g.state === 'play') {
    $('timer').textContent = sec(t);
    tension(t);
    const foul = myFoul(now, t);
    if (foul) return soloLose(foul, t);
    // 방해 공작: 시간이 지날수록 잦아져요
    if (!g.ev && t > g.nextEv) {
      const name = pick(f.ev);
      g.ev = { name, at: now, dur: EVENTS[name].dur };
      EVENTS[name].start(f);
    }
    if (g.ev && now - g.ev.at > g.ev.dur) {
      g.ev = null;
      g.nextEv = t + rand(f.gap[0], f.gap[1]) * 1000 * Math.max(0.5, 1 - t / 40000);
    }
    if (t >= g.giveAt || (f.goal && t >= f.goal * 1000)) return soloWin(t);
  }
  // 상대 표정
  const base = {
    openL: 1, openR: 1,
    jaw: 0.04 + Math.sin(now / 900) * 0.03, brow: 0.1,
    roll: Math.sin(now / 1700) * 0.05, lookX: Math.sin(now / 2300) * 0.25, lookY: 0,
    red: clamp(t / 22000), tears: clamp((t - 12000) / 12000),
  };
  if (f.id === 'cat' && g.state === 'play' && Math.sin(now / 1200) > 0.92) { base.openL = base.openR = 0.55; }
  let pose = base;
  if (g.ev) { const k = clamp((now - g.ev.at) / g.ev.dur); pose = { ...base, ...EVENTS[g.ev.name].pose(k) }; }
  if (g.end) pose = { ...base, ...g.end(now) };
  drawAvatar(foeCtx, W, H, f.skin, pose, now);
}

function soloLose(why, t) {
  const g = game;
  g.state = 'end'; g.endT = t; g.ev = null;
  const shot = why === 'blink' ? eyes.snapshot() : null;
  stage.classList.remove('danger');
  sfx.lose(); buzz([200, 80, 300]);
  overlayBig(why === 'blink' ? '깜빡!' : '얼굴 이탈!', 'stamp');
  say(why === 'blink' ? 'ㅋㅋㅋ 깜빡했다!' : '어디 가요? 반칙패!', 1500);
  const t0 = performance.now();
  g.end = (now) => ({ jaw: 0.6 + Math.abs(Math.sin((now - t0) / 90)) * 0.4, brow: 1, shake: 0.6 });
  setTimeout(() => soloResult(false, t, why, shot), 1500);
}

function soloWin(t) {
  const g = game, f = g.foe;
  g.state = 'end'; g.endT = t; g.ev = null;
  stage.classList.remove('danger');
  sfx.win(); buzz([60, 40, 60, 40, 160]);
  overlayBig('승리!', 'stamp win');
  say(f.cry, 1700);
  const t0 = performance.now();
  g.end = (now) => {
    const k = clamp((now - t0) / 350);
    return f.skin === 'fish' ? { tears: 1, jaw: 0.3, roll: 0.3 } : { openL: 1 - k, openR: 1 - k, tears: 1, red: 1, jaw: 0.5, brow: 1, shake: 0.4 };
  };
  setTimeout(() => soloResult(true, t, 'win', null), 1700);
}

function soloResult(win, t, why, shot) {
  const f = game.foe;
  const prev = solo.best[f.id] || 0;
  const rec = t > prev;
  if (rec) solo.best[f.id] = Math.round(t);
  const idx = FOES.indexOf(f);
  const firstWin = win && !solo.beaten[f.id];
  if (win) solo.beaten[f.id] = true;
  store.set('solo', solo);
  track('game_complete', { method: 'solo_' + f.id, result: win ? 'win' : why, ms: Math.round(t) });
  if (rec && prev) sfx.record();
  const name = SKINS[f.skin].name;
  let line;
  if (win) {
    const next = FOES[idx + 1];
    line = next ? (firstWin ? `🔓 다음 상대 "${SKINS[next.skin].name}"이(가) 열렸어요!` : `${name}을(를) 또 울렸어요.`) : '물고기까지 이겼어요. 당신의 눈은 사막입니다 🏜️';
  } else line = why === 'face' ? '얼굴이 화면 밖으로 나가서 반칙패예요.' : f.taunt;
  showResult({
    win, draw: false, ms: t, rec: rec && prev > 0, line, shot,
    shotLabel: win ? `${name}을(를) 울렸다 😭` : '깜빡한 순간 📸',
    foeSkin: f.skin,
    share: `👁️ 눈싸움 | ${name}에게 ${win ? '승리' : '패배'} · ${sec(t)}초 버팀`,
    title: win ? `${name} 격파!` : `${name}에게 패배`,
    again: () => { ensureCamera(() => startSolo(f)); },
    againLabel: win && FOES[idx + 1] ? '다음 상대로' : '다시 하기',
    againNext: win && FOES[idx + 1] ? () => ensureCamera(() => startSolo(FOES[idx + 1])) : null,
    back: () => { renderFoes(); show('pick'); }, backLabel: '상대 고르기',
  });
}

// ---------------------------------------------------------------- 결과 화면
let resultOpts = null;
function showResult(o) {
  resultOpts = o;
  const v = $('verdict');
  v.textContent = o.draw ? '무승부!' : o.win ? '승리! 🎉' : '깜빡! 패배';
  v.className = 'verdict ' + (o.draw ? '' : o.win ? 'win' : 'lose');
  $('resTime').innerHTML = `${sec(o.ms)}<small>초 버팀</small>`;
  $('newRec').hidden = !o.rec;
  $('resLine').textContent = o.line;
  $('againBtn').textContent = o.againLabel || '다시 하기';
  $('homeBtn').textContent = o.backLabel || '처음으로';
  drawShot(o);
  show('result');
}
$('againBtn').onclick = () => { unlockAudio(); const o = resultOpts; if (!o) return; track('game_retry'); (o.againNext || o.again)(); };
$('homeBtn').onclick = () => { const o = resultOpts; if (o && o.back) o.back(); else goHome(); };
$('shareBtn').onclick = () => {
  const o = resultOpts; if (!o || !window.DopaSharp) return;
  window.DopaSharp.showResult({
    art: o.draw ? '🤝' : o.win ? '😎' : '😵', title: o.title, stat: `${sec(o.ms)}초`, detail: o.line,
    shareText: o.share, retryLabel: o.againLabel, onRetry: () => (o.againNext || o.again)(),
  });
};

// 공유용 사진: 깜빡한 내 얼굴(이 폰 안에서만 만들어져요) 또는 울고 있는 상대
function drawShot(o) {
  const c = $('shot');
  const W = 720, H = 900;
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#15191A'; g.fillRect(0, 0, W, H);
  const ph = H - 170;
  if (o.shot) {
    const s = o.shot, k = Math.max(W / s.width, ph / s.height);
    const dw = s.width * k, dh = s.height * k;
    g.drawImage(s, (W - dw) / 2, (ph - dh) / 2, dw, dh);
  } else {
    const grd = g.createRadialGradient(W / 2, ph * 0.4, 50, W / 2, ph / 2, ph);
    grd.addColorStop(0, '#2a3231'); grd.addColorStop(1, '#0e1211');
    g.fillStyle = grd; g.fillRect(0, 0, W, ph);
    const t = document.createElement('canvas'); t.width = W; t.height = ph;
    const lost = o.win ? o.foeSkin : (o.foeSkin || 'bear');
    drawAvatar(t.getContext('2d'), W, ph, lost, o.win ? { openL: 0, openR: 0, tears: 1, red: 1, jaw: 0.5, brow: 1 } : { jaw: 0.9, brow: 1, red: 0.6 }, 400);
    g.drawImage(t, 0, 0);
  }
  g.fillStyle = '#0B0E0D'; g.fillRect(0, ph, W, H - ph);
  g.fillStyle = o.draw ? '#F7F6F2' : o.win ? '#D9FF44' : '#FF4D6D';
  g.font = '800 54px "Pretendard Variable", system-ui, sans-serif';
  g.textBaseline = 'top';
  g.fillText(`${sec(o.ms)}초`, 36, ph + 28);
  g.fillStyle = '#F7F6F2';
  g.font = '700 30px "Pretendard Variable", system-ui, sans-serif';
  g.fillText(o.shotLabel || '', 36, ph + 96);
  g.fillStyle = '#AAB4AE';
  g.font = '600 24px "Pretendard Variable", system-ui, sans-serif';
  g.textAlign = 'right';
  g.fillText('도파# 눈싸움 👁️', W - 36, ph + 40);
  g.textAlign = 'left';
  c.hidden = false;
}
$('saveShot').onclick = () => {
  const c = $('shot');
  c.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], 'staring-contest.png', { type: 'image/png' });
    track('share_click', { method: 'photo' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '눈싸움' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'staring-contest.png';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
};

// ---------------------------------------------------------------- 친구랑 1:1
let net = null;
let roomCode = null;
let room = {};
let oppUid = null, oppSkin = 'rabbit';
let mySkin = store.get('skin', pick(PLAYER_SKINS));
let lastRound = 0;
let score = { w: 0, l: 0, d: 0 };
let faceTimer = null;
const oppTarget = { l: 1, r: 1, j: 0, b: 0, t: 0, f: true, at: 0 };
const oppPose = { openL: 1, openR: 1, jaw: 0, brow: 0, roll: 0 };

const params = new URLSearchParams(location.search);
function duoErr(msg) { $('duoErr').textContent = msg || ''; }
function openDuo(prefill) {
  duoErr('');
  $('duoMode').textContent = Net.mode === 'local' ? '⚠️ 테스트 모드: 아직 서버(Firebase)가 연결되지 않아서, 같은 브라우저의 다른 탭끼리만 대결할 수 있어요.' : '';
  if (prefill) { $('codeInput').value = prefill; }
  show('duo');
}
$('goDuo').onclick = () => { unlockAudio(); openDuo(); };

async function getNet() {
  if (!net) net = await Net.connect();
  return net;
}
$('makeRoom').onclick = () => {
  unlockAudio();
  const btn = $('makeRoom');
  ensureCamera(async () => {
    show('duo'); btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    try {
      const n = await getNet();
      const code = await n.createRoom();
      await enterRoom(code);
    } catch (e) { console.error(e); show('duo'); duoErr(Net.explainError(e)); }
    finally { btn.disabled = false; btn.removeAttribute('aria-busy'); }
  });
};
$('joinForm').onsubmit = (e) => {
  e.preventDefault();
  unlockAudio();
  const code = $('codeInput').value.trim();
  if (!Net.validCode(code)) { duoErr('방 코드는 숫자 4자리예요.'); return; }
  ensureCamera(async () => {
    show('duo');
    try { await getNet(); await enterRoom(code); }
    catch (err) { console.error(err); show('duo'); duoErr(Net.explainError(err)); }
  });
};

async function enterRoom(code) {
  const r = await net.joinRoom(code, { skin: mySkin });
  if (!r.ok) { show('duo'); duoErr(r.why === 'full' ? '방이 꽉 찼어요. (2명까지)' : '방을 찾을 수 없어요. 코드를 확인해 주세요.'); return; }
  roomCode = code; lastRound = 0; score = { w: 0, l: 0, d: 0 }; oppUid = null; room = {};
  const q = new URLSearchParams(location.search); q.set('room', code);
  history.replaceState(null, '', `${location.pathname}?${q}`);
  game = { mode: 'duo', state: 'lobby', round: 0 };
  enterArena('duo');
  $('roomCode').textContent = code;
  $('foeName').textContent = '1:1 대결';
  $('bestHud').textContent = '';
  renderSkins();
  setReadyBtn(false);
  overlayTip('표정으로 방해하세요! 입 벌리기·눈썹 올리기가 상대 화면의 내 캐릭터에 그대로 보여요.');
  net.watchRoom(onRoom);
  net.watchFaces((uid, f) => { if (!f) return; Object.assign(oppTarget, f, { at: performance.now() }); });
  clearInterval(faceTimer);
  faceTimer = setInterval(sendFace, 100);
  track('game_start', { method: 'duo' });
}

function sendFace() {
  if (!net || !roomCode) return;
  const st = eyes.state;
  net.sendFace({ l: r2(clamp(st.openL ?? 1)), r: r2(clamp(st.openR ?? 1)), j: r2(clamp(st.jaw || 0)), b: r2(clamp(st.brow || 0)), t: r2(clamp(st.roll || 0, -1.5, 1.5)), f: !!st.face });
}

function leaveRoom() {
  clearInterval(faceTimer); faceTimer = null;
  if (net && roomCode) net.leave();
  roomCode = null; oppUid = null;
  if (params.has('room') || new URLSearchParams(location.search).has('room')) {
    const q = new URLSearchParams(location.search); q.delete('room');
    history.replaceState(null, '', `${location.pathname}${q.toString() ? '?' + q : ''}`);
  }
}
addEventListener('pagehide', () => { if (net && roomCode) net.leave(); });

function renderSkins() {
  const box = $('skins'); box.innerHTML = '';
  PLAYER_SKINS.forEach((s) => {
    const b = document.createElement('button'); b.type = 'button';
    b.textContent = SKINS[s].name; b.setAttribute('aria-pressed', String(s === mySkin));
    b.onclick = () => { mySkin = s; store.set('skin', s); renderSkins(); net && net.setPlayer({ skin: s }).catch(() => {}); };
    box.append(b);
  });
}
function setReadyBtn(ready) {
  const b = $('readyBtn');
  b.disabled = ready;
  b.textContent = ready ? '준비 완료 ✓' : '준비 완료';
}
$('readyBtn').onclick = () => {
  unlockAudio();
  if (!net || !roomCode) return;
  setReadyBtn(true);
  sfx.pop();
  net.setPlayer({ ready: lastRound + 1 }).catch((e) => { setReadyBtn(false); overlayTip(Net.explainError(e)); });
};
$('invite').onclick = () => {
  if (!roomCode || !window.DopaSharp) return;
  track('share_click', { method: 'invite' });
  const url = `${location.origin}${location.pathname}?room=${roomCode}`;
  window.DopaSharp.share({ title: '눈싸움 1:1', text: `👁️ 눈싸움 한 판? 먼저 깜빡이면 진다. 방 코드 ${roomCode}`, url }, '초대 링크를 복사했어요.');
};

function onRoom(r) {
  room = r || {};
  if (!roomCode) return;
  const players = room.players || {};
  const opp = Object.keys(players).find((u) => u !== net.uid) || null;
  const hadOpp = !!oppUid;
  if (hadOpp && !opp && game && game.mode === 'duo' && (game.state === 'play' || game.state === 'count')) {
    oppUid = null;
    return duoFinish('left');
  }
  if (opp && !hadOpp) { sfx.pop(); buzz(60); }
  oppUid = opp;
  if (opp) oppSkin = players[opp].skin || 'rabbit';
  if (!opp) Object.assign(oppTarget, { l: 1, r: 1, j: 0, b: 0, t: 0, f: true });
  paintLobby(players);

  const R = lastRound + 1;
  const me = players[net.uid];
  const start = room.start || {};
  if (opp && me && me.ready === R && players[opp].ready === R && start[R] == null) net.setStart(R, net.now() + 3600);
  if (start[R] != null && game && game.mode === 'duo' && game.state === 'lobby') beginDuoRound(R, start[R]);
  if (game && game.mode === 'duo' && game.round && room.outs && room.outs[game.round]) onOuts();
}

function paintLobby(players) {
  const R = lastRound + 1;
  const me = players[net.uid] || {};
  const opp = oppUid ? players[oppUid] : null;
  const s = $('lobbyStatus');
  const rec = score.w + score.l + score.d ? ` · 전적 ${score.w}승 ${score.l}패${score.d ? ' ' + score.d + '무' : ''}` : '';
  if (!opp) s.textContent = '친구를 기다리는 중… 초대 링크를 보내세요.' + rec;
  else if (me.ready === R && opp.ready === R) s.textContent = '곧 시작해요!';
  else if (me.ready === R) s.textContent = '상대가 준비하길 기다리는 중…' + rec;
  else if (opp.ready === R) s.textContent = '상대는 준비 완료! 🔥 준비를 눌러 주세요.' + rec;
  else s.textContent = `상대(${SKINS[opp.skin]?.name || '?'}) 입장! 둘 다 준비를 누르면 시작해요.` + rec;
  setReadyBtn(me.ready === R);
  $('vsTag').textContent = opp ? `VS ${SKINS[opp.skin]?.name || '상대'}` : '상대 없음';
}

function beginDuoRound(R, at) {
  lastRound = R;
  game = { mode: 'duo', state: 'count', round: R, at, decided: false, myOut: null, oppOut: null, noFaceAt: 0, lastN: 99 };
  $('lobby').hidden = true;
  overlay.innerHTML = '';
  clearFx();
  setReadyBtn(false);
}

function duoFrame(now, W, H) {
  const g = game;
  // 상대 얼굴 따라가기 (부드럽게)
  const k = 0.45;
  oppPose.openL += (oppTarget.l - oppPose.openL) * k;
  oppPose.openR += (oppTarget.r - oppPose.openR) * k;
  oppPose.jaw += (oppTarget.j - oppPose.jaw) * k;
  oppPose.brow += (oppTarget.b - oppPose.brow) * k;
  oppPose.roll += (oppTarget.t - oppPose.roll) * k;
  let t = 0;
  if (g.state === 'count') {
    const left = g.at - net.now();
    const n = Math.ceil(left / 1000);
    if (left > 0 && n !== g.lastN && n <= 3) { g.lastN = n; overlayBig(String(n)); sfx.count(); buzz(30); }
    if (left <= 0) {
      g.state = 'play'; overlayBig('시작!'); sfx.go(); buzz(120);
      setTimeout(() => { if (overlay.firstChild && overlay.firstChild.textContent === '시작!') overlay.innerHTML = ''; }, 600);
    }
  }
  if (g.state === 'play' || g.state === 'out') {
    t = net.now() - g.at;
    if (g.state === 'play') {
      $('timer').textContent = sec(t);
      tension(t);
      const foul = myFoul(now, t);
      if (foul) {
        g.state = 'out';
        g.myOut = { ms: Math.round(t), why: foul };
        g.shot = foul === 'blink' ? eyes.snapshot() : null;
        net.setOut(g.round, g.myOut);
        overlayBig(foul === 'blink' ? '깜빡!' : '얼굴 이탈!', 'stamp');
        sfx.lose(); buzz([200, 80, 300]);
        onOuts();
      }
      if (t > 90000 && !g.decided) { g.decided = true; duoFinish('time'); }
    }
  }
  if (g.state === 'end') t = g.endT || 0;
  const oppGone = !oppUid;
  const oppNoFace = oppUid && (!oppTarget.f || (oppTarget.at && now - oppTarget.at > 2500));
  const outClosed = g.oppOut && g.oppOut.why === 'blink';
  const pose = {
    openL: outClosed ? 0 : oppPose.openL, openR: outClosed ? 0 : oppPose.openR,
    jaw: oppPose.jaw, brow: oppPose.brow, roll: oppPose.roll,
    red: clamp(t / 22000), tears: clamp((t - 12000) / 12000),
  };
  if (oppGone) { foeCtx.clearRect(0, 0, W, H); drawAvatar(foeCtx, W, H, 'bear', { openL: 0, openR: 0, scale: 0.8 }, now); foeCtx.fillStyle = 'rgba(14,18,17,.6)'; foeCtx.fillRect(0, 0, W, H); return; }
  drawAvatar(foeCtx, W, H, oppSkin, pose, now);
  if (oppNoFace) {
    foeCtx.fillStyle = 'rgba(14,18,17,.55)'; foeCtx.fillRect(0, 0, W, H);
    foeCtx.fillStyle = '#fff'; foeCtx.textAlign = 'center';
    foeCtx.font = `700 ${Math.round(W / 18)}px system-ui, sans-serif`;
    foeCtx.fillText('상대 얼굴이 안 보여요', W / 2, H * 0.92);
  }
}

// 누가 먼저 깜빡였는지: 첫 아웃이 오면 0.8초 기다렸다가(상대 기록 도착 대기) 시각을 비교
function onOuts() {
  const g = game;
  if (!g || g.mode !== 'duo' || g.decided) return;
  const outs = (room.outs && room.outs[g.round]) || {};
  if (oppUid && outs[oppUid] && !g.oppOut) {
    g.oppOut = outs[oppUid];
    if (g.state === 'play') { say('상대가 깜빡였어요!', 1200); }
  }
  const mine = outs[net.uid] || g.myOut;
  const theirs = oppUid ? outs[oppUid] : null;
  if (!mine && !theirs) return;
  if (mine && theirs) return decide(mine, theirs);
  if (!g.waitT) g.waitT = setTimeout(() => {
    const o = (room.outs && room.outs[g.round]) || {};
    decide(o[net.uid] || g.myOut, oppUid ? o[oppUid] : null);
  }, 800);
}
function decide(mine, theirs) {
  const g = game;
  if (!g || g.decided) return;
  g.decided = true; clearTimeout(g.waitT);
  if (mine && theirs) {
    const d = mine.ms - theirs.ms;
    if (Math.abs(d) <= 40) return duoFinish('draw', mine, theirs);
    return duoFinish(d < 0 ? 'lose' : 'win', mine, theirs);
  }
  return duoFinish(mine ? 'lose' : 'win', mine, theirs);
}

function duoFinish(kind, mine, theirs) {
  const g = game;
  if (!g) return;
  g.decided = true; clearTimeout(g.waitT);
  const t = mine ? mine.ms : theirs ? theirs.ms : Math.max(0, net.now() - (g.at || net.now()));
  g.state = 'end'; g.endT = t;
  stage.classList.remove('danger');
  const win = kind === 'win' || kind === 'left';
  const draw = kind === 'draw' || kind === 'time';
  if (win) { score.w++; sfx.win(); buzz([60, 40, 60, 40, 160]); overlayBig('승리!', 'stamp win'); }
  else if (draw) { score.d++; overlayBig('무승부', 'stamp win'); }
  else { score.l++; }
  track('game_complete', { method: 'duo', result: kind, ms: Math.round(t) });
  let line;
  if (kind === 'left') line = '상대가 나갔어요. 부전승!';
  else if (kind === 'time') line = '90초 동안 아무도 안 깜빡였어요. 둘 다 사람 맞나요?';
  else if (kind === 'draw') line = '거의 동시에 깜빡였어요! 무승부.';
  else if (win) line = theirs ? `상대가 ${sec(theirs.ms)}초에 ${theirs.why === 'face' ? '화면에서 사라졌어요 (반칙패)' : '깜빡였어요'}${mine ? ` · ${sec(mine.ms - theirs.ms)}초 차이` : ''}` : '상대가 먼저 깜빡였어요!';
  else line = mine && mine.why === 'face' ? '얼굴이 화면 밖으로 나가서 반칙패예요.' : theirs ? `${sec(theirs.ms - mine.ms)}초 차이로 먼저 깜빡였어요… 아깝다!` : '내가 먼저 깜빡였어요…';
  line += ` (전적 ${score.w}승 ${score.l}패${score.d ? ' ' + score.d + '무' : ''})`;
  const shot = g.shot || null;
  const res = {
    win, draw, ms: t, rec: false, line, shot,
    shotLabel: win ? '친구를 울렸다 😎' : draw ? '막상막하 🤝' : '깜빡한 순간 📸',
    foeSkin: oppSkin,
    share: `👁️ 눈싸움 1:1 | ${draw ? '무승부' : win ? '승리' : '패배'} · ${sec(t)}초`,
    title: draw ? '1:1 무승부' : win ? '1:1 승리!' : '1:1 패배',
    again: rematch, againLabel: kind === 'left' ? '새 상대 기다리기' : '재대결',
    back: goHome, backLabel: '나가기',
  };
  setTimeout(() => showResult(res), kind === 'left' ? 400 : 1500);
}

function rematch() {
  if (!roomCode) { goHome(); return; }
  game = { mode: 'duo', state: 'lobby', round: 0 };
  enterArena('duo');
  $('foeName').textContent = '1:1 대결';
  renderSkins();
  onRoom(room);
}

// ---------------------------------------------------------------- 시작
if (params.has('room') && Net.validCode(params.get('room'))) {
  openDuo(params.get('room'));
  duoErr('');
  $('duoMode').textContent = (Net.mode === 'local' ? $('duoMode').textContent + ' ' : '') + '친구가 초대했어요! 입장을 눌러 주세요.';
}
if (testMode) document.title = '[테스트] ' + document.title;
