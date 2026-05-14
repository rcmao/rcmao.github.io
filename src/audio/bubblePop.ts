type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new Ctor();
  }
  return sharedContext;
}

/** Gentle aquarium water + soft underwater bloops (synthesized). */
export function playAquariumBubbleSound(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = getContext();
  if (!ctx) {
    return;
  }

  void ctx.resume();

  const start = ctx.currentTime;

  const washSeconds = 0.48;
  const washLen = Math.ceil(ctx.sampleRate * washSeconds);
  const washBuf = ctx.createBuffer(1, washLen, ctx.sampleRate);
  const washData = washBuf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < washLen; i++) {
    const white = Math.random() * 2 - 1;
    brown = brown * 0.985 + white * 0.024;
    const window = Math.sin((i / washLen) * Math.PI);
    washData[i] = brown * window * 0.42;
  }

  const washSrc = ctx.createBufferSource();
  washSrc.buffer = washBuf;
  const washLp = ctx.createBiquadFilter();
  washLp.type = "lowpass";
  washLp.frequency.value = 1100;
  washLp.Q.value = 0.45;
  const washHp = ctx.createBiquadFilter();
  washHp.type = "highpass";
  washHp.frequency.value = 90;
  washHp.Q.value = 0.55;
  const washGain = ctx.createGain();
  washGain.gain.setValueAtTime(0, start);
  washGain.gain.linearRampToValueAtTime(0.14, start + 0.07);
  washGain.gain.exponentialRampToValueAtTime(0.0025, start + washSeconds);

  washSrc.connect(washHp);
  washHp.connect(washLp);
  washLp.connect(washGain);
  washGain.connect(ctx.destination);
  washSrc.start(start);
  washSrc.stop(start + washSeconds + 0.03);

  const bloopCount = 5;
  for (let k = 0; k < bloopCount; k++) {
    const t = start + 0.04 + k * 0.072 + Math.random() * 0.045;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f0 = 150 + Math.random() * 90;
    const f1 = 260 + Math.random() * 100;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.14);

    const bloopLp = ctx.createBiquadFilter();
    bloopLp.type = "lowpass";
    bloopLp.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.038 + Math.random() * 0.012, t + 0.028);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.24);

    osc.connect(bloopLp);
    bloopLp.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  const dripCount = 3;
  for (let d = 0; d < dripCount; d++) {
    const t = start + 0.12 + d * 0.11 + Math.random() * 0.05;
    const dur = 0.05 + Math.random() * 0.03;
    const n = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const env = Math.pow(1 - i / n, 1.1);
      ch[i] = (Math.random() * 2 - 1) * env * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700 + Math.random() * 400;
    const dg = ctx.createGain();
    dg.gain.setValueAtTime(0, t);
    dg.gain.linearRampToValueAtTime(0.055, t + 0.006);
    dg.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp);
    lp.connect(dg);
    dg.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
