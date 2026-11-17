// 캐릭터: 산타 모자 쓴 동글동글 꼬마. 지오메트리는 모두 공유하고 색 재질만 캐시해서 여러 명이어도 가벼워요.
import * as THREE from 'three';
import { canvasTex } from './world.js';

export const OUTFITS = [
  { key: 'red', label: '산타', body: 0xe23b4a, hat: 0xe23b4a, scarf: 0xffffff },
  { key: 'lime', label: '라임', body: 0xd9ff44, hat: 0xe23b4a, scarf: 0xff6c91 },
  { key: 'pink', label: '핑크', body: 0xff6c91, hat: 0xe23b4a, scarf: 0xd9ff44 },
  { key: 'mint', label: '민트', body: 0x86efc8, hat: 0x1d7a3f, scarf: 0xffd36b },
  { key: 'blue', label: '눈사람', body: 0x5aa0ff, hat: 0x2b1d3d, scarf: 0xff8a2a },
  { key: 'gold', label: '루돌프', body: 0xa0663b, hat: 0xe23b4a, scarf: 0xe23b4a, antlers: true },
];
export const outfitOf = (key) => OUTFITS.find((o) => o.key === key) || OUTFITS[0];

const G = {
  body: new THREE.CapsuleGeometry(0.27, 0.22, 6, 16),
  head: new THREE.SphereGeometry(0.31, 24, 18),
  eye: new THREE.SphereGeometry(0.045, 10, 8),
  shine: new THREE.SphereGeometry(0.015, 6, 4),
  cheek: new THREE.SphereGeometry(0.05, 10, 6),
  hat: new THREE.ConeGeometry(0.25, 0.42, 20),
  brim: new THREE.TorusGeometry(0.24, 0.06, 8, 22),
  pom: new THREE.SphereGeometry(0.07, 10, 8),
  scarf: new THREE.TorusGeometry(0.2, 0.06, 8, 20),
  foot: new THREE.SphereGeometry(0.1, 12, 8),
  arm: new THREE.CapsuleGeometry(0.065, 0.16, 4, 8),
  antler: new THREE.CylinderGeometry(0.025, 0.03, 0.22, 6),
  nose: new THREE.SphereGeometry(0.055, 10, 8),
  shadow: new THREE.CircleGeometry(0.34, 20),
};
const matCache = new Map();
function m(color, extra = {}) {
  const k = color + JSON.stringify(extra);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra }));
  return matCache.get(k);
}
const SKIN = 0xffe0c7;

export function createAvatar({ nickname = '', outfit = 'red', me = false }) {
  const o = outfitOf(outfit);
  const root = new THREE.Group();
  const rig = new THREE.Group(); // 통통 튀는 부분
  root.add(rig);
  const part = (geo, mat, x, y, z, parent = rig) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const body = part(G.body, m(o.body, { roughness: 0.8 }), 0, 0.5, 0);
  part(G.scarf, m(o.scarf, { roughness: 0.9 }), 0, 0.74, 0).rotation.x = Math.PI / 2;
  const head = new THREE.Group();
  head.position.y = 1.02;
  rig.add(head);
  part(G.head, m(SKIN, { roughness: 0.7 }), 0, 0, 0, head);
  for (const s of [-1, 1]) {
    part(G.eye, m(0x1a1414, { roughness: 0.15 }), s * 0.11, -0.01, 0.27, head).scale.set(1, 1.25, 0.6);
    part(G.shine, m(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 }), s * 0.11 - 0.015, 0.02, 0.305, head);
    part(G.cheek, m(0xff8fb0, { roughness: 0.9 }), s * 0.19, -0.08, 0.23, head).scale.set(1, 0.55, 0.4);
  }
  if (o.antlers) {
    part(G.nose, m(0xe23b4a, { emissive: 0xe23b4a, emissiveIntensity: 0.6 }), 0, -0.06, 0.31, head);
    for (const s of [-1, 1]) {
      const a = part(G.antler, m(0x6b3f22), s * 0.17, 0.3, -0.02, head);
      a.rotation.z = -s * 0.5;
      const b = part(G.antler, m(0x6b3f22), s * 0.26, 0.36, -0.02, head);
      b.scale.setScalar(0.6);
      b.rotation.z = s * 0.6;
    }
  } else {
    const hat = new THREE.Group();
    hat.position.set(0, 0.24, -0.02);
    hat.rotation.z = -0.25;
    head.add(hat);
    part(G.hat, m(o.hat, { roughness: 0.85 }), 0, 0.17, 0, hat);
    part(G.brim, m(0xffffff, { roughness: 1 }), 0, -0.02, 0, hat).rotation.x = Math.PI / 2;
    part(G.pom, m(0xffffff, { roughness: 1 }), 0.02, 0.4, 0, hat);
  }
  const feet = [-1, 1].map((s) => part(G.foot, m(0x2b1d3d), s * 0.12, 0.08, 0.04, root));
  for (const f of feet) f.scale.set(1, 0.7, 1.3);
  const arms = [-1, 1].map((s) => {
    const a = part(G.arm, m(o.body, { roughness: 0.8 }), s * 0.3, 0.52, 0);
    a.rotation.z = s * 0.5;
    return a;
  });
  // 바닥 그림자 (그림자맵이 꺼진 폰에서도 땅에 붙어 보이게)
  const blob = new THREE.Mesh(G.shadow, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  root.add(blob);

  // 머리 위 닉네임
  const label = nameSprite(nickname, me);
  label.position.y = 1.85;
  root.add(label);

  let phase = 0;
  let wave = 0;
  const api = {
    root,
    label,
    setName(n) {
      const fresh = nameSprite(n, me);
      label.material.map.dispose();
      label.material.map = fresh.material.map;
      label.scale.copy(fresh.scale);
    },
    wave() { wave = 1.6; },
    // speed: 0..1 (걷는 정도)
    animate(dt, speed) {
      phase += dt * (4 + speed * 8);
      const walk = Math.min(1, speed);
      rig.position.y = Math.abs(Math.sin(phase)) * 0.08 * walk + Math.sin(phase * 0.4) * 0.008 * (1 - walk);
      body.scale.set(1 + Math.sin(phase * 0.4) * 0.015 * (1 - walk), 1, 1);
      feet[0].position.z = 0.04 + Math.sin(phase) * 0.14 * walk;
      feet[1].position.z = 0.04 - Math.sin(phase) * 0.14 * walk;
      feet[0].position.y = 0.08 + Math.max(0, Math.sin(phase)) * 0.06 * walk;
      feet[1].position.y = 0.08 + Math.max(0, -Math.sin(phase)) * 0.06 * walk;
      arms[0].rotation.x = -Math.sin(phase) * 0.7 * walk;
      arms[1].rotation.x = Math.sin(phase) * 0.7 * walk;
      head.rotation.z = Math.sin(phase * 0.5) * 0.05;
      if (wave > 0) {
        wave = Math.max(0, wave - dt);
        arms[1].rotation.z = -2.6 + Math.sin(wave * 14) * 0.35;
        arms[1].rotation.x = 0;
      } else {
        arms[1].rotation.z = 0.5;
      }
    },
  };
  return api;
}

function nameSprite(text, me) {
  const label = String(text || '').slice(0, 12);
  const tex = canvasTex(512, 112, (g, w, h) => {
    g.font = '700 52px "Pretendard Variable", "Pretendard", sans-serif';
    const tw = Math.min(w - 16, g.measureText(label).width + 48);
    const x = (w - tw) / 2;
    g.fillStyle = me ? 'rgba(217,255,68,.95)' : 'rgba(11,14,13,.72)';
    roundRect(g, x, 18, tw, 76, 38);
    g.fill();
    g.fillStyle = me ? '#101310' : '#F7F6F2';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, w / 2, h / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.35, 1);
  s.renderOrder = 20;
  return s;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
