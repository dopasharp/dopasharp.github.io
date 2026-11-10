// 카메라 + 눈 깜빡임 인식 (MediaPipe Face Landmarker, 전부 폰 안에서 처리).
// 영상은 어디로도 보내지 않아요. 밖으로 나가는 건 눈 뜬 정도 같은 숫자 몇 개뿐(1:1 모드).
// ?test 를 붙이면 카메라 없이 스페이스바(또는 화면의 버튼을 꾹)로 눈을 감는 테스트 모드.
const VER = '0.10.14';
const BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export const testMode = new URLSearchParams(location.search).has('test');

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export class EyeTracker {
  constructor(video) {
    this.video = video;
    this.state = { face: false, l: 0, r: 0, blink: 0, jaw: 0, brow: 0, roll: 0, closed: false };
    this.open = 0.08;          // 보정 전 기본값: 눈 뜬 상태의 깜빡임 점수
    this.shut = 0.75;          // 눈 감은 상태의 점수
    this.threshold = 0.45;
    this.calibrated = false;
    this.listeners = new Set();
    this.overFrames = 0;
    this.lastFaceAt = 0;
    this.heldKey = false;
  }

  /** 카메라 켜기 + 모델 불러오기. 실패하면 사람이 읽을 이유를 담은 Error */
  async start(onStep = () => {}) {
    if (testMode) {
      const set = (v) => { this.heldKey = v; };
      addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); set(true); } });
      addEventListener('keyup', (e) => { if (e.code === 'Space') set(false); });
      this.calibrated = true;
      this.loop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저는 카메라를 쓸 수 없어요. 사파리나 크롬으로 열어 주세요.');
    onStep('카메라 켜는 중…');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) {
      if (e && e.name === 'NotAllowedError') throw new Error('카메라 권한이 막혀 있어요. 주소창의 🔒(또는 aA) → 카메라 허용 후 새로고침해 주세요.');
      throw new Error('카메라를 켜지 못했어요. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요.');
    }
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.setAttribute('playsinline', '');
    await this.video.play().catch(() => {});
    onStep('눈 인식 준비 중… (처음 한 번만 조금 걸려요)');
    try {
      const { FilesetResolver, FaceLandmarker } = await import(`${BASE}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
      });
      try { this.lm = await FaceLandmarker.createFromOptions(files, opts('GPU')); }
      catch { this.lm = await FaceLandmarker.createFromOptions(files, opts('CPU')); }
    } catch (e) {
      console.error('[stare] model', e);
      throw new Error('눈 인식 기능을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.');
    }
    this.loop();
  }

  loop() {
    let lastVideoTime = -1;
    const tick = () => {
      requestAnimationFrame(tick);
      const now = performance.now();
      if (testMode) { this.fake(now); return; }
      const v = this.video;
      if (!this.lm || v.readyState < 2 || v.currentTime === lastVideoTime) return;
      lastVideoTime = v.currentTime;
      let res;
      try { res = this.lm.detectForVideo(v, now); } catch (e) { return; }
      const shapes = res.faceBlendshapes && res.faceBlendshapes[0];
      if (!shapes) { this.update({ face: now - this.lastFaceAt < 250 && this.state.face }, now); return; }
      this.lastFaceAt = now;
      const s = {};
      for (const c of shapes.categories) s[c.categoryName] = c.score;
      const pts = res.faceLandmarks[0];
      const a = pts[33], b = pts[263];
      // 셀카 화면은 거울처럼 보이니까 기울기도 거울 방향으로
      const roll = -Math.atan2(b.y - a.y, b.x - a.x);
      this.update({
        face: true,
        // 사용자의 왼눈은 거울 화면에서 오른쪽에 보여요
        l: s.eyeBlinkRight || 0, r: s.eyeBlinkLeft || 0,
        jaw: s.jawOpen || 0,
        brow: Math.max(s.browInnerUp || 0, ((s.browOuterUpLeft || 0) + (s.browOuterUpRight || 0)) / 2),
        roll,
      }, now);
    };
    requestAnimationFrame(tick);
  }

  fake(now) {
    const target = this.heldKey ? 0.95 : 0.05 + Math.sin(now / 900) * 0.02;
    const k = this.heldKey ? 0.6 : 0.4;
    const l = this.state.l + (target - this.state.l) * k;
    this.update({ face: true, l, r: l, jaw: (Math.sin(now / 1300) + 1) * 0.05, brow: 0.1, roll: Math.sin(now / 2100) * 0.08 }, now);
  }

  update(p, now) {
    const st = this.state;
    Object.assign(st, p);
    st.blink = (st.l + st.r) / 2;
    // 순간적인 튐은 무시: 2프레임 연속으로 기준을 넘으면 "감음"
    if (st.face && st.blink > this.threshold) this.overFrames++; else this.overFrames = 0;
    st.closed = this.overFrames >= 2;
    // 아바타용 눈 뜬 정도 (0 = 감음, 1 = 뜸), 보정 값 기준으로 펼침
    const span = Math.max(0.1, this.shut - this.open);
    st.openL = 1 - clamp((st.l - this.open) / span);
    st.openR = 1 - clamp((st.r - this.open) / span);
    st.t = now;
    this.listeners.forEach((f) => f(st));
  }

  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); }

  /** 몇 초 동안 깜빡임 점수 평균 (보정용) */
  sample(ms, skip = 250) {
    return new Promise((resolve) => {
      const vals = []; const t0 = performance.now(); let faceless = 0;
      const off = this.on((st) => {
        const dt = st.t - t0;
        if (dt < skip) return;
        if (st.face) vals.push(st.blink); else faceless++;
        if (dt >= ms) {
          off();
          vals.sort((a, b) => a - b);
          resolve(vals.length >= 4 ? { ok: true, v: vals[Math.floor(vals.length / 2)] } : { ok: false, faceless });
        }
      });
    });
  }

  /** 보정: 눈 뜨기 → 감기. say(단계, 남은 비율) 로 화면 안내 */
  async calibrate(say) {
    if (testMode) { this.calibrated = true; return { ok: true }; }
    say('open');
    const a = await this.sample(1500);
    if (!a.ok) return { ok: false, why: 'face' };
    say('shut');
    const b = await this.sample(1500, 450);
    if (!b.ok) return { ok: false, why: 'face' };
    if (b.v - a.v < 0.18) return { ok: false, why: 'weak' };
    this.open = a.v; this.shut = b.v;
    this.threshold = a.v + (b.v - a.v) * 0.5;
    this.calibrated = true;
    say('done');
    return { ok: true };
  }

  /** 지금 화면을 거울처럼 찍은 사진 (패배 순간용). 폰 안에서만 써요 */
  snapshot(w = 360) {
    const v = this.video;
    if (testMode || !v.videoWidth) return null;
    const h = Math.round(w * v.videoHeight / v.videoWidth);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.translate(w, 0); g.scale(-1, 1);
    g.drawImage(v, 0, 0, w, h);
    return c;
  }
}
