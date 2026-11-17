// 폰 조종기: PC 오락실 화면의 내 캐릭터/오락기를 조종. 게임은 PC 가 돌리고, 폰은 입력만 보내요.
import { connect, normalizeCode } from './net.js?v=1';

const $ = (id) => document.getElementById(id);
const code = normalizeCode(new URLSearchParams(location.search).get('c'));
const seq = { a: 0, b: 0, x2: 0 };
const v = { x: 0, z: 0 };
let link = null;
let lastSend = 0;
let timer = null;

function send(force) {
  if (!link) return;
  const now = performance.now();
  if (!force && now - lastSend < 70) { // 최대 ~14회/초
    clearTimeout(timer);
    timer = setTimeout(() => send(true), 70);
    return;
  }
  lastSend = now;
  link.send({ x: +v.x.toFixed(2), z: +v.z.toFixed(2), a: seq.a, b: seq.b, x2: seq.x2 });
}
const buzz = (ms = 15) => navigator.vibrate?.(ms);

async function start() {
  if (!code) { $('padMsgText').textContent = 'QR 코드를 다시 스캔해 주세요.'; return; }
  try {
    const net = await connect();
    link = await net.joinPad(code, {
      onUi(ui) {
        $('btnA').textContent = ui.a || 'E';
        $('btnA').disabled = !!ui.ad;
        $('btnB').textContent = ui.b || '👋';
        $('btnB').hidden = !ui.b;
        $('btnX').hidden = ui.mode !== 'play';
        $('padTitle').textContent = ui.title || '🎄 오락실';
        $('padTickets').textContent = ui.t ?? '-';
      },
      onHost(on) {
        $('hostDot').className = `dot ${on ? 'on' : 'off'}`;
        if (!on) { $('padCtrl').hidden = true; $('padMsg').hidden = false; $('padMsgText').textContent = 'PC 화면이 닫혔어요. QR을 다시 스캔해 주세요.'; }
      },
    });
  } catch (e) {
    console.error(e);
    $('padMsgText').textContent = e.message === 'NOT_FOUND' ? '연결 코드를 찾지 못했어요. PC 화면의 QR을 다시 스캔해 주세요.' : '연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
    return;
  }
  $('padMsg').hidden = true;
  $('padCtrl').hidden = false;
  send(true);
}

// 조이스틱
{
  const el = $('joy');
  const knob = $('knob');
  let id = null;
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const R = r.width * 0.36;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.hypot(dx, dy) / R;
    v.x = m < 0.15 ? 0 : dx / R;
    v.z = m < 0.15 ? 0 : dy / R;
    send();
  };
  const release = () => { id = null; v.x = v.z = 0; knob.style.transform = ''; el.classList.remove('active'); send(true); };
  el.addEventListener('pointerdown', (e) => { id = e.pointerId; try { el.setPointerCapture(id); } catch { /* noop */ } el.classList.add('active'); move(e); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  el.addEventListener('pointerup', (e) => { if (e.pointerId === id) release(); });
  el.addEventListener('pointercancel', (e) => { if (e.pointerId === id) release(); });
}
$('btnA').addEventListener('pointerdown', (e) => { e.preventDefault(); seq.a++; buzz(); send(true); });
$('btnB').addEventListener('pointerdown', (e) => { e.preventDefault(); seq.b++; buzz(); send(true); });
$('btnX').addEventListener('click', () => { seq.x2++; send(true); });

start();
