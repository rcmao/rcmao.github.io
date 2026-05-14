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

/** Short cartoon-ish woof (synthesized, no sample file). */
export function playDogBarkSound(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = getContext();
  if (!ctx) {
    return;
  }

  void ctx.resume();
  const t0 = ctx.currentTime;

  const body = ctx.createOscillator();
  body.type = "sawtooth";
  body.frequency.setValueAtTime(210, t0);
  body.frequency.exponentialRampToValueAtTime(95, t0 + 0.11);

  const bodyLp = ctx.createBiquadFilter();
  bodyLp.type = "lowpass";
  bodyLp.frequency.setValueAtTime(1400, t0);
  bodyLp.frequency.exponentialRampToValueAtTime(420, t0 + 0.09);

  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0, t0);
  bodyGain.gain.linearRampToValueAtTime(0.09, t0 + 0.012);
  bodyGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.14);

  body.connect(bodyLp);
  bodyLp.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(t0);
  body.stop(t0 + 0.16);

  const nSamples = Math.ceil(ctx.sampleRate * 0.07);
  const noiseBuf = ctx.createBuffer(1, nSamples, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nSamples; i++) {
    const env = Math.pow(1 - i / nSamples, 0.35);
    nd[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 520;
  bp.Q.value = 0.85;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0, t0);
  nGain.gain.linearRampToValueAtTime(0.055, t0 + 0.004);
  nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.065);

  noise.connect(bp);
  bp.connect(nGain);
  nGain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.08);
}
