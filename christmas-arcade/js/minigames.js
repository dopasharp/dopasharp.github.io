// 인형뽑기 말고 지금 할 수 있는 미니게임 두 개. main.js 가 버튼(E / ACTION)을 action() 으로 넘겨줘요.
//   ctx = { sfx, pay(): bool, reward(n, why), banner(text, kind, ms), confetti(n), show(big, sub, color), sendLive(d) }
import { WHEEL } from './world.js';

const TARGET = 10;
const SHOW_SECS = 3; // 처음 3초만 숫자가 보이고 그다음은 ??.??

export function tenGame(ctx, mesh) {
  let state = 'ready';
  let t = 0;
  let lastText = '';
  let best = +(localStorage.getItem('xmas-ten-best') ?? NaN);
  const screen = (text, color) => {
    if (text === lastText) return;
    lastText = text;
    mesh.setScreen(text, color);
    ctx.sendLive({ v: text, c: color });
  };
  const idle = () => {
    ctx.show('10.00', '정확히 10초에 멈추면 🎟️10', '#86EFC8');
    screen('10.00', '#86EFC8');
  };
  idle();
  return {
    label: () => (state === 'run' ? '⏹ STOP' : '▶ START 🎟️1'),
    info: () => (Number.isFinite(best) ? `최고 기록 ${best.toFixed(2)}초` : '3초 뒤엔 숫자가 사라져요'),
    busy: () => state === 'run',
    action() {
      if (state === 'run') {
        state = 'result';
        const d = Math.abs(t - TARGET);
        const v = t.toFixed(2);
        let n = 0;
        let msg = '';
        if (d <= 0.03) { n = 10; msg = 'PERFECT!! 🎯'; }
        else if (d <= 0.1) { n = 5; msg = '거의 완벽!'; }
        else if (d <= 0.3) { n = 2; msg = '아깝다!'; }
        else if (d <= 0.6) { n = 1; msg = '조금만 더!'; }
        else msg = t < TARGET ? '너무 빨라요' : '너무 늦어요';
        if (!Number.isFinite(best) || Math.abs(best - TARGET) > d) {
          best = t;
          try { localStorage.setItem('xmas-ten-best', String(t)); } catch { /* noop */ }
        }
        const color = n >= 5 ? '#D9FF44' : n ? '#86EFC8' : '#FF6C91';
        ctx.show(v, `${msg}${n ? ` · 🎟️ +${n}` : ''}`, color);
        screen(v, color);
        if (n) { ctx.reward(n, '10초 맞추기'); ctx.sfx.win(); if (n >= 5) ctx.confetti(n * 8); ctx.banner(`${msg} 🎟️+${n}`, n >= 10 ? 'rare' : 'win', 1800); }
        else ctx.sfx.miss();
        return;
      }
      if (!ctx.pay()) return;
      state = 'run';
      t = 0;
      ctx.sfx.coin();
      setTimeout(ctx.sfx.start, 200);
    },
    update(dt) {
      if (state !== 'run') return;
      t += dt;
      const text = t < SHOW_SECS ? t.toFixed(2) : '??.??';
      ctx.show(text, t < SHOW_SECS ? '속으로 세어 보세요…' : '지금이다 싶을 때 STOP!', '#F7F6F2');
      screen(t < SHOW_SECS ? t.toFixed(1) : '??.??', '#F7F6F2');
      if (t > 20) this.action();
    },
    exit() { idle(); },
  };
}

export function applyTenLive(mesh, live) {
  if (live?.v) mesh.setScreen(live.v, live.c || '#86EFC8');
}

const SEG = (Math.PI * 2) / WHEEL.length;

export function rouletteGame(ctx, mesh) {
  const wheel = mesh.wheel;
  let state = 'ready';
  let from = 0;
  let to = 0;
  let t = 0;
  let pick = 0;
  let lastSeg = 0;
  let liveT = 0;
  const DUR = 4.2;
  ctx.show('🎡', '돌려서 나온 만큼 🎟️ 티켓!', '#FFD36B');
  return {
    label: () => (state === 'spin' ? '두근두근…' : '🎡 SPIN 🎟️1'),
    info: () => '꽝 · 1 · 2 · 3 · 5',
    busy: () => state === 'spin',
    action() {
      if (state === 'spin' || !ctx.pay()) return;
      state = 'spin';
      pick = Math.floor(Math.random() * WHEEL.length);
      from = wheel.rotation.z;
      const base = from - (from % (Math.PI * 2));
      to = base + Math.PI * 2 * 6 + pick * SEG + (Math.random() - 0.5) * SEG * 0.6;
      if (to < from + Math.PI * 8) to += Math.PI * 2;
      t = 0;
      ctx.sfx.coin();
      ctx.show('🎡', '돌아가는 중…', '#FFD36B');
    },
    update(dt) {
      if (state !== 'spin') return;
      t = Math.min(DUR, t + dt);
      const k = 1 - (1 - t / DUR) ** 3;
      wheel.rotation.z = from + (to - from) * k;
      const seg = Math.floor((wheel.rotation.z + SEG / 2) / SEG);
      if (seg !== lastSeg) { lastSeg = seg; ctx.sfx.tick(false); }
      liveT += dt;
      if (liveT > 0.1) { liveT = 0; ctx.sendLive({ rot: +wheel.rotation.z.toFixed(3) }); }
      if (t >= DUR) {
        state = 'ready';
        ctx.sendLive({ rot: +wheel.rotation.z.toFixed(3) });
        const v = WHEEL[pick].v;
        if (v) {
          ctx.reward(v, '행운 룰렛');
          ctx.sfx.win();
          ctx.banner(`🎟️ +${v}!`, v >= 5 ? 'rare' : 'win', 1800);
          if (v >= 3) ctx.confetti(v * 12);
          ctx.show(`+${v}`, v >= 5 ? '대박!! 🎉' : '티켓 GET!', '#D9FF44');
        } else {
          ctx.sfx.miss();
          ctx.banner('꽝! 😢', 'miss');
          ctx.show('꽝', '한 번 더?', '#FF6C91');
        }
      }
    },
    exit() {},
  };
}

export function applyRouletteLive(mesh, live, dt) {
  if (live?.rot == null) return;
  const w = mesh.wheel;
  w.rotation.z += (live.rot - w.rotation.z) * Math.min(1, dt * 8);
}
