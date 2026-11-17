// WebAudio 합성 효과음 (파일 없이). unlock() 은 사용자 탭/클릭 안에서 한 번 불러야 해요.
let ctx, master, motorOsc, motorGain;
let muted = false;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}
export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.7;
}
export const isMuted = () => muted;

function tone(freq, dur, { type = 'square', vol = 0.07, when = 0, to = null, attack = 0.005 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.12, when = 0, freq = 800 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export function coin() {
  tone(988, 0.08, { vol: 0.06 });
  tone(1319, 0.32, { vol: 0.06, when: 0.08 });
}
export function start() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { vol: 0.05, when: i * 0.07 }));
}
export function tick(urgent) {
  tone(urgent ? 1200 : 880, 0.06, { type: 'triangle', vol: 0.06 });
}
export function drop() {
  tone(520, 0.7, { type: 'sawtooth', vol: 0.035, to: 180 });
}
export function grab() {
  noise(0.12, { vol: 0.25, freq: 500 });
  tone(140, 0.15, { type: 'triangle', vol: 0.12 });
}
// 꼭대기에 쾅 부딪히는 소리 (둔탁한 쿵 + 쇠 덜컹)
export function clunk() {
  noise(0.22, { vol: 0.45, freq: 220 });
  tone(95, 0.3, { type: 'triangle', vol: 0.16, to: 55 });
  tone(620, 0.09, { type: 'square', vol: 0.035, when: 0.02 });
  tone(410, 0.12, { type: 'square', vol: 0.03, when: 0.07 });
}
export function thud() {
  noise(0.1, { vol: 0.12, freq: 300 });
}
export function slip() {
  tone(700, 0.35, { type: 'triangle', vol: 0.07, to: 220 });
}
export function miss() {
  tone(392, 0.22, { type: 'triangle', vol: 0.07 });
  tone(311, 0.22, { type: 'triangle', vol: 0.07, when: 0.22 });
  tone(262, 0.5, { type: 'triangle', vol: 0.07, when: 0.44, to: 200 });
}
export function win() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((f, i) => tone(f, i === notes.length - 1 ? 0.6 : 0.12, { vol: 0.06, when: i * 0.09 }));
  notes.forEach((f, i) => tone(f / 2, 0.1, { type: 'triangle', vol: 0.04, when: i * 0.09 }));
}
export function over() {
  [784, 659, 523, 659, 784].forEach((f, i) => tone(f, 0.14, { vol: 0.05, when: i * 0.12 }));
}

// 크레인 모터 웅- 소리 (움직이는 동안 켜둠)
export function motor(level) {
  if (!ctx) return;
  if (!motorOsc) {
    motorOsc = ctx.createOscillator();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.value = 70;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    motorOsc.connect(f).connect(motorGain).connect(master);
    motorOsc.start();
  }
  const t = ctx.currentTime;
  motorGain.gain.setTargetAtTime(level > 0 ? 0.035 * level : 0, t, 0.05);
  motorOsc.frequency.setTargetAtTime(60 + 40 * level, t, 0.08);
}
