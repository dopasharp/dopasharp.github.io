// 캐릭터 그리기 (canvas 2D). 눈 뜬 정도·입·눈썹·고개 기울기를 받아서 움직여요.
// 나(1:1 아바타)와 상대 캐릭터가 같은 코드를 써요.

export const SKINS = {
  bear:   { name: '곰',     face: '#B9835A', dark: '#7A5233', light: '#E8C9A6', ears: 'round', eye: 0.2 },
  rabbit: { name: '토끼',   face: '#F4EEE8', dark: '#D9C9BE', light: '#FFD3DE', ears: 'long', eye: 0.2 },
  frog:   { name: '개구리', face: '#7FCB6A', dark: '#4E9A40', light: '#D6F2B8', ears: 'frog', eye: 0.22 },
  chick:  { name: '병아리', face: '#FFD84A', dark: '#E0A800', light: '#FFF1A8', ears: 'tuft', eye: 0.18, beak: true },
  // 혼자 하기 상대들
  cat:    { name: '졸린 고양이', face: '#F2A65A', dark: '#C46F25', light: '#FFE2C2', ears: 'cat', eye: 0.2, whisker: true },
  owl:    { name: '부엉이',     face: '#9C7B5B', dark: '#5E4631', light: '#E9D8BF', ears: 'owl', eye: 0.3, beak: true },
  boss:   { name: '압박 면접관', face: '#F1C9A5', dark: '#2B2B33', light: '#FFE3CC', ears: 'human', eye: 0.17, glasses: true, tie: true },
  fish:   { name: '물고기',     face: '#5AB6F2', dark: '#2A7DB8', light: '#CDEBFF', ears: 'fin', eye: 0.24, noLids: true },
};

export const PLAYER_SKINS = ['bear', 'rabbit', 'frog', 'chick'];

// 핏줄 모양은 매번 같게 (화면이 깜빡거리지 않게)
const VEINS = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 + 0.4;
  return { a, len: 0.45 + ((i * 37) % 10) / 30, bend: ((i * 53) % 7 - 3) / 10 };
});

/**
 * pose: { openL, openR, jaw, brow, roll, scale, dx, dy, red(0~1 충혈), tears(0~1), lookX, lookY, shake }
 */
export function drawAvatar(g, w, h, skinId, pose = {}, time = performance.now()) {
  const S = SKINS[skinId] || SKINS.bear;
  const p = { openL: 1, openR: 1, jaw: 0, brow: 0, roll: 0, scale: 1, dx: 0, dy: 0, red: 0, tears: 0, lookX: 0, lookY: 0, shake: 0, ...pose };
  g.clearRect(0, 0, w, h);
  const R = Math.min(w, h) * 0.33 * p.scale;
  const cx = w / 2 + p.dx * w + (p.shake ? (Math.random() - 0.5) * p.shake * R * 0.12 : 0);
  const cy = h * 0.52 + p.dy * h;
  g.save();
  g.translate(cx, cy);
  g.rotate(p.roll);
  g.lineCap = 'round'; g.lineJoin = 'round';

  // 몸통 살짝 (넥타이 등)
  if (S.tie) {
    g.fillStyle = '#23232B';
    g.beginPath(); g.ellipse(0, R * 1.35, R * 1.05, R * 0.55, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(-R * 0.25, R * 0.82); g.lineTo(0, R * 1.05); g.lineTo(R * 0.25, R * 0.82); g.fill();
    g.fillStyle = '#C8313A';
    g.beginPath(); g.moveTo(-R * 0.09, R * 0.9); g.lineTo(R * 0.09, R * 0.9); g.lineTo(R * 0.13, R * 1.35); g.lineTo(0, R * 1.5); g.lineTo(-R * 0.13, R * 1.35); g.closePath(); g.fill();
  }

  drawEars(g, R, S, time);

  // 얼굴
  g.fillStyle = S.face;
  g.beginPath();
  if (S.ears === 'fin') g.ellipse(0, 0, R * 1.08, R * 0.92, 0, 0, Math.PI * 2);
  else g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = S.dark; g.lineWidth = Math.max(2, R * 0.035); g.stroke();

  if (S.ears === 'human') { // 머리카락
    g.fillStyle = S.dark;
    g.beginPath(); g.arc(0, -R * 0.12, R * 1.0, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(R * 0.2, -R * 0.55, -R * 0.95, -R * 0.35); g.fill();
  }
  if (S.ears === 'owl') { // 부엉이 얼굴판
    g.fillStyle = S.light;
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * R * 0.4, -R * 0.02, R * 0.42, 0, Math.PI * 2); g.fill(); }
  }
  if (S.ears === 'fin') { // 물고기 비늘 무늬
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = R * 0.03;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-R * 0.15 + i * R * 0.3, R * 0.5, R * 0.16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }

  // 볼터치
  g.fillStyle = 'rgba(255,110,140,.28)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * R * 0.6, R * 0.28, R * 0.15, R * 0.09, 0, 0, Math.PI * 2); g.fill(); }

  // 눈
  const er = R * S.eye;
  const ey = S.ears === 'frog' ? -R * 0.62 : -R * 0.06;
  const ex = S.ears === 'frog' ? R * 0.45 : S.ears === 'owl' ? R * 0.4 : R * 0.38;
  for (const [sx, open] of [[-1, p.openL], [1, p.openR]]) {
    drawEye(g, sx * ex, ey, er, S.noLids ? 1 : open, p, S, sx, time);
  }

  // 눈썹
  if (!S.noLids && S.ears !== 'frog') {
    g.strokeStyle = S.ears === 'human' ? '#2B2B33' : S.dark; g.lineWidth = R * 0.06;
    const by = ey - er * 1.35 - p.brow * R * 0.18;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * (ex - er * 0.8), by + er * 0.12 - p.brow * er * 0.2);
      g.quadraticCurveTo(sx * ex, by - er * 0.25, sx * (ex + er * 0.8), by + er * 0.1);
      g.stroke();
    }
  }
  if (S.glasses) {
    g.strokeStyle = '#111'; g.lineWidth = R * 0.045;
    for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(sx * ex - er * 1.4, ey - er * 1.15, er * 2.8, er * 2.3, er * 0.5); g.stroke(); }
    g.beginPath(); g.moveTo(-ex + er * 1.4, ey); g.lineTo(ex - er * 1.4, ey); g.stroke();
  }

  // 코·입
  const my = R * 0.42;
  if (S.beak) {
    g.fillStyle = '#FF9F1C';
    const open = p.jaw * R * 0.35;
    g.beginPath(); g.moveTo(-R * 0.14, R * 0.18); g.lineTo(R * 0.14, R * 0.18); g.lineTo(0, R * 0.36); g.closePath(); g.fill();
    if (open > 2) { g.fillStyle = '#E2711D'; g.beginPath(); g.moveTo(-R * 0.11, R * 0.22 + open * 0.3); g.lineTo(R * 0.11, R * 0.22 + open * 0.3); g.lineTo(0, R * 0.36 + open); g.closePath(); g.fill(); }
  } else {
    if (S.ears === 'bear' || S.ears === 'round') {
      g.fillStyle = S.light; g.beginPath(); g.ellipse(0, R * 0.36, R * 0.32, R * 0.24, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = S.ears === 'human' ? '#D9A07E' : '#3A2A25';
    g.beginPath(); g.ellipse(0, R * 0.24, R * 0.08, R * 0.055, 0, 0, Math.PI * 2); g.fill();
    const open = p.jaw * R * 0.38;
    if (open > R * 0.04) {
      g.fillStyle = '#5A1E2A';
      g.beginPath(); g.ellipse(0, my + open * 0.35, R * 0.17, open * 0.6 + R * 0.03, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FF7C93';
      g.beginPath(); g.ellipse(0, my + open * 0.6, R * 0.1, open * 0.25, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.strokeStyle = '#3A2A25'; g.lineWidth = R * 0.035;
      g.beginPath(); g.moveTo(-R * 0.13, my - R * 0.02); g.quadraticCurveTo(-R * 0.06, my + R * 0.06, 0, my); g.quadraticCurveTo(R * 0.06, my + R * 0.06, R * 0.13, my - R * 0.02); g.stroke();
    }
  }
  if (S.whisker) {
    g.strokeStyle = 'rgba(60,30,10,.5)'; g.lineWidth = R * 0.02;
    for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(sx * R * 0.3, R * 0.3 + k * R * 0.06); g.lineTo(sx * R * 0.85, R * 0.24 + k * R * 0.13); g.stroke(); }
  }
  g.restore();
}

function drawEars(g, R, S, time) {
  g.fillStyle = S.face; g.strokeStyle = S.dark; g.lineWidth = Math.max(2, R * 0.035);
  const both = (fn) => { for (const sx of [-1, 1]) fn(sx); };
  switch (S.ears) {
    case 'round': both((sx) => { g.beginPath(); g.arc(sx * R * 0.72, -R * 0.72, R * 0.3, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = S.light; g.beginPath(); g.arc(sx * R * 0.72, -R * 0.72, R * 0.16, 0, Math.PI * 2); g.fill(); g.fillStyle = S.face; }); break;
    case 'long': both((sx) => { g.save(); g.translate(sx * R * 0.38, -R * 0.8); g.rotate(sx * (0.18 + Math.sin(time / 700) * 0.04)); g.beginPath(); g.ellipse(0, -R * 0.45, R * 0.18, R * 0.6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = S.light; g.beginPath(); g.ellipse(0, -R * 0.42, R * 0.09, R * 0.45, 0, 0, Math.PI * 2); g.fill(); g.restore(); g.fillStyle = S.face; }); break;
    case 'frog': both((sx) => { g.beginPath(); g.arc(sx * R * 0.45, -R * 0.62, R * 0.36, 0, Math.PI * 2); g.fill(); g.stroke(); }); break;
    case 'tuft': g.beginPath(); g.moveTo(-R * 0.1, -R * 0.95); g.quadraticCurveTo(0, -R * 1.35, R * 0.05, -R * 0.95); g.quadraticCurveTo(R * 0.2, -R * 1.25, R * 0.2, -R * 0.92); g.fill(); break;
    case 'cat': both((sx) => { g.beginPath(); g.moveTo(sx * R * 0.85, -R * 0.35); g.lineTo(sx * R * 0.72, -R * 1.12); g.lineTo(sx * R * 0.22, -R * 0.86); g.closePath(); g.fill(); g.stroke(); g.fillStyle = S.light; g.beginPath(); g.moveTo(sx * R * 0.72, -R * 0.5); g.lineTo(sx * R * 0.68, -R * 0.95); g.lineTo(sx * R * 0.38, -R * 0.82); g.closePath(); g.fill(); g.fillStyle = S.face; }); break;
    case 'owl': both((sx) => { g.beginPath(); g.moveTo(sx * R * 0.85, -R * 0.45); g.lineTo(sx * R * 0.95, -R * 1.15); g.lineTo(sx * R * 0.4, -R * 0.85); g.closePath(); g.fill(); g.stroke(); }); break;
    case 'human': both((sx) => { g.beginPath(); g.ellipse(sx * R * 0.98, R * 0.02, R * 0.14, R * 0.22, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }); break;
    case 'fin': {
      g.fillStyle = S.dark;
      g.beginPath(); g.moveTo(-R * 0.3, -R * 0.82); g.quadraticCurveTo(0, -R * 1.35 + Math.sin(time / 300) * R * 0.05, R * 0.45, -R * 0.78); g.fill();
      both((sx) => { g.beginPath(); g.ellipse(sx * R * 1.08, R * 0.25, R * 0.3, R * 0.14, sx * (0.6 + Math.sin(time / 250) * 0.15), 0, Math.PI * 2); g.fill(); });
      break;
    }
  }
}

function drawEye(g, x, y, er, open, p, S, sx, time) {
  open = Math.max(0, Math.min(1, open));
  g.save();
  g.translate(x, y);
  // 흰자
  g.beginPath(); g.arc(0, 0, er, 0, Math.PI * 2);
  g.fillStyle = p.red > 0.5 ? `rgb(255,${Math.round(250 - (p.red - 0.5) * 120)},${Math.round(250 - (p.red - 0.5) * 140)})` : '#fff';
  g.fill();
  g.save(); g.clip();
  // 충혈 핏줄
  if (p.red > 0.05) {
    g.strokeStyle = `rgba(220,30,50,${Math.min(0.9, p.red)})`; g.lineWidth = Math.max(1, er * 0.05);
    const n = Math.ceil(VEINS.length * Math.min(1, p.red * 1.4));
    for (let i = 0; i < n; i++) {
      const v = VEINS[i];
      const x0 = Math.cos(v.a) * er, y0 = Math.sin(v.a) * er;
      const x1 = Math.cos(v.a) * er * (1 - v.len), y1 = Math.sin(v.a) * er * (1 - v.len);
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + v.bend * er, (y0 + y1) / 2 - v.bend * er, x1, y1); g.stroke();
    }
  }
  // 눈동자 (떨림: 오래 버틸수록 미세하게 떨려요)
  const jitter = p.red > 0.6 ? (p.red - 0.6) * er * 0.12 : 0;
  const px = p.lookX * er * 0.35 + (Math.random() - 0.5) * jitter;
  const py = p.lookY * er * 0.35 + (Math.random() - 0.5) * jitter;
  g.fillStyle = S.ears === 'owl' ? '#F5A623' : '#1B1B22';
  g.beginPath(); g.arc(px, py, er * 0.55, 0, Math.PI * 2); g.fill();
  if (S.ears === 'owl') { g.fillStyle = '#111'; g.beginPath(); g.arc(px, py, er * 0.3, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(px - er * 0.18, py - er * 0.2, er * 0.16, 0, Math.PI * 2); g.fill();
  // 눈꺼풀: 위에서 내려와요
  if (open < 0.999) {
    const lid = -er + (1 - open) * er * 2.05;
    g.fillStyle = S.face;
    g.fillRect(-er - 2, -er - 2, er * 2 + 4, lid + er + 2);
    g.strokeStyle = S.dark; g.lineWidth = Math.max(2, er * 0.14);
    g.beginPath(); g.moveTo(-er, lid); g.lineTo(er, lid); g.stroke();
    if (open < 0.2) { // 속눈썹
      g.lineWidth = Math.max(1.5, er * 0.08);
      for (const k of [-0.6, 0, 0.6]) { g.beginPath(); g.moveTo(k * er, lid); g.lineTo(k * er * 1.25, lid + er * 0.28); g.stroke(); }
    }
  }
  g.restore();
  g.strokeStyle = S.dark; g.lineWidth = Math.max(2, er * 0.1);
  g.beginPath(); g.arc(0, 0, er, 0, Math.PI * 2); g.stroke();
  // 눈물
  if (p.tears > 0.05) {
    const n = 1 + Math.floor(p.tears * 2.5);
    for (let i = 0; i < n; i++) {
      const t = ((time / (900 - p.tears * 400) + i / n + (sx > 0 ? 0.37 : 0)) % 1);
      const ty = er * 0.8 + t * er * 3.2;
      const tx = sx * er * 0.55 + Math.sin(t * 6) * er * 0.08;
      g.globalAlpha = 1 - t;
      g.fillStyle = '#7FD3FF';
      g.beginPath(); g.moveTo(tx, ty - er * 0.28); g.quadraticCurveTo(tx + er * 0.17, ty, tx, ty + er * 0.12); g.quadraticCurveTo(tx - er * 0.17, ty, tx, ty - er * 0.28); g.fill();
    }
    g.globalAlpha = 1;
  }
  g.restore();
}
