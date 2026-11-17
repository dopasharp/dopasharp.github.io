// 멀티플레이 연동.
// - firebase: 익명 로그인 + Realtime Database (다른 기기끼리)
// - local:    BroadcastChannel (같은 브라우저의 탭끼리. Firebase 설정 전 테스트용, 주소에 ?local 을 붙여도 돼요)
//
// 데이터 (arcade/{ROOM})
//   players/{uid}            { n 닉네임, o 옷, x, z, r 방향, s 상태 walk|play|queue, m 기계, t 시각 }  ← 끊기면 자동 삭제
//   machines/{id}/player     { uid, n, beat }   ← 지금 하는 사람. beat 가 15초 넘게 멈추면 다른 사람이 가져갈 수 있음
//   machines/{id}/queue/{uid}{ n, at }          ← 줄 선 사람 (at 순서)
//   machines/{id}/live       하는 사람이 보내는 화면 상태 (구경용)
//   pads/{code}              PC ↔ 폰 조종기 (QR)
import { firebaseConfig } from './firebase-config.js';

export const ROOM = 'xmas';
const ROOT = `arcade/${ROOM}`;
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const params = new URLSearchParams(location.search);
const cfg = firebaseConfig || {};
const configured = !!cfg.databaseURL && !/YOUR_/.test(`${cfg.apiKey}${cfg.databaseURL}`);
export const mode = params.has('local') || !configured ? 'local' : 'firebase';
export const STALE_MS = 15000;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode(len = 6) {
  let s = '';
  for (const b of crypto.getRandomValues(new Uint8Array(len))) s += ALPHABET[b % ALPHABET.length];
  return s;
}
export const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

// ---------------------------------------------------------------- 저장소 (firebase / local 같은 모양)
async function firebaseStore() {
  const [{ initializeApp }, d, a] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-database.js`),
    import(`${SDK}/firebase-auth.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = a.getAuth(app);
  const cred = await a.signInAnonymously(auth);
  const db = d.getDatabase(app);
  let offset = 0;
  d.onValue(d.ref(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
  const r = (p) => d.ref(db, p);
  return {
    uid: cred.user.uid,
    now: () => Date.now() + offset,
    set: (p, v) => d.set(r(p), v),
    update: (p, v) => d.update(r(p), v),
    remove: (p) => d.remove(r(p)),
    get: async (p) => (await d.get(r(p))).val(),
    onValue(p, cb) { return d.onValue(r(p), (s) => cb(s.val())); },
    onChild(p, cb) {
      const offs = [
        d.onChildAdded(r(p), (s) => cb(s.key, s.val())),
        d.onChildChanged(r(p), (s) => cb(s.key, s.val())),
        d.onChildRemoved(r(p), (s) => cb(s.key, null)),
      ];
      return () => offs.forEach((f) => f());
    },
    async transaction(p, fn) {
      const res = await d.runTransaction(r(p), fn, { applyLocally: false });
      return { committed: res.committed, value: res.snapshot.val() };
    },
    onDisconnectRemove: (p) => d.onDisconnect(r(p)).remove(),
    cancelDisconnect: (p) => d.onDisconnect(r(p)).cancel(),
    onConnected(cb) { d.onValue(r('.info/connected'), (s) => cb(s.val() === true)); },
  };
}

async function localStore() {
  const ch = new BroadcastChannel('xmas-arcade-local');
  const uid = sessionStorage.getItem('xmas-local-uid') || `local-${makeCode(8)}`;
  sessionStorage.setItem('xmas-local-uid', uid);
  let tree = {};
  const listeners = new Set();
  const split = (p) => p.split('/').filter(Boolean);
  const get = (p) => split(p).reduce((o, k) => (o == null ? undefined : o[k]), tree) ?? null;
  const clone = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  function write(p, v) {
    const ks = split(p);
    if (v == null) {
      const parents = [tree];
      let o = tree;
      for (const k of ks.slice(0, -1)) { o = o?.[k]; parents.push(o); }
      if (o && typeof o === 'object') delete o[ks[ks.length - 1]];
      // 빈 부모 정리
      for (let i = ks.length - 2; i >= 0; i--) {
        const par = parents[i];
        const child = par?.[ks[i]];
        if (child && typeof child === 'object' && !Object.keys(child).length) delete par[ks[i]];
      }
    } else {
      let o = tree;
      for (const k of ks.slice(0, -1)) { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k]; }
      o[ks[ks.length - 1]] = clone(v);
    }
    notify(ks);
  }
  function notify(ks) {
    for (const l of listeners) {
      const lk = split(l.path);
      const n = Math.min(lk.length, ks.length);
      let match = true;
      for (let i = 0; i < n; i++) if (lk[i] !== ks[i]) { match = false; break; }
      if (!match) continue;
      if (l.type === 'value') l.cb(clone(get(l.path)));
      else if (ks.length > lk.length) {
        const key = ks[lk.length];
        l.cb(key, clone(get(`${l.path}/${key}`)));
      } else {
        // 부모가 통째로 바뀜: 모든 자식 다시 알림
        const cur = get(l.path) || {};
        for (const k of new Set([...Object.keys(cur), ...l.known])) l.cb(k, clone(cur[k] ?? null));
      }
      if (l.type === 'child') l.known = new Set(Object.keys(get(l.path) || {}));
    }
  }
  const disc = new Set();
  ch.onmessage = ({ data: m }) => {
    if (m.t === 'w') write(m.p, m.v);
    else if (m.t === 'hello') ch.postMessage({ t: 'snap', tree });
    else if (m.t === 'snap') {
      const merge = (dst, src, path) => {
        for (const [k, v] of Object.entries(src || {})) {
          const p = `${path}/${k}`;
          if (get(p) == null) write(p, v);
          else if (v && typeof v === 'object' && typeof dst?.[k] === 'object') merge(dst[k], v, p);
        }
      };
      merge(tree, m.tree, '');
    }
  };
  ch.postMessage({ t: 'hello' });
  await new Promise((r) => setTimeout(r, 350)); // 다른 탭이 보내 주는 현재 상태를 잠깐 기다림
  addEventListener('pagehide', () => { for (const p of disc) { write(p, null); ch.postMessage({ t: 'w', p, v: null }); } });
  const set = async (p, v) => { write(p, v); ch.postMessage({ t: 'w', p, v: clone(v) }); };
  return {
    uid,
    now: () => Date.now(),
    set,
    update: async (p, v) => { for (const [k, val] of Object.entries(v)) await set(`${p}/${k}`, val); },
    remove: (p) => set(p, null),
    get: async (p) => clone(get(p)),
    onValue(path, cb) { const l = { path, type: 'value', cb }; listeners.add(l); cb(clone(get(path))); return () => listeners.delete(l); },
    onChild(path, cb) {
      const l = { path, type: 'child', cb, known: new Set() };
      listeners.add(l);
      const cur = get(path) || {};
      for (const k of Object.keys(cur)) cb(k, clone(cur[k]));
      l.known = new Set(Object.keys(cur));
      return () => listeners.delete(l);
    },
    async transaction(p, fn) {
      const next = fn(clone(get(p)));
      if (next === undefined) return { committed: false, value: clone(get(p)) };
      await set(p, next);
      return { committed: true, value: clone(next) };
    },
    onDisconnectRemove: async (p) => { disc.add(p); },
    cancelDisconnect: async (p) => { disc.delete(p); },
    onConnected(cb) { cb(true); },
  };
}

// ---------------------------------------------------------------- 오락실 API
export async function connect() {
  const store = mode === 'firebase' ? await firebaseStore() : await localStore();
  const { uid } = store;
  const P = (p) => `${ROOT}/${p}`;
  let meLast = null;

  store.onConnected((on) => {
    if (!on) return;
    store.onDisconnectRemove(P(`players/${uid}`));
    if (meLast) store.set(P(`players/${uid}`), meLast); // 재접속하면 다시 등록
  });

  return {
    uid,
    mode,
    now: store.now,
    setMe(d) {
      meLast = { ...d, t: store.now() };
      return store.set(P(`players/${uid}`), meLast);
    },
    leave() { return store.remove(P(`players/${uid}`)); },
    onPlayer: (cb) => store.onChild(P('players'), cb),
    onMachines: (cb) => store.onValue(P('machines'), (v) => cb(v || {})),

    async claim(mid, n) {
      const now = store.now();
      const res = await store.transaction(P(`machines/${mid}/player`), (cur) => {
        if (!cur || cur.uid === uid || now - (cur.beat || 0) > STALE_MS) return { uid, n, beat: now };
        return undefined;
      });
      const ok = res.committed && res.value?.uid === uid;
      if (ok) {
        await store.onDisconnectRemove(P(`machines/${mid}/player`));
        await store.onDisconnectRemove(P(`machines/${mid}/live`));
      }
      return ok;
    },
    beat(mid) { return store.set(P(`machines/${mid}/player/beat`), store.now()); },
    async release(mid) {
      const cur = await store.get(P(`machines/${mid}/player`));
      if (cur?.uid === uid) {
        await store.remove(P(`machines/${mid}/live`));
        await store.remove(P(`machines/${mid}/player`));
      }
      store.cancelDisconnect(P(`machines/${mid}/player`));
      store.cancelDisconnect(P(`machines/${mid}/live`));
    },
    async queueJoin(mid, n) {
      await store.set(P(`machines/${mid}/queue/${uid}`), { n, at: store.now() });
      store.onDisconnectRemove(P(`machines/${mid}/queue/${uid}`));
    },
    async queueLeave(mid) {
      await store.remove(P(`machines/${mid}/queue/${uid}`));
      store.cancelDisconnect(P(`machines/${mid}/queue/${uid}`));
    },
    sendLive(mid, d) { return store.set(P(`machines/${mid}/live`), d); },

    // ---- 폰 조종기 (QR). PC 가 code 방을 열고, 폰은 입력만 보냄
    async hostPad(code, { onInput, onPad }) {
      const base = `pads/${code}`;
      await store.set(`${base}/owner`, uid);
      store.onDisconnectRemove(base);
      const offs = [
        store.onValue(`${base}/in`, (v) => v && onInput(v)),
        store.onValue(`${base}/pad`, (v) => onPad(!!v)),
      ];
      return {
        setUi: (ui) => store.set(`${base}/ui`, ui),
        close: () => { offs.forEach((f) => f()); store.remove(base); },
      };
    },
    async joinPad(code, { onUi, onHost }) {
      const base = `pads/${code}`;
      const owner = await store.get(`${base}/owner`);
      if (!owner) throw new Error('NOT_FOUND');
      await store.set(`${base}/pad`, { at: store.now() });
      store.onDisconnectRemove(`${base}/pad`);
      store.onValue(`${base}/ui`, (v) => v && onUi(v));
      store.onValue(`${base}/owner`, (v) => onHost(!!v));
      return { send: (v) => store.set(`${base}/in`, { ...v, t: store.now() }) };
    },
  };
}
