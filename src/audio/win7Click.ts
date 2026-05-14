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

/** Short Win7-style navigation / UI click (synthesized, not a system asset). */
export function playWin7NavigationClick(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = getContext();
  if (!ctx) {
    return;
  }

  void ctx.resume();

  const t0 = ctx.currentTime;
  const dur = 0.065;

  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(1, t0 + 0.002);
  master.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  const toneMix = ctx.createGain();
  toneMix.gain.value = 0.11;
  toneMix.connect(master);

  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  a.type = "triangle";
  b.type = "sine";
  a.frequency.setValueAtTime(1320, t0);
  a.frequency.exponentialRampToValueAtTime(580, t0 + dur * 0.92);
  b.frequency.setValueAtTime(2640, t0);
  b.frequency.exponentialRampToValueAtTime(920, t0 + dur * 0.62);
  a.connect(toneMix);
  b.connect(toneMix);

  const nSamples = Math.max(1, Math.ceil(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, nSamples, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < nSamples; i++) {
    const fade = Math.pow(1 - i / nSamples, 2.4);
    ch[i] = (Math.random() * 2 - 1) * fade;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3100;
  bp.Q.value = 0.72;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.062;
  noise.connect(bp);
  bp.connect(nGain);
  nGain.connect(master);

  a.start(t0);
  b.start(t0);
  noise.start(t0);
  a.stop(t0 + dur + 0.015);
  b.stop(t0 + dur + 0.015);
  noise.stop(t0 + dur);
}
