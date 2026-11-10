// WebAudio로 만든 짧은 효과음 + 진동. 🔊 버튼으로 끌 수 있어요.
let ctx = null;
export const sound = { on: true };
try { sound.on = localStorage.getItem('stare:sound') !== 'off'; } catch {}

export function unlockAudio() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
  if (ctx.state === 'suspended') ctx.resume();
}
export function setSound(on) {
  sound.on = on;
  try { localStorage.setItem('stare:sound', on ? 'on' : 'off'); } catch {}
}

function tone(freq, dur, { type = 'sine', vol = 0.18, slide = 0, delay = 0 } = {}) {
  if (!sound.on || !ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  count: () => tone(660, 0.12, { type: 'square', vol: 0.08 }),
  go: () => { tone(880, 0.25, { type: 'square', vol: 0.1 }); tone(1320, 0.3, { type: 'sine', vol: 0.08, delay: 0.05 }); },
  beat: (k = 0) => { tone(70 + k * 30, 0.09, { vol: 0.25 }); tone(60 + k * 25, 0.1, { vol: 0.18, delay: 0.14 }); },
  tick: () => tone(1800, 0.03, { type: 'triangle', vol: 0.04 }),
  whoosh: () => tone(500, 0.5, { type: 'sawtooth', vol: 0.04, slide: -400 }),
  buzz: () => tone(180, 0.35, { type: 'sawtooth', vol: 0.05, slide: 40 }),
  pop: () => tone(520, 0.12, { vol: 0.12, slide: 500 }),
  lose: () => { tone(330, 0.25, { type: 'square', vol: 0.09, slide: -80 }); tone(220, 0.5, { type: 'square', vol: 0.09, slide: -100, delay: 0.25 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.1 })),
  record: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.06, delay: i * 0.07 })),
};

export function buzz(pattern) {
  if (!sound.on) return;
  try { navigator.vibrate && navigator.vibrate(pattern); } catch {}
}
