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

/** “Send mail” flourish: soft swoosh + bright double-ding (synthesized). */
export function playMailSendSound(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = getContext();
  if (!ctx) {
    return;
  }

  void ctx.resume();

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(0.48, t0 + 0.02);
  master.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);

  const whooshLen = Math.ceil(ctx.sampleRate * 0.22);
  const whooshBuf = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
  const whooshData = whooshBuf.getChannelData(0);
  for (let i = 0; i < whooshLen; i++) {
    const env = Math.sin((i / whooshLen) * Math.PI);
    whooshData[i] = (Math.random() * 2 - 1) * env * 0.55;
  }
  const whoosh = ctx.createBufferSource();
  whoosh.buffer = whooshBuf;
  const whooshBp = ctx.createBiquadFilter();
  whooshBp.type = "bandpass";
  whooshBp.frequency.setValueAtTime(900, t0);
  whooshBp.frequency.exponentialRampToValueAtTime(4200, t0 + 0.16);
  whooshBp.Q.value = 0.65;
  const whooshG = ctx.createGain();
  whooshG.gain.value = 0.085;
  whoosh.connect(whooshBp);
  whooshBp.connect(whooshG);
  whooshG.connect(master);
  whoosh.start(t0);
  whoosh.stop(t0 + 0.2);

  const ding1 = ctx.createOscillator();
  ding1.type = "sine";
  const g1 = ctx.createGain();
  ding1.frequency.setValueAtTime(660, t0 + 0.04);
  ding1.frequency.exponentialRampToValueAtTime(880, t0 + 0.11);
  g1.gain.setValueAtTime(0, t0 + 0.04);
  g1.gain.linearRampToValueAtTime(0.11, t0 + 0.055);
  g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
  ding1.connect(g1);
  g1.connect(master);
  ding1.start(t0 + 0.04);
  ding1.stop(t0 + 0.3);

  const ding2 = ctx.createOscillator();
  ding2.type = "triangle";
  const g2 = ctx.createGain();
  ding2.frequency.setValueAtTime(1320, t0 + 0.09);
  ding2.frequency.exponentialRampToValueAtTime(990, t0 + 0.2);
  g2.gain.setValueAtTime(0, t0 + 0.09);
  g2.gain.linearRampToValueAtTime(0.055, t0 + 0.12);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
  ding2.connect(g2);
  g2.connect(master);
  ding2.start(t0 + 0.09);
  ding2.stop(t0 + 0.36);
}
