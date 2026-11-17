// 도파# 크리스마스 오락실: 장면 · 캐릭터 이동 · 멀티플레이 · 대기열 · 오락기 플레이를 묶는 곳.
// 폰 하나로도(화면 조이스틱) PC로도(WASD, 폰 QR 조종기) 할 수 있어요.
import * as THREE from 'three';
import * as sfx from './sound.js?v=1';
import { buildWorld, MACHINES, ROOM, SPAWN, CLAW_SCALE, rotatedBox, canvasTex } from './world.js?v=1';
import { createClawMachine } from './claw.js?v=1';
import { createAvatar, OUTFITS, roundRect } from './avatar.js?v=1';
import { tenGame, rouletteGame, applyTenLive, applyRouletteLive } from './minigames.js?v=1';
import { connect, mode as netMode, STALE_MS, makeCode } from './net.js?v=1';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('is-touch', TOUCH);

// ------------------------------------------------------------------ 저장 (티켓은 재미용: 기기마다 따로, 매일 최소 10장 충전)
const SAVE_KEY = 'xmas-arcade-v1';
const today = () => new Date().toLocaleDateString('sv');
const save = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { /* noop */ }
  s.tickets ??= 10;
  s.plush ??= [];
  if (s.day !== today()) { s.tickets = Math.max(s.tickets, 10); s.day = today(); }
  return s;
})();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* noop */ } };
persist();

// ------------------------------------------------------------------ 렌더러/장면
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 80);
const world = buildWorld(scene);
if (TOUCH) world.sun.shadow.mapSize.set(1024, 1024);

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ 오락기 배치
const MDEF = Object.fromEntries(MACHINES.map((m) => [m.id, m]));
const claw = createClawMachine({
  sfx,
  hooks: {
    banner, confetti,
    pay: () => pay(),
    onWin(kind, k) {
      save.plush.push(kind);
      reward(3, `${k.emoji} ${k.name}`);
    },
  },
});
{
  const m = MDEF.claw;
  claw.group.scale.setScalar(CLAW_SCALE);
  claw.group.position.set(m.x, 1.6 * CLAW_SCALE, m.z);
  claw.group.rotation.y = m.face;
  claw.group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(claw.group);
  const f = claw.footprint;
  world.colliders.push(rotatedBox(m, { x0: f.x0 * CLAW_SCALE, x1: f.x1 * CLAW_SCALE, z0: f.z0 * CLAW_SCALE, z1: f.z1 * CLAW_SCALE }));
}
// 기계 앞 서는 자리까지의 거리
const FRONT = { claw: 1.55, ten: 1.15, roulette: 1.2, basket: 1.9, pinball: 1.6, prize: 1.1 };
for (const m of MACHINES) {
  const fx = Math.sin(m.face);
  const fz = Math.cos(m.face);
  m.fx = fx;
  m.fz = fz;
  m.spot = { x: m.x + fx * FRONT[m.id], z: m.z + fz * FRONT[m.id] };
  m.group = m.id === 'claw' ? claw.group : world.machineMeshes[m.id].group;
}
// 줄 서는 자리: 기계 앞에서 바깥쪽으로 한 줄
function queueSlot(m, i) {
  const d = 1.3 + 0.9 * i;
  return { x: m.spot.x + m.fx * d, z: m.spot.z + m.fz * d };
}

// 오락기 위 상태 표시판 (AVAILABLE / PLAYING / WAITING / COMING SOON)
const LABEL_Y = { claw: 3.4, ten: 3.1, basket: 3.6, pinball: 2.6, roulette: 3.4, prize: 3.5 };
const statusBoards = {};
for (const m of MACHINES) {
  const tex = canvasTex(512, 150, () => {});
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.0, 0.59, 1);
  sp.position.set(m.x + m.fx * 0.2, LABEL_Y[m.id], m.z + m.fz * 0.2);
  sp.renderOrder = 15;
  scene.add(sp);
  statusBoards[m.id] = { sp, tex, key: '' };
}
function drawStatus(m, st) {
  const b = statusBoards[m.id];
  const key = `${st.kind}|${st.text}`;
  if (b.key === key) return;
  b.key = key;
  const c = b.tex.userData.canvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const col = { available: '#86EFC8', playing: '#FF6C91', waiting: '#FFD36B', soon: '#AAB4AE' }[st.kind];
  g.fillStyle = 'rgba(11,14,13,.82)';
  roundRect(g, 16, 10, 480, 130, 30);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = 5;
  g.stroke();
  g.textAlign = 'center';
  g.fillStyle = '#F7F6F2';
  g.font = '700 40px "Pretendard Variable", sans-serif';
  g.fillText(`${m.emoji} ${m.name}`, 256, 62);
  g.fillStyle = col;
  g.font = '800 34px "Pretendard Variable", sans-serif';
  g.fillText(st.text, 256, 112);
  b.tex.needsUpdate = true;
}

// ------------------------------------------------------------------ 상태
const S = {
  mode: 'entry', // entry | walk | claw | ten | roulette
  nick: '',
  outfit: localStorage.getItem('xmas-outfit') || 'red',
  queue: null, // 줄 선 기계 id
  turn: null, // { mid, until }
  idle: 0,
  view: 'claw',
  near: null,
};
let net = null;
let me = null; // { avatar, x, z, r, speed }
const others = new Map(); // uid → { avatar, data, x, z, r, speed }
let machinesState = {};
let game = null; // 지금 하는 미니게임 (ten / roulette)

// ------------------------------------------------------------------ 입력: 키보드 · 화면 조이스틱 · 폰 조종기
const keys = new Set();
const joy = { x: 0, z: 0 };
const pad = { x: 0, z: 0, on: false };
const KEYMAP = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' };
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()];
  if (k) { keys.add(k); e.preventDefault(); return; }
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (key === 'e' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); action(); }
  else if (key === 'q') wave();
  else if (e.key === 'Escape') exitMachine();
  else if (key === 'v') toggleView();
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()];
  if (k) keys.delete(k);
});
addEventListener('blur', () => keys.clear());

function moveInput() {
  let x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
  let z = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
  if (!x && !z) { x = joy.x; z = joy.z; }
  if (!x && !z && pad.on) { x = pad.x; z = pad.z; }
  const l = Math.hypot(x, z);
  if (l > 1) { x /= l; z /= l; }
  return { x, z };
}

// 화면 조이스틱 (왼쪽 아래)
{
  const el = $('joy');
  const knob = $('knob');
  let id = null;
  const R = 46;
  const moveKnob = (e) => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.15;
    const nx = dx / R;
    const ny = dy / R;
    const m = Math.hypot(nx, ny);
    joy.x = m < dead ? 0 : nx;
    joy.z = m < dead ? 0 : ny;
  };
  const release = () => { id = null; joy.x = joy.z = 0; knob.style.transform = ''; el.classList.remove('active'); };
  el.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    try { el.setPointerCapture(id); } catch { /* noop */ }
    el.classList.add('active');
    sfx.unlock();
    moveKnob(e);
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) moveKnob(e); });
  el.addEventListener('pointerup', (e) => { if (e.pointerId === id) release(); });
  el.addEventListener('pointercancel', (e) => { if (e.pointerId === id) release(); });
}
$('btnA').addEventListener('pointerdown', (e) => { e.preventDefault(); sfx.unlock(); action(); });
$('btnB').addEventListener('pointerdown', (e) => { e.preventDefault(); wave(); });
$('exitBtn').addEventListener('click', () => exitMachine());
$('viewBtn').addEventListener('click', () => toggleView());
$('soundBtn').addEventListener('click', () => {
  sfx.unlock();
  sfx.setMuted(!sfx.isMuted());
  $('soundBtn').textContent = sfx.isMuted() ? '🔇' : '🔊';
});
addEventListener('pointerdown', () => sfx.unlock());

// ------------------------------------------------------------------ 입장 화면
{
  const chips = $('outfits');
  chips.innerHTML = OUTFITS.map((o) => `<button type="button" class="outfit" data-o="${o.key}" style="--c:#${o.body.toString(16).padStart(6, '0')}" aria-label="${o.label}"><i></i><span>${o.label}</span></button>`).join('');
  const sel = () => chips.querySelectorAll('.outfit').forEach((b) => b.classList.toggle('on', b.dataset.o === S.outfit));
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.outfit');
    if (!b) return;
    S.outfit = b.dataset.o;
    sel();
    previewAvatar();
  });
  sel();
  $('nick').value = localStorage.getItem('xmas-nick') || '';
  $('entryForm').addEventListener('submit', (e) => { e.preventDefault(); enter(); });
}
// 입장 화면 뒤에서 미리보기 캐릭터
let preview = null;
function previewAvatar() {
  if (preview) scene.remove(preview.root);
  preview = createAvatar({ nickname: $('nick').value.trim() || '나', outfit: S.outfit, me: true });
  preview.root.position.set(SPAWN.x, 0, SPAWN.z - 1.2);
  scene.add(preview.root);
}
previewAvatar();
$('nick').addEventListener('input', () => preview?.setName($('nick').value.trim() || '나'));

async function enter() {
  const nick = $('nick').value.trim().replace(/\s+/g, ' ').slice(0, 10);
  if (!nick) { $('entryError').textContent = '닉네임을 입력해 주세요.'; $('nick').focus(); return; }
  sfx.unlock();
  const btn = $('enterBtn');
  btn.setAttribute('aria-busy', 'true');
  $('entryError').textContent = '';
  try {
    net = await connect();
  } catch (err) {
    console.error(err);
    btn.removeAttribute('aria-busy');
    $('entryError').textContent = /admin-restricted|operation-not-allowed/.test(String(err?.code || err))
      ? 'Firebase에서 익명 로그인이 꺼져 있어요. (README 참고)'
      : '오락실에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
    return;
  }
  btn.removeAttribute('aria-busy');
  S.nick = nick;
  localStorage.setItem('xmas-nick', nick);
  localStorage.setItem('xmas-outfit', S.outfit);
  if (preview) { scene.remove(preview.root); preview = null; }
  const avatar = createAvatar({ nickname: nick, outfit: S.outfit, me: true });
  me = { avatar, x: SPAWN.x, z: SPAWN.z, r: Math.PI, speed: 0 };
  avatar.root.position.set(me.x, 0, me.z);
  scene.add(avatar.root);
  $('entry').classList.remove('show');
  $('hud').hidden = false;
  $('touch').hidden = false;
  $('meName').textContent = nick;
  $('modeBadge').hidden = netMode !== 'local';
  renderTickets();
  S.mode = 'walk';
  camInit = false;
  net.onPlayer(onPlayer);
  net.onMachines((v) => { machinesState = v; });
  sendMe(true);
  window.DopaSharp?.track('game_start');
  toast(`${nick}님, 메리 크리스마스! 🎄`);
  setupPadHost();
}

// ------------------------------------------------------------------ 다른 사람들
function onPlayer(uid, d) {
  if (uid === net.uid) return;
  let o = others.get(uid);
  if (!d) {
    if (o) { scene.remove(o.avatar.root); others.delete(uid); }
    return;
  }
  if (!o) {
    o = { avatar: createAvatar({ nickname: d.n, outfit: d.o }), x: d.x, z: d.z, r: d.r || 0, speed: 0, data: d, seen: performance.now() };
    o.avatar.root.position.set(d.x, 0, d.z);
    scene.add(o.avatar.root);
    others.set(uid, o);
  }
  if (d.w && d.w !== o.data.w) o.avatar.wave();
  o.data = d;
  o.seen = performance.now();
}

let sendT = 0;
let sentKey = '';
function sendMe(force = false) {
  if (!net || !me) return;
  const d = {
    n: S.nick, o: S.outfit,
    x: +me.x.toFixed(2), z: +me.z.toFixed(2), r: +me.r.toFixed(2),
    s: S.mode === 'walk' ? (S.queue ? 'queue' : 'walk') : 'play',
    m: S.mode !== 'walk' ? S.mode : S.queue || '',
    w: S.waveSeq || 0,
  };
  const key = JSON.stringify(d);
  if (!force && key === sentKey) return;
  sentKey = key;
  net.setMe(d);
}

// ------------------------------------------------------------------ 오락기 상태 (네트워크 → 화면)
function occupant(mid) {
  const p = machinesState[mid]?.player;
  if (!p || !net) return null;
  if (net.now() - (p.beat || 0) > STALE_MS) return null;
  return p;
}
function queueOf(mid) {
  const q = machinesState[mid]?.queue || {};
  return Object.entries(q).map(([uid, v]) => ({ uid, ...v })).sort((a, b) => a.at - b.at);
}
function statusOf(m) {
  if (!m.playable) return { kind: 'soon', text: 'COMING SOON' };
  const p = occupant(m.id);
  const q = queueOf(m.id);
  if (p && q.length) return { kind: 'waiting', text: `WAITING · ${q.length}명 대기` };
  if (p) return { kind: 'playing', text: `PLAYING · ${p.n}` };
  if (q.length) return { kind: 'waiting', text: `WAITING · ${q.length}명 대기` };
  return { kind: 'available', text: 'AVAILABLE' };
}

// ------------------------------------------------------------------ 행동
function nearestMachine() {
  let best = null;
  let bd = 1.35;
  for (const m of MACHINES) {
    const d = Math.hypot(me.x - m.spot.x, me.z - m.spot.z);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

function promptFor(m) {
  if (!m) return null;
  if (!m.playable) return { text: `${m.emoji} 준비 중이에요`, act: false };
  if (S.queue === m.id) {
    if (S.turn) return { text: '내 차례! E : PLAY', act: true };
    const i = queueOf(m.id).findIndex((q) => q.uid === net.uid);
    return { text: `대기 ${i + 1}번째`, act: false };
  }
  const p = occupant(m.id);
  const q = queueOf(m.id);
  if (p || q.length) return { text: `E : 줄 서기${q.length ? ` (${q.length}명)` : ''}`, act: true };
  return { text: `E : PLAY ${m.emoji}`, act: true };
}

let busyAct = false;
async function action() {
  S.idle = 0;
  if (S.mode === 'entry' || !me) return;
  if (S.mode === 'claw') {
    if (claw.game.phase === 'idle') claw.insertCoin();
    else if (claw.game.phase === 'play') claw.dropClaw();
    renderPlayHud();
    return;
  }
  if (S.mode === 'ten' || S.mode === 'roulette') { game?.action(); renderPlayHud(); return; }
  const m = nearestMachine() || (S.turn ? MDEF[S.turn.mid] : null);
  if (!m || !m.playable || busyAct) {
    if (!m) wave();
    return;
  }
  busyAct = true;
  try {
    const mine = S.queue === m.id;
    const q = queueOf(m.id);
    const first = q[0]?.uid === net.uid;
    if (occupant(m.id) || (q.length && !(mine && first))) {
      if (!mine) {
        if (S.queue) await net.queueLeave(S.queue);
        S.queue = m.id;
        await net.queueJoin(m.id, S.nick);
        toast(`${m.emoji} ${m.name} 줄을 섰어요. 차례가 오면 알려 드릴게요!`);
      }
      return;
    }
    const ok = await net.claim(m.id, S.nick);
    if (!ok) { toast('앗, 누가 먼저 앉았어요. 줄을 서 볼까요?'); return; }
    if (S.queue) { await net.queueLeave(S.queue); S.queue = null; }
    S.turn = null;
    startMachine(m);
  } finally {
    busyAct = false;
  }
}

function wave() {
  if (!me || S.mode !== 'walk') return;
  me.avatar.wave();
  S.waveSeq = (S.waveSeq || 0) + 1;
  sendMe(true);
}

let liveT = 0;
// 살아있다는 표시: 화면 프레임이 아니라 실제 시간 기준 (탭이 뒤로 가도 계속)
setInterval(() => {
  if (!net || !me) return;
  sendMe(true);
  if (S.mode !== 'walk' && S.mode !== 'entry') net.beat(S.mode);
}, 3000);
function startMachine(m) {
  S.mode = m.id;
  S.idle = 0;
  S.view = 'claw';
  me.x = m.spot.x;
  me.z = m.spot.z;
  me.r = Math.atan2(-m.fx, -m.fz);
  camInit = false;
  const ctx = {
    sfx, banner, confetti,
    pay: () => pay(),
    reward: (n, why) => reward(n, why),
    show: (big, sub, color) => { $('playBig').textContent = big; $('playBig').style.color = color || ''; $('playSub').textContent = sub; },
    sendLive: (d) => net.sendLive(m.id, d),
  };
  if (m.id === 'ten') game = tenGame(ctx, world.machineMeshes.ten);
  else if (m.id === 'roulette') game = rouletteGame(ctx, world.machineMeshes.roulette);
  else game = null;
  $('playHud').hidden = false;
  $('playHud').dataset.machine = m.id;
  $('playTitle').textContent = `${m.emoji} ${m.name}`;
  $('viewBtn').hidden = m.id !== 'claw';
  if (m.id === 'claw') ctx.show('', '', '');
  document.body.classList.add('playing');
  renderPlayHud();
  sendMe(true);
  window.DopaSharp?.track('machine_start', { machine: m.id });
}

async function exitMachine(force = false) {
  if (S.mode === 'walk' || S.mode === 'entry') {
    if (S.queue) leaveQueue('줄에서 나왔어요');
    return;
  }
  if (!force && S.mode === 'claw' && claw.busy() && claw.game.phase !== 'play') { toast('집게가 돌아올 때까지 잠깐만요!'); return; }
  if (!force && game?.busy?.()) { toast('끝날 때까지 잠깐만요!'); return; }
  const m = MDEF[S.mode];
  if (S.mode === 'claw' && claw.game.phase === 'play') claw.dropClaw();
  if (force && S.mode === 'claw') claw.park();
  game?.exit?.();
  game = null;
  S.mode = 'walk';
  $('playHud').hidden = true;
  document.body.classList.remove('playing');
  me.x = m.spot.x + m.fx * 0.6;
  me.z = m.spot.z + m.fz * 0.6;
  camInit = false;
  await net.release(m.id);
  sendMe(true);
}

async function leaveQueue(msg) {
  const mid = S.queue;
  S.queue = null;
  S.turn = null;
  $('queueCard').hidden = true;
  if (mid) await net.queueLeave(mid);
  if (msg) toast(msg);
  sendMe(true);
}

// ------------------------------------------------------------------ 티켓
function pay() {
  if (save.tickets <= 0) { toast('🎟️ 티켓이 없어요. 내일 다시 10장 충전돼요!'); sfx.miss(); return false; }
  save.tickets--;
  persist();
  renderTickets(-1);
  return true;
}
function reward(n, why) {
  save.tickets += n;
  persist();
  renderTickets(n);
  if (why) toast(`${why} · 🎟️ +${n}`);
}
function renderTickets(delta = 0) {
  $('tickets').textContent = save.tickets;
  if (delta) {
    const el = $('ticketChip');
    el.classList.remove('bump', 'drop');
    void el.offsetWidth;
    el.classList.add(delta > 0 ? 'bump' : 'drop');
  }
}

// ------------------------------------------------------------------ HUD
function renderPlayHud() {
  const btnA = $('btnA');
  if (S.mode === 'claw') {
    const ph = claw.game.phase;
    btnA.textContent = ph === 'idle' ? '🪙 코인' : ph === 'play' ? '뽑기!' : '…';
    btnA.disabled = !['idle', 'play'].includes(ph);
    $('playTimer').textContent = ph === 'play' ? Math.ceil(claw.game.left) : '';
    $('playTimer').classList.toggle('hurry', ph === 'play' && claw.game.left <= 5);
    $('playInfo').textContent = `🧸 ${save.plush.length}`;
    $('playSub').textContent = ph === 'idle' ? '🪙 코인 = 🎟️1 · 뽑으면 🎟️+3' : ph === 'play' ? (TOUCH ? '조이스틱으로 옮기고 뽑기!' : '방향키로 옮기고 Space') : '두근두근…';
    $('keyHintPlay').textContent = ph === 'idle' ? 'E 코인' : ph === 'play' ? 'Space 뽑기' : '…';
  } else if (game) {
    btnA.textContent = game.label();
    btnA.disabled = false;
    $('playTimer').textContent = '';
    $('playInfo').textContent = game.info();
    $('keyHintPlay').textContent = `E ${game.label()}`;
  }
}
function renderWalkHud() {
  const m = nearestMachine();
  const p = promptFor(m) || (S.turn ? { text: '내 차례! E : PLAY', act: true } : null);
  S.near = m;
  const el = $('prompt');
  if (p) {
    el.hidden = false;
    el.textContent = TOUCH ? p.text.replace(/^E : /, '') : p.text;
    el.classList.toggle('act', p.act);
    // 내 캐릭터 머리 위에
    const v = new THREE.Vector3(me.x, 2.25, me.z).project(camera);
    el.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
  } else el.hidden = true;
  const btnA = $('btnA');
  btnA.disabled = false;
  btnA.textContent = p?.act ? (S.queue === m?.id && !S.turn ? '…' : /줄/.test(p.text) ? '줄서기' : 'PLAY') : '👋';
  $('onlineCount').textContent = others.size + 1;
}

let bannerTimer;
function banner(text, kind = 'win', ms = 1500) {
  const b = $('banner');
  b.textContent = text;
  b.className = `banner show ${kind}`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
}
function confetti(n) {
  const layer = $('confetti');
  const colors = ['#D9FF44', '#FF6C91', '#86EFC8', '#FFD36B', '#ffffff', '#e23b4a'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = `${50 + (Math.random() - 0.5) * 16}%`;
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 90}vw`);
    s.style.setProperty('--dy', `${-25 - Math.random() * 45}vh`);
    s.style.setProperty('--r', `${(Math.random() - 0.5) * 1440}deg`);
    s.style.animationDelay = `${Math.random() * 0.15}s`;
    layer.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
}
let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function toggleView() {
  if (S.mode !== 'claw') return;
  S.view = S.view === 'claw' ? 'machine' : 'claw';
  $('viewBtn').textContent = S.view === 'claw' ? '🎥 기계 전체' : '🎥 집게 시점';
}

// ------------------------------------------------------------------ 이동 + 충돌
const RADIUS = 0.32;
const SPEED = 3.6;
function collide(p) {
  for (const c of world.colliders) {
    if (c.r) {
      const dx = p.x - c.cx;
      const dz = p.z - c.cz;
      const d = Math.hypot(dx, dz);
      const min = c.r + RADIUS;
      if (d < min && d > 1e-4) { p.x = c.cx + (dx / d) * min; p.z = c.cz + (dz / d) * min; }
    } else {
      const nx = clamp(p.x, c.x0, c.x1);
      const nz = clamp(p.z, c.z0, c.z1);
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d = Math.hypot(dx, dz);
      if (d < RADIUS) {
        if (d > 1e-4) { p.x = nx + (dx / d) * RADIUS; p.z = nz + (dz / d) * RADIUS; }
        else {
          // 상자 안에 들어와 버림: 가장 가까운 면으로 밀어냄
          const opts = [[c.x0 - RADIUS - p.x, 0], [c.x1 + RADIUS - p.x, 0], [0, c.z0 - RADIUS - p.z], [0, c.z1 + RADIUS - p.z]];
          opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
          p.x += opts[0][0];
          p.z += opts[0][1];
        }
      }
    }
  }
  p.x = clamp(p.x, ROOM.x0 + RADIUS, ROOM.x1 - RADIUS);
  p.z = clamp(p.z, ROOM.z0 + RADIUS, ROOM.z1 - 0.4);
}

function walk(dt) {
  let { x, z } = moveInput();
  let auto = false;
  // 줄 서 있으면 내 자리로 자동으로 걸어감 (직접 움직이면 그만)
  if (S.queue && !x && !z) {
    const m = MDEF[S.queue];
    const i = Math.max(0, queueOf(S.queue).findIndex((q) => q.uid === net.uid));
    const slot = S.turn ? m.spot : queueSlot(m, i);
    const dx = slot.x - me.x;
    const dz = slot.z - me.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.12) { x = (dx / d) * Math.min(1, d * 1.5); z = (dz / d) * Math.min(1, d * 1.5); auto = true; }
    else if (d <= 0.12) me.r += (Math.atan2(-m.fx, -m.fz) - me.r) * Math.min(1, dt * 6);
  }
  const mag = Math.hypot(x, z);
  if (mag > 0.01) {
    S.idle = 0;
    me.x += x * SPEED * dt;
    me.z += z * SPEED * dt;
    const want = Math.atan2(x, z);
    let dr = want - me.r;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    me.r += dr * Math.min(1, dt * 12);
    collide(me);
    if (S.queue && !auto) {
      const m = MDEF[S.queue];
      const i = Math.max(0, queueOf(S.queue).findIndex((q) => q.uid === net.uid));
      const slot = queueSlot(m, i);
      if (Math.hypot(slot.x - me.x, slot.z - me.z) > 2.6 && Math.hypot(m.spot.x - me.x, m.spot.z - me.z) > 2.6) leaveQueue('줄에서 나왔어요');
    }
  }
  me.speed += (mag - me.speed) * Math.min(1, dt * 10);
}

// 줄: 내 차례인지 확인
function checkTurn() {
  if (!S.queue) return;
  const mid = S.queue;
  const q = queueOf(mid);
  if (!q.some((e) => e.uid === net.uid)) return; // 아직 반영 전
  const first = q[0]?.uid === net.uid;
  const card = $('queueCard');
  if (first && !occupant(mid)) {
    if (!S.turn) {
      S.turn = { mid, until: performance.now() + 10000 };
      sfx.start();
      banner('🔔 내 차례!', 'go', 1600);
    }
    const left = Math.ceil((S.turn.until - performance.now()) / 1000);
    card.hidden = false;
    card.innerHTML = `<b>${MDEF[mid].emoji} 내 차례!</b><span>${left}초 안에 ${TOUCH ? 'PLAY' : 'E'}를 눌러요</span>`;
    if (left <= 0) leaveQueue('차례가 지나가서 다음 사람에게 넘겼어요');
  } else {
    S.turn = null;
    const i = q.findIndex((e) => e.uid === net.uid);
    card.hidden = false;
    card.innerHTML = `<b>${MDEF[mid].emoji} ${MDEF[mid].name} 대기 ${i + 1}번째</b><span>멀리 걸어가면 줄에서 빠져요</span>`;
  }
}

// ------------------------------------------------------------------ 폰 조종기 (PC 화면에 QR)
let padHost = null;
let padCode = null;
let padSeq = { a: 0, b: 0, x: 0 };
async function setupPadHost() {
  if (TOUCH) return; // 폰에서는 화면 조이스틱으로
  padCode = sessionStorage.getItem('xmas-pad') || makeCode(6);
  sessionStorage.setItem('xmas-pad', padCode);
  try {
    padHost = await net.hostPad(padCode, {
      onPad(on) {
        pad.on = on;
        $('padDot').className = `dot ${on ? 'on' : 'off'}`;
        $('qrBtn').classList.toggle('connected', on);
        $('qrBtnText').textContent = on ? '폰 조종기 연결됨' : '폰으로 조종';
        if (on) { $('qrOverlay').classList.remove('show'); toast('📱 폰 조종기가 연결됐어요!'); }
        else { pad.x = pad.z = 0; }
      },
      onInput(v) {
        pad.x = clamp(+v.x || 0, -1, 1);
        pad.z = clamp(+v.z || 0, -1, 1);
        if ((v.a | 0) > padSeq.a) { padSeq.a = v.a | 0; action(); }
        if ((v.b | 0) > padSeq.b) { padSeq.b = v.b | 0; S.mode === 'walk' ? wave() : toggleView(); }
        if ((v.x2 | 0) > padSeq.x) { padSeq.x = v.x2 | 0; exitMachine(); }
      },
    });
  } catch (e) {
    console.warn('pad host failed', e);
    return;
  }
  const url = new URL('pad.html', location.href);
  url.searchParams.set('c', padCode);
  if (netMode === 'local') url.searchParams.set('local', '');
  $('padLink').href = url.href;
  $('padLink').textContent = url.href.replace(/^https?:\/\//, '');
  $('padCode').textContent = padCode;
  for (const [el, size] of [[$('qr'), 220]]) {
    el.innerHTML = '';
    if (window.QRCode) new QRCode(el, { text: url.href, width: size, height: size, colorDark: '#0B0E0D', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }
}
$('qrBtn').addEventListener('click', () => $('qrOverlay').classList.add('show'));
$('closeQr').addEventListener('click', () => $('qrOverlay').classList.remove('show'));
let padUiKey = '';
function sendPadUi() {
  if (!padHost || !pad.on) return;
  const btnA = $('btnA');
  const ui = { a: btnA.textContent, ad: btnA.disabled ? 1 : 0, mode: S.mode === 'walk' ? 'walk' : 'play', b: S.mode === 'walk' ? '👋' : S.mode === 'claw' ? '🎥' : '', t: save.tickets, title: S.mode === 'walk' ? (S.near ? `${S.near.emoji} ${S.near.name}` : '오락실') : $('playTitle').textContent };
  const k = JSON.stringify(ui);
  if (k === padUiKey) return;
  padUiKey = k;
  padHost.setUi(ui);
}

// ------------------------------------------------------------------ 카메라
let camInit = false;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
function updateCamera(dt, now) {
  if (S.mode === 'entry') {
    const a = now / 9000;
    tmpA.set(Math.sin(a) * 9, 6.5, 4 + Math.cos(a) * 7);
    tmpB.set(0, 1.4, 0);
  } else if (S.mode === 'claw') {
    claw.cameraPose(S.view, tmpA, tmpB);
    claw.group.localToWorld(tmpA);
    claw.group.localToWorld(tmpB);
  } else if (S.mode === 'ten' || S.mode === 'roulette') {
    const g = MDEF[S.mode].group;
    if (S.mode === 'ten') { tmpA.set(0, 1.85, 2.3); tmpB.set(0, 1.5, 0); }
    else { tmpA.set(0, 1.95, 2.9); tmpB.set(0, 1.7, 0); }
    g.localToWorld(tmpA);
    g.localToWorld(tmpB);
  } else {
    // 내 캐릭터를 뒤 위에서 따라감. 세로 화면이면 조금 더 멀리
    const portrait = camera.aspect < 1 ? Math.min(1.7, 1 / camera.aspect) : 1;
    const dist = 7.2 * (0.75 + portrait * 0.25 + (portrait - 1) * 0.35);
    tmpA.set(me.x, 0.6 + dist * 0.95, me.z + dist);
    tmpB.set(me.x, 0.7, me.z - 0.6);
  }
  const f = !camInit ? 1 : Math.min(1, dt * (S.mode === 'claw' && S.view === 'claw' ? 12 : 5));
  camPos.lerp(tmpA, f);
  camLook.lerp(tmpB, f);
  camInit = true;
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  const fov = S.mode === 'claw' && S.view === 'claw' ? 70 : 45;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ------------------------------------------------------------------ 루프
let last = performance.now();
let clawSpectating = false;
let hudT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (me && S.mode === 'walk') walk(dt);
  if (me) {
    if (S.mode !== 'walk') me.speed += (0 - me.speed) * Math.min(1, dt * 10);
    me.avatar.root.position.set(me.x, 0, me.z);
    me.avatar.root.visible = S.mode === 'walk'; // 오락기 앞에서는 내 머리가 화면을 가리지 않게
    me.avatar.root.rotation.y = me.r;
    me.avatar.animate(dt, me.speed);
  }
  preview?.animate(dt, 0);
  if (preview) preview.root.rotation.y = Math.sin(now / 1200) * 0.5;

  // 다른 사람들: 받은 좌표로 부드럽게
  const k = Math.min(1, dt * 10);
  for (const [uid, o] of others) {
    const d = o.data;
    if (netMode === 'local' && net && net.now() - (d.t || 0) > 20000) { scene.remove(o.avatar.root); others.delete(uid); continue; }
    const px = o.x;
    const pz = o.z;
    o.x += (d.x - o.x) * k;
    o.z += (d.z - o.z) * k;
    let dr = (d.r || 0) - o.r;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    o.r += dr * k;
    const sp = Math.hypot(o.x - px, o.z - pz) / Math.max(dt, 1e-3) / SPEED;
    o.speed += (Math.min(1, sp) - o.speed) * k;
    o.avatar.root.position.set(o.x, 0, o.z);
    o.avatar.root.visible = S.mode === 'walk' || Math.hypot(o.x - camera.position.x, o.z - camera.position.z) > 1.4;
    o.avatar.root.rotation.y = o.r;
    o.avatar.animate(dt, o.speed);
  }

  // 인형뽑기: 내가 하면 물리, 남이 하면 구경
  const occ = net ? occupant('claw') : null;
  if (S.mode === 'claw') {
    const { x, z } = moveInput();
    claw.setInput(x, z);
    claw.update(dt);
    liveT += dt;
    if (liveT > 0.12) { liveT = 0; net.sendLive('claw', claw.live()); }
  } else if (occ && occ.uid !== net.uid) {
    claw.applyLive(machinesState.claw?.live, dt);
    clawSpectating = true;
  } else {
    if (clawSpectating) { claw.park(); clawSpectating = false; }
    if (claw.busy()) { claw.setInput(0, 0); claw.update(dt); }
  }
  claw.draw(dt, now);

  // 미니게임
  if (game) game.update(dt);
  for (const mid of ['ten', 'roulette']) {
    if (S.mode === mid) continue;
    const o = net ? occupant(mid) : null;
    const live = machinesState[mid]?.live;
    if (o && o.uid !== net.uid && live) {
      if (mid === 'ten') applyTenLive(world.machineMeshes.ten, live);
      else applyRouletteLive(world.machineMeshes.roulette, live, dt);
    }
  }

  for (const f of world.animated) f(dt, now);

  // 네트워크: 위치 10회/초, 가만히 있으면 3초마다 살아있다는 표시
  if (net && me) {
    sendT += dt;
    if (sendT > 0.1) {
      sendT = 0;
      sendMe(false);
    }
    if (S.mode !== 'walk' && S.mode !== 'entry') {
      // 줄 선 사람이 있는데 한참 아무것도 안 하면 자리 양보
      S.idle += dt;
      const waiting = queueOf(S.mode).length > 0;
      const idleNow = S.mode === 'claw' ? claw.game.phase === 'idle' : !game?.busy?.();
      if (idleNow && ((waiting && S.idle > 20) || S.idle > 90)) { toast('한동안 조작이 없어서 자리를 비켜 줬어요'); exitMachine(); }
    }
  }

  updateCamera(dt, now);

  hudT += dt;
  if (me && hudT > 0.08) {
    hudT = 0;
    for (const m of MACHINES) drawStatus(m, statusOf(m));
    if (S.mode === 'walk') { renderWalkHud(); checkTurn(); }
    else {
      $('prompt').hidden = true;
      $('queueCard').hidden = true;
      renderPlayHud();
      // 연결이 오래 끊겨서 다른 사람이 자리를 가져갔으면 나옴
      const holder = machinesState[S.mode]?.player;
      if (holder && holder.uid !== net.uid) { toast('연결이 끊긴 사이 다음 사람이 시작했어요'); exitMachine(true); }
    }
    sendPadUi();
  } else if (!me && hudT > 0.5) {
    hudT = 0;
    for (const m of MACHINES) drawStatus(m, statusOf(m));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('pagehide', () => {
  if (!net) return;
  if (S.mode !== 'walk' && S.mode !== 'entry') net.release(S.mode);
  if (S.queue) net.queueLeave(S.queue);
  net.leave();
});

window.__arcade = { S, claw, others, save, get me() { return me; }, get net() { return net; }, get machines() { return machinesState; }, action, exitMachine, scene, camera };
window.__arcadeReady = true;
