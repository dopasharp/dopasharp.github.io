// 1:1 눈싸움 연동 레이어.
// - firebase: Realtime Database + 익명 로그인 (서로 다른 폰끼리)
// - local:    localStorage + BroadcastChannel (같은 브라우저의 탭끼리, Firebase 설정 전 테스트용)
// 주고받는 건 숫자뿐이에요: 눈 뜬 정도·입·눈썹·고개 기울기, 깜빡인 시각. 영상·사진은 보내지 않아요.
import { firebaseConfig } from './firebase-config.js';

const ROOT = 'stareDown';
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const STALE = 2 * 60 * 60 * 1000; // 2시간 지난 방 코드는 다시 쓸 수 있어요
const params = new URLSearchParams(location.search);
const cfg = firebaseConfig || {};
const configured = !!cfg.databaseURL && !/YOUR_/.test(`${cfg.apiKey}${cfg.databaseURL}`);
export const mode = params.has('local') || !configured ? 'local' : 'firebase';

const newCode = () => String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
export const validCode = (c) => /^\d{4}$/.test(String(c || ''));

export async function connect() {
  return mode === 'local' ? localApi() : firebaseApi();
}

/** 연결 오류를 사람이 고칠 수 있는 문장으로 */
export function explainError(e) {
  const code = String((e && (e.code || e.message)) || e || '');
  if (/operation-not-allowed|admin-restricted/i.test(code)) return '익명 로그인이 꺼져 있어요 (Firebase 콘솔 › Authentication › 익명 사용 설정)';
  if (/configuration-not-found/i.test(code)) return 'Firebase Authentication이 시작되지 않았어요';
  if (/unauthorized-domain|referer/i.test(code)) return '이 사이트 주소가 Firebase에 허용되지 않았어요';
  if (/permission[_ -]denied/i.test(code)) return 'DB 규칙이 막고 있어요 (database.rules.json을 게시해 주세요)';
  if (/network|Failed to fetch|dynamically imported/i.test(code)) return '서버에 연결하지 못했어요. 인터넷을 확인하고 새로고침해 주세요.';
  return '연결 오류: ' + code.slice(0, 100);
}

async function firebaseApi() {
  const [{ initializeApp }, d, a] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-database.js`),
    import(`${SDK}/firebase-auth.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const uid = (await a.signInAnonymously(a.getAuth(app))).user.uid;
  const db = d.getDatabase(app);
  const ref = (p) => d.ref(db, `${ROOT}/${p}`);
  let offset = 0;
  d.onValue(d.ref(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
  let code = null;
  const offs = [];

  return {
    mode, uid,
    now: () => Date.now() + offset,
    async createRoom() {
      for (let i = 0; i < 8; i++) {
        const c = newCode();
        const s = await d.get(ref(`rooms/${c}/at`));
        if (s.exists() && Date.now() + offset - s.val() < STALE) continue;
        await d.set(ref(`rooms/${c}`), { at: d.serverTimestamp() });
        return c;
      }
      throw new Error('방을 만들지 못했어요. 잠시 후 다시 해 주세요.');
    },
    async joinRoom(c, me) {
      const s = await d.get(ref(`rooms/${c}`));
      const room = s.val();
      if (!room || Date.now() + offset - room.at > STALE) return { ok: false, why: 'none' };
      const others = Object.keys(room.players || {}).filter((u) => u !== uid);
      if (others.length >= 2) return { ok: false, why: 'full' };
      code = c;
      const p = ref(`rooms/${c}/players/${uid}`);
      await d.onDisconnect(p).remove();
      await d.onDisconnect(ref(`faces/${c}/${uid}`)).remove();
      await d.set(p, { skin: me.skin, ready: 0, at: d.serverTimestamp() });
      return { ok: true };
    },
    watchRoom(cb) {
      const r = ref(`rooms/${code}`);
      const f = d.onValue(r, (s) => cb(s.val() || {}));
      offs.push(f);
    },
    watchFaces(cb) {
      const r = ref(`faces/${code}`);
      const put = (s) => { if (s.key !== uid) cb(s.key, s.val()); };
      offs.push(d.onChildAdded(r, put), d.onChildChanged(r, put));
    },
    sendFace(f) { if (code) d.set(ref(`faces/${code}/${uid}`), f).catch(() => {}); },
    setPlayer(patch) { return d.update(ref(`rooms/${code}/players/${uid}`), patch); },
    setStart(round, at) { return d.set(ref(`rooms/${code}/start/${round}`), at).catch(() => {}); /* 상대가 먼저 썼으면 무시 */ },
    setOut(round, o) { return d.set(ref(`rooms/${code}/outs/${round}/${uid}`), o).catch(() => {}); },
    leave() {
      offs.splice(0).forEach((f) => f());
      if (!code) return;
      d.remove(ref(`rooms/${code}/players/${uid}`)).catch(() => {});
      d.remove(ref(`faces/${code}/${uid}`)).catch(() => {});
      code = null;
    },
  };
}

// ---------------------------------------------------------------- local mode
function localApi() {
  const KEY = 'stare:local';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { rooms: {} }; } catch { return { rooms: {} }; } };
  const save = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch {} };
  let uid = sessionStorage.getItem('stare:uid');
  if (!uid) { uid = 'L' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('stare:uid', uid); }
  const ch = new BroadcastChannel('stare');
  let code = null;
  let roomCb = null, faceCb = null;
  const emitRoom = () => { if (roomCb && code) roomCb(load().rooms[code] || {}); };
  ch.onmessage = ({ data: m }) => {
    if (m.code !== code) return;
    if (m.type === 'room') emitRoom();
    else if (m.type === 'face' && m.uid !== uid && faceCb) faceCb(m.uid, m.f);
  };
  const edit = (fn) => { const x = load(); fn(x); save(x); ch.postMessage({ type: 'room', code }); setTimeout(emitRoom, 0); };
  const room = (x) => (x.rooms[code] ||= {});
  addEventListener('pagehide', () => { if (code) edit((x) => { delete (room(x).players || {})[uid]; }); });

  return {
    mode, uid,
    now: () => Date.now(),
    async createRoom() {
      const x = load();
      let c; do c = newCode(); while (x.rooms[c] && Date.now() - x.rooms[c].at < STALE);
      x.rooms[c] = { at: Date.now() }; save(x);
      return c;
    },
    async joinRoom(c, me) {
      const r = load().rooms[c];
      if (!r) return { ok: false, why: 'none' };
      const others = Object.keys(r.players || {}).filter((u) => u !== uid);
      if (others.length >= 2) return { ok: false, why: 'full' };
      code = c;
      edit((x) => { (room(x).players ||= {})[uid] = { skin: me.skin, ready: 0, at: Date.now() }; });
      return { ok: true };
    },
    watchRoom(cb) { roomCb = cb; emitRoom(); },
    watchFaces(cb) { faceCb = cb; },
    sendFace(f) { if (code) ch.postMessage({ type: 'face', code, uid, f }); },
    async setPlayer(patch) { edit((x) => { const p = ((room(x).players ||= {})[uid] ||= {}); Object.assign(p, patch); }); },
    async setStart(round, at) { edit((x) => { const s = (room(x).start ||= {}); if (s[round] == null) s[round] = at; }); },
    async setOut(round, o) { edit((x) => { const r = ((room(x).outs ||= {})[round] ||= {}); if (!r[uid]) r[uid] = o; }); },
    leave() {
      if (!code) return;
      edit((x) => { delete (room(x).players || {})[uid]; });
      roomCb = faceCb = null; code = null;
    },
  };
}
