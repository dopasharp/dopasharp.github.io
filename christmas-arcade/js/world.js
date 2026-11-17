// 크리스마스 오락실 맵: 바닥·벽·트리·장식·오락기 껍데기·충돌 상자.
// 인형뽑기 기계는 claw.js 에서 만들고, 여기서는 자리(MACHINES)와 다른 오락기 모델만 만들어요.
import * as THREE from 'three';

export const ROOM = { x0: -10, x1: 10, z0: -8, z1: 8 };
export const SPAWN = { x: 0, z: 6.2 };
export const CLAW_SCALE = 0.55;

// 오락기 자리. face = 기계 앞면이 보는 방향(라디안, 0 = +z 쪽).
export const MACHINES = [
  { id: 'claw', name: '인형뽑기', emoji: '🧸', x: -5.6, z: -6.6, face: 0, playable: true, cost: 1 },
  { id: 'ten', name: '10초 맞추기', emoji: '⏱️', x: -1.9, z: -6.9, face: 0, playable: true, cost: 1 },
  { id: 'basket', name: '농구', emoji: '🏀', x: 2.3, z: -6.5, face: 0, playable: false },
  { id: 'pinball', name: '핀볼', emoji: '🎯', x: 6.4, z: -6.6, face: 0, playable: false },
  { id: 'roulette', name: '행운 룰렛', emoji: '🎡', x: -9.0, z: -0.6, face: Math.PI / 2, playable: true, cost: 1 },
  { id: 'prize', name: '선물 교환소', emoji: '🎁', x: 8.9, z: 0.4, face: -Math.PI / 2, playable: false },
];

const PINK = 0xff6c91;
const LIME = 0xd9ff44;
const MINT = 0x86efc8;
const RED = 0xe23b4a;
const GOLD = 0xffd36b;

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  t.userData.canvas = c;
  return t;
}

const FONT = '"Black Han Sans", "Pretendard Variable", sans-serif';

export function buildWorld(scene) {
  const colliders = []; // { x0, x1, z0, z1 } 또는 { cx, cz, r }
  const animated = []; // (dt, now) => void
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const add = (mesh, x, y, z, { cast = true, receive = true } = {}) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  };
  const boxMesh = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

  // ---------------------------------------------------------------- 조명
  scene.background = new THREE.Color(0x0d0b16);
  scene.fog = new THREE.Fog(0x0d0b16, 22, 42);
  scene.add(new THREE.HemisphereLight(0xffeef6, 0x2a1b2a, 0.75));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.25);
  sun.position.set(4, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 11, bottom: -11, near: 1, far: 34 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const treeGlow = new THREE.PointLight(0xffc46b, 8, 8, 1.6);
  treeGlow.position.set(0, 2.2, 1.6);
  scene.add(treeGlow);

  // ---------------------------------------------------------------- 바닥: 오락실 카펫
  const carpet = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1b1430';
    g.fillRect(0, 0, w, h);
    const cols = ['#ff6c91', '#d9ff44', '#86efc8', '#6c8cff', '#ffd36b'];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      g.save();
      g.translate(x, y);
      g.rotate(rnd() * Math.PI);
      g.strokeStyle = cols[i % cols.length];
      g.fillStyle = cols[i % cols.length];
      g.globalAlpha = 0.55;
      g.lineWidth = 4;
      const k = i % 4;
      if (k === 0) { g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.stroke(); }
      else if (k === 1) { g.beginPath(); g.moveTo(-14, 0); g.lineTo(-5, -8); g.lineTo(5, 8); g.lineTo(14, 0); g.stroke(); }
      else if (k === 2) { star(g, 0, 0, 10, 4); g.fill(); }
      else { g.fillRect(-3, -12, 6, 24); g.fillRect(-12, -3, 24, 6); }
      g.restore();
    }
  }, [5, 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0), new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  add(floor, 0, 0, 0, { cast: false });

  // 입구 밖 눈밭 (화면 아래쪽)
  const snowGround = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), mat(0xeef4ff, { roughness: 1 }));
  snowGround.rotation.x = -Math.PI / 2;
  add(snowGround, 0, -0.01, ROOM.z1 + 10, { cast: false });
  // 입구 매트 + 문틀
  const mat2 = boxMesh(3.2, 0.02, 1.2, mat(0x8a1f2c, { roughness: 1 }));
  add(mat2, 0, 0.01, ROOM.z1 - 0.7, { cast: false });

  // ---------------------------------------------------------------- 벽 (뒤 + 양옆, 앞은 열린 단면)
  const wallTex = canvasTex(512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#2b1d3d');
    grd.addColorStop(1, '#4a2140');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.35;
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = (x / 64) % 2 ? '#3a2350' : '#552448';
      g.fillRect(x, 0, 32, h);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#1b1430';
    g.fillRect(0, h - 36, w, 36);
  }, [6, 1]);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
  const WALL_H = 4.6;
  const back = boxMesh(ROOM.x1 - ROOM.x0 + 0.4, WALL_H, 0.3, wallMat);
  add(back, 0, WALL_H / 2, ROOM.z0 - 0.15, { cast: false });
  for (const sx of [-1, 1]) {
    const side = boxMesh(0.3, WALL_H * 0.62, ROOM.z1 - ROOM.z0, wallMat);
    add(side, sx * (ROOM.x1 + 0.15), (WALL_H * 0.62) / 2, 0, { cast: false });
  }

  // 큰 네온 간판
  const signTex = canvasTex(1024, 220, (g, w, h) => {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `120px ${FONT}`;
    g.lineJoin = 'round';
    g.shadowColor = '#ff6c91';
    g.shadowBlur = 30;
    g.lineWidth = 16;
    g.strokeStyle = '#FF6C91';
    g.strokeText('D# CHRISTMAS ARCADE', w / 2, h / 2 + 6);
    g.shadowBlur = 0;
    g.fillStyle = '#D9FF44';
    g.fillText('D# CHRISTMAS ARCADE', w / 2, h / 2 + 6);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 9 * 220 / 1024), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(0, 3.75, ROOM.z0 + 0.02);
  scene.add(sign);
  document.fonts?.load(`120px "Black Han Sans"`).then(() => {
    const fresh = canvasTex(1024, 220, (g, w, h) => {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `120px ${FONT}`;
      g.lineJoin = 'round';
      g.shadowColor = '#ff6c91';
      g.shadowBlur = 30;
      g.lineWidth = 16;
      g.strokeStyle = '#FF6C91';
      g.strokeText('D# CHRISTMAS ARCADE', w / 2, h / 2 + 6);
      g.shadowBlur = 0;
      g.fillStyle = '#D9FF44';
      g.fillText('D# CHRISTMAS ARCADE', w / 2, h / 2 + 6);
    });
    sign.material.map = fresh;
    sign.material.needsUpdate = true;
  });

  // 벽 꼭대기 전구 줄 (색이 번갈아 깜빡)
  const bulbMats = [RED, GOLD, MINT, PINK].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1 }));
  const bulbGeo = new THREE.SphereGeometry(0.07, 10, 8);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1f3d23 });
  const garland = (from, to, sag, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(from, to, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      pts.push(p);
      if (i % 2 === 1) {
        const b = new THREE.Mesh(bulbGeo, bulbMats[(i >> 1) % bulbMats.length]);
        b.position.copy(p).y -= 0.08;
        scene.add(b);
      }
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  };
  for (let x = ROOM.x0; x < ROOM.x1; x += 4) garland(new THREE.Vector3(x, 4.35, ROOM.z0 + 0.2), new THREE.Vector3(x + 4, 4.35, ROOM.z0 + 0.2), 0.35, 16);
  for (const sx of [-1, 1]) for (let z = ROOM.z0; z < ROOM.z1; z += 4) garland(new THREE.Vector3(sx * (ROOM.x1 - 0.05), 2.75, z), new THREE.Vector3(sx * (ROOM.x1 - 0.05), 2.75, z + 4), 0.3, 16);
  animated.push((dt, now) => {
    const k = Math.floor(now / 420);
    bulbMats.forEach((m, i) => { m.emissiveIntensity = (i + k) % 2 ? 1.6 : 0.35; });
  });

  // 리스
  for (const x of [-8.2, 8.2]) {
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 10, 28), mat(0x1f6b35, { roughness: 0.9 }));
    add(wreath, x, 3.1, ROOM.z0 + 0.12, { cast: false });
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mat(RED));
    add(bow, x, 2.72, ROOM.z0 + 0.25, { cast: false });
  }

  // ---------------------------------------------------------------- 크리스마스트리 (가운데)
  const TREE = { x: 0, z: 0.4 };
  const tree = new THREE.Group();
  tree.position.set(TREE.x, 0, TREE.z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 12), mat(0x6b3f22));
  trunk.position.y = 0.3;
  tree.add(trunk);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.5, 20), mat(RED, { roughness: 0.4 }));
  pot.position.y = 0.25;
  tree.add(pot);
  const green = mat(0x1d7a3f, { roughness: 0.85 });
  const tiers = [[1.45, 1.4, 0.95], [1.15, 1.25, 1.85], [0.85, 1.1, 2.65], [0.55, 0.95, 3.35]];
  for (const [r, h, y] of tiers) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), green);
    c.position.y = y;
    tree.add(c);
  }
  const topStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.3 }));
  topStar.position.y = 4.0;
  topStar.scale.set(1, 1.3, 0.5);
  tree.add(topStar);
  // 오너먼트 + 반짝이 전구
  const ornGeo = new THREE.SphereGeometry(0.11, 14, 10);
  const ornMats = [RED, GOLD, 0x5aa0ff, PINK, LIME].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.5 }));
  const twinkle = [];
  const tinyGeo = new THREE.SphereGeometry(0.045, 8, 6);
  let n = 0;
  for (const [r, h, y] of tiers) {
    const count = Math.round(r * 9);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + y;
      const yy = y - h * 0.32;
      const rr = r * 0.78;
      const o = new THREE.Mesh(ornGeo, ornMats[n++ % ornMats.length]);
      o.position.set(Math.cos(a) * rr, yy, Math.sin(a) * rr);
      o.castShadow = true;
      tree.add(o);
      const lm = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd36b, emissiveIntensity: 1 });
      const l = new THREE.Mesh(tinyGeo, lm);
      const a2 = a + 0.35;
      l.position.set(Math.cos(a2) * rr * 0.92, yy + h * 0.25, Math.sin(a2) * rr * 0.92);
      tree.add(l);
      twinkle.push({ m: lm, ph: Math.random() * 6 });
    }
  }
  tree.traverse((o) => { if (o.isMesh && o.geometry.type !== 'SphereGeometry') { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(tree);
  animated.push((dt, now) => {
    for (const t of twinkle) t.m.emissiveIntensity = 0.6 + Math.max(0, Math.sin(now / 300 + t.ph)) * 1.8;
    topStar.rotation.y += dt * 0.8;
  });
  colliders.push({ cx: TREE.x, cz: TREE.z, r: 1.35 });

  // 선물 상자
  const gift = (x, z, s, c, rib, ry) => {
    const g = new THREE.Group();
    const b = boxMesh(s, s * 0.8, s, mat(c, { roughness: 0.5 }));
    b.position.y = s * 0.4;
    const r1 = boxMesh(s * 1.02, s * 0.82, s * 0.16, mat(rib));
    r1.position.y = s * 0.4;
    const r2 = boxMesh(s * 0.16, s * 0.82, s * 1.02, mat(rib));
    r2.position.y = s * 0.4;
    const bow = new THREE.Mesh(new THREE.TorusGeometry(s * 0.14, s * 0.05, 6, 12), mat(rib));
    bow.position.y = s * 0.85;
    g.add(b, r1, r2, bow);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
  };
  gift(TREE.x + 1.2, TREE.z + 1.0, 0.5, PINK, LIME, 0.3);
  gift(TREE.x - 1.25, TREE.z + 0.9, 0.42, 0x5aa0ff, 0xffffff, -0.4);
  gift(TREE.x + 0.3, TREE.z + 1.45, 0.34, LIME, RED, 0.9);
  gift(TREE.x - 0.6, TREE.z + 1.45, 0.3, GOLD, RED, 0.2);

  // 눈사람 (입구 옆)
  const snowman = new THREE.Group();
  const snowMat = mat(0xffffff, { roughness: 0.9 });
  for (const [r, y] of [[0.5, 0.45], [0.36, 1.1], [0.26, 1.58]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), snowMat);
    s.position.y = y;
    snowman.add(s);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 10), mat(0xff8a2a));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.58, 0.36);
  snowman.add(nose);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0x111111));
    e.position.set(s * 0.09, 1.66, 0.23);
    snowman.add(e);
  }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.28, 16), mat(0x111111));
  hat.position.y = 1.92;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 20), mat(0x111111));
  brim.position.y = 1.79;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 8, 20), mat(RED));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.36;
  snowman.add(hat, brim, scarf);
  snowman.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  snowman.position.set(4.6, 0, 6.2);
  snowman.rotation.y = -0.4;
  scene.add(snowman);
  colliders.push({ cx: 4.6, cz: 6.2, r: 0.55 });

  // 소파 (쉬는 자리)
  const sofaMat = mat(0x7b2d5a, { roughness: 0.8 });
  const sofa = new THREE.Group();
  const seat = boxMesh(2.4, 0.45, 0.9, sofaMat);
  seat.position.y = 0.23;
  const backrest = boxMesh(2.4, 0.7, 0.25, sofaMat);
  backrest.position.set(0, 0.6, -0.33);
  sofa.add(seat, backrest);
  for (const s of [-1, 1]) {
    const arm = boxMesh(0.25, 0.6, 0.9, sofaMat);
    arm.position.set(s * 1.2, 0.3, 0);
    sofa.add(arm);
  }
  sofa.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  sofa.position.set(-5.2, 0, 5.6);
  sofa.rotation.y = Math.PI;
  scene.add(sofa);
  colliders.push({ x0: -6.55, x1: -3.85, z0: 5.1, z1: 6.1 });

  // ---------------------------------------------------------------- 밖에 내리는 눈 (입구 쪽) + 실내에 살짝
  const flakes = 500;
  const pos = new Float32Array(flakes * 3);
  const spd = new Float32Array(flakes);
  for (let i = 0; i < flakes; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = Math.random() * 9;
    pos[i * 3 + 2] = ROOM.z1 - 2 + Math.random() * 12;
    spd[i] = 0.5 + Math.random() * 0.8;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snowDot = canvasTex(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 32, 32);
  });
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: 0.13, map: snowDot, transparent: true, depthWrite: false }));
  scene.add(snow);
  animated.push((dt, now) => {
    for (let i = 0; i < flakes; i++) {
      pos[i * 3 + 1] -= spd[i] * dt;
      pos[i * 3] += Math.sin(now / 900 + i) * dt * 0.15;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 9;
    }
    snowGeo.attributes.position.needsUpdate = true;
  });

  // ---------------------------------------------------------------- 오락기 (인형뽑기 빼고)
  const machineMeshes = {};
  for (const m of MACHINES) {
    if (m.id === 'claw') continue;
    const g = new THREE.Group();
    const parts = BUILDERS[m.id]({ mat, boxMesh, g, m });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(m.x, 0, m.z);
    g.rotation.y = m.face;
    scene.add(g);
    machineMeshes[m.id] = { group: g, ...parts };
    colliders.push(rotatedBox(m, parts.footprint));
    if (parts.animate) animated.push(parts.animate);
  }

  return { colliders, animated, machineMeshes, sun };
}

// 기계 로컬 사각형(x0..x1, z0..z1) → 월드 축정렬 상자 (face 는 90° 단위)
export function rotatedBox(m, f) {
  const c = Math.round(Math.cos(m.face));
  const s = Math.round(Math.sin(m.face));
  const pts = [[f.x0, f.z0], [f.x1, f.z0], [f.x0, f.z1], [f.x1, f.z1]].map(([x, z]) => [m.x + x * c + z * s, m.z - x * s + z * c]);
  return {
    x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
    z0: Math.min(...pts.map((p) => p[1])), z1: Math.max(...pts.map((p) => p[1])),
  };
}

function star(g, cx, cy, ro, ri) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
}

function marqueeTex(title, color = '#D9FF44', stroke = '#FF6C91') {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#101310';
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `76px ${FONT}`;
    g.lineJoin = 'round';
    g.lineWidth = 12;
    g.strokeStyle = stroke;
    g.strokeText(title, w / 2, h / 2 + 4);
    g.fillStyle = color;
    g.fillText(title, w / 2, h / 2 + 4);
  });
}

// 공통 오락기 캐비닛: 아래 몸통 + 위 화면 + 간판
function cabinet({ mat, boxMesh, g }, { color, title, screen, w = 1.3 }) {
  const body = mat(color, { roughness: 0.45 });
  const dark = mat(0x15191a);
  const lime = new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.6 });
  const base = boxMesh(w, 1.0, 0.95, body);
  base.position.set(0, 0.5, 0);
  const upper = boxMesh(w, 1.2, 0.6, body);
  upper.position.set(0, 1.6, -0.18);
  const panel = boxMesh(w, 0.12, 0.5, dark);
  panel.position.set(0, 1.04, 0.2);
  panel.rotation.x = 0.25;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.8), new THREE.MeshBasicMaterial({ map: screen }));
  scr.position.set(0, 1.62, 0.125);
  scr.rotation.x = -0.12;
  const marquee = boxMesh(w * 1.06, 0.38, 0.7, body);
  marquee.position.set(0, 2.39, -0.12);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, 0.3), new THREE.MeshBasicMaterial({ map: marqueeTex(title) }));
  sign.position.set(0, 2.39, 0.235);
  const trim1 = boxMesh(w * 1.08, 0.04, 0.72, lime);
  trim1.position.set(0, 2.2, -0.12);
  const trim2 = boxMesh(w * 1.02, 0.04, 0.97, lime);
  trim2.position.set(0, 0.02, 0);
  g.add(base, upper, panel, scr, marquee, sign, trim1, trim2);
  return { screen: scr };
}

export function screenTex(draw) {
  return canvasTex(384, 288, draw);
}

const BUILDERS = {
  ten({ mat, boxMesh, g }) {
    const tex = screenTex(drawTen('10.00', '#86EFC8'));
    const { screen } = cabinet({ mat, boxMesh, g }, { color: 0x2a9d8f, title: '10초 맞추기', screen: tex });
    // 큰 STOP 버튼
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24), new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0.5 }));
    btn.position.set(0, 1.14, 0.25);
    btn.rotation.x = 0.25;
    g.add(btn);
    return {
      footprint: { x0: -0.7, x1: 0.7, z0: -0.5, z1: 0.5 },
      setScreen(text, color) {
        const c = tex.userData.canvas;
        drawTen(text, color)(c.getContext('2d'), c.width, c.height);
        tex.needsUpdate = true;
      },
      screen,
    };
  },
  basket({ mat, boxMesh, g }) {
    const body = mat(0xff8a2a, { roughness: 0.5 });
    const ramp = boxMesh(1.7, 0.2, 2.2, mat(0x6b3f22, { roughness: 0.7 }));
    ramp.position.set(0, 0.8, 0.1);
    ramp.rotation.x = -0.12;
    for (const s of [-1, 1]) {
      const side = boxMesh(0.08, 0.9, 2.2, body);
      side.position.set(s * 0.86, 0.45, 0.1);
      g.add(side);
      const net = boxMesh(0.02, 1.6, 1.6, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }));
      net.position.set(s * 0.86, 1.7, -0.3);
      g.add(net);
    }
    const front = boxMesh(1.7, 0.75, 0.1, body);
    front.position.set(0, 0.38, 1.18);
    const board = boxMesh(1.4, 1.0, 0.06, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    board.position.set(0, 2.3, -1.0);
    const square = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.36, 0.01)), new THREE.LineBasicMaterial({ color: RED }));
    square.position.set(0, 2.15, -0.96);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), mat(RED, { metalness: 0.5 }));
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(0, 1.95, -0.7);
    const netCone = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.3, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true }));
    netCone.position.set(0, 1.8, -0.7);
    const marquee = boxMesh(1.8, 0.4, 0.3, body);
    marquee.position.set(0, 3.0, -1.0);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.34), new THREE.MeshBasicMaterial({ map: marqueeTex('농구') }));
    sign.position.set(0, 3.0, -0.84);
    const pole = boxMesh(1.7, 2.9, 0.12, body);
    pole.position.set(0, 1.45, -1.12);
    const balls = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(0xe8742a, { roughness: 0.8 }));
      b.position.set(-0.5 + i * 0.25, 0.97, 0.9);
      g.add(b);
      balls.push(b);
    }
    g.add(ramp, front, board, square, hoop, netCone, marquee, sign, pole);
    return { footprint: { x0: -0.95, x1: 0.95, z0: -1.2, z1: 1.25 } };
  },
  pinball({ mat, boxMesh, g }) {
    const body = mat(0x6c4cff, { roughness: 0.45 });
    const play = canvasTex(256, 512, (c, w, h) => {
      const grd = c.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#2b1d3d');
      grd.addColorStop(1, '#101310');
      c.fillStyle = grd;
      c.fillRect(0, 0, w, h);
      const cols = ['#FF6C91', '#D9FF44', '#86EFC8', '#FFD36B'];
      for (let i = 0; i < 9; i++) {
        c.fillStyle = cols[i % 4];
        c.beginPath();
        c.arc(40 + (i % 3) * 88, 80 + Math.floor(i / 3) * 90, 18, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#D9FF44';
      c.lineWidth = 8;
      c.beginPath(); c.moveTo(40, 440); c.lineTo(110, 470); c.stroke();
      c.beginPath(); c.moveTo(216, 440); c.lineTo(146, 470); c.stroke();
    });
    const table = boxMesh(0.9, 0.3, 1.7, body);
    table.position.set(0, 0.95, 0.1);
    table.rotation.x = 0.1;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshBasicMaterial({ map: play }));
    field.rotation.x = -Math.PI / 2 + 0.1;
    field.position.set(0, 1.115, 0.1);
    for (const [x, z] of [[-0.38, 0.85], [0.38, 0.85], [-0.38, -0.65], [0.38, -0.65]]) {
      const leg = boxMesh(0.08, 0.85, 0.08, mat(0x15191a));
      leg.position.set(x, 0.42, z);
      g.add(leg);
    }
    const backbox = boxMesh(0.95, 0.9, 0.25, body);
    backbox.position.set(0, 1.75, -0.78);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.7), new THREE.MeshBasicMaterial({ map: marqueeTex('핀볼', '#FFD36B', '#6c4cff') }));
    sign.position.set(0, 1.75, -0.65);
    g.add(table, field, backbox, sign);
    return { footprint: { x0: -0.5, x1: 0.5, z0: -0.92, z1: 0.95 } };
  },
  roulette({ mat, boxMesh, g }) {
    const body = mat(0xb8323f, { roughness: 0.45 });
    const base = boxMesh(1.6, 1.0, 0.9, body);
    base.position.set(0, 0.5, 0);
    const back = boxMesh(1.6, 2.1, 0.3, body);
    back.position.set(0, 1.55, -0.3);
    const wheelTex = canvasTex(512, 512, drawWheel);
    const wheel = new THREE.Mesh(new THREE.CircleGeometry(0.68, 48), new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.4 }));
    wheel.position.set(0, 1.75, -0.14);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 10, 48), mat(GOLD, { metalness: 0.8, roughness: 0.25 }));
    rim.position.copy(wheel.position);
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 3), mat(LIME, { emissive: LIME, emissiveIntensity: 0.6 }));
    pointer.position.set(0, 2.52, -0.1);
    pointer.rotation.z = Math.PI;
    const marquee = boxMesh(1.7, 0.38, 0.5, body);
    marquee.position.set(0, 2.82, -0.25);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.32), new THREE.MeshBasicMaterial({ map: marqueeTex('행운 룰렛') }));
    sign.position.set(0, 2.82, 0.005);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), mat(0xdfe4ea, { metalness: 0.9, roughness: 0.2 }));
    lever.position.set(0.55, 1.2, 0.25);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), mat(RED));
    knob.position.set(0.55, 1.42, 0.25);
    g.add(base, back, wheel, rim, pointer, marquee, sign, lever, knob);
    return { footprint: { x0: -0.85, x1: 0.85, z0: -0.5, z1: 0.5 }, wheel };
  },
  prize({ mat, boxMesh, g }) {
    const body = mat(0x1d7a3f, { roughness: 0.5 });
    const counter = boxMesh(2.6, 1.0, 0.7, body);
    counter.position.set(0, 0.5, 0);
    const top = boxMesh(2.7, 0.06, 0.8, mat(GOLD, { metalness: 0.5, roughness: 0.3 }));
    top.position.set(0, 1.03, 0);
    const shelf = boxMesh(2.6, 2.2, 0.4, mat(0x2b1d3d));
    shelf.position.set(0, 1.6, -0.9);
    for (const y of [1.0, 1.7, 2.4]) {
      const s = boxMesh(2.5, 0.05, 0.45, mat(0xdfe4ea, { metalness: 0.6, roughness: 0.3 }));
      s.position.set(0, y, -0.8);
      g.add(s);
      const cols = [PINK, LIME, MINT, GOLD, 0x5aa0ff, RED];
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(i % 2 ? new THREE.SphereGeometry(0.15, 12, 10) : new THREE.BoxGeometry(0.26, 0.26, 0.26), mat(cols[(i + y * 3) % 6 | 0]));
        b.position.set(-1.05 + i * 0.42, y + 0.17, -0.8);
        g.add(b);
      }
    }
    const marquee = boxMesh(2.6, 0.4, 0.2, body);
    marquee.position.set(0, 2.95, -0.75);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.34), new THREE.MeshBasicMaterial({ map: marqueeTex('선물 교환소', '#FFD36B', '#1d7a3f') }));
    sign.position.set(0, 2.95, -0.64);
    g.add(counter, top, shelf, marquee, sign);
    return { footprint: { x0: -1.35, x1: 1.35, z0: -1.1, z1: 0.4 } };
  },
};

export const WHEEL = [
  { v: 0, label: '꽝', color: '#2b1d3d' },
  { v: 2, label: '2', color: '#FF6C91' },
  { v: 1, label: '1', color: '#86EFC8' },
  { v: 3, label: '3', color: '#FFD36B' },
  { v: 0, label: '꽝', color: '#2b1d3d' },
  { v: 1, label: '1', color: '#86EFC8' },
  { v: 2, label: '2', color: '#FF6C91' },
  { v: 5, label: '5', color: '#D9FF44' },
];
function drawWheel(g, w, h) {
  const n = WHEEL.length;
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < n; i++) {
    // 0번 칸이 맨 위(12시)에 오도록
    const a0 = -Math.PI / 2 - Math.PI / n + (i / n) * Math.PI * 2;
    g.fillStyle = WHEEL[i].color;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, w / 2, a0, a0 + (Math.PI * 2) / n);
    g.closePath();
    g.fill();
    g.save();
    g.translate(cx, cy);
    g.rotate(a0 + Math.PI / n + Math.PI / 2);
    g.fillStyle = WHEEL[i].v ? '#101310' : '#F7F6F2';
    g.font = `64px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(WHEEL[i].v ? `🎟${WHEEL[i].label}` : WHEEL[i].label, 0, -h * 0.3);
    g.restore();
  }
  g.fillStyle = '#101310';
  g.beginPath();
  g.arc(cx, cy, 40, 0, Math.PI * 2);
  g.fill();
}

function drawTen(text, color) {
  return (g, w, h) => {
    g.fillStyle = '#071412';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(134,239,200,.12)';
    for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.font = `120px ${FONT}`;
    g.fillText(text, w / 2, h / 2 + 6);
    g.shadowBlur = 0;
  };
}
