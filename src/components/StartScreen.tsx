import { motion } from "framer-motion";
import { publicAssetUrl } from "../lib/publicAssetUrl";
type StartScreenProps = {
  onStart: () => void;
};

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function playWin7StartupSound() {
  const AudioContextCtor = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const masterGain = context.createGain();
  const now = context.currentTime;

  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.11, now + 0.08);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);
  masterGain.connect(context.destination);

  const notes = [
    { frequency: 587.33, delay: 0, duration: 1.25 },
    { frequency: 739.99, delay: 0.08, duration: 1.32 },
    { frequency: 880, delay: 0.26, duration: 1.22 },
    { frequency: 1174.66, delay: 0.42, duration: 1.08 },
  ];

  notes.forEach(({ frequency, delay, duration }) => {
    const start = now + delay;
    const stop = start + duration;
    const oscillator = context.createOscillator();
    const shimmer = context.createOscillator();
    const noteGain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(frequency * 2.01, start);

    noteGain.gain.setValueAtTime(0.0001, start);
    noteGain.gain.exponentialRampToValueAtTime(0.22, start + 0.06);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, stop);

    oscillator.connect(noteGain);
    shimmer.connect(noteGain);
    noteGain.connect(masterGain);

    oscillator.start(start);
    shimmer.start(start);
    oscillator.stop(stop + 0.03);
    shimmer.stop(stop + 0.03);
  });

  window.setTimeout(() => {
    void context.close();
  }, 2200);
}

function StartScreen({ onStart }: StartScreenProps) {
  const handleStart = () => {
    playWin7StartupSound();
    onStart();
  };

  return (
    <motion.section
      className="start-screen crt-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "brightness(1.8)" }}
      transition={{ duration: 0.3 }}
    >
      <div className="win7-login-window">
        <div className="win7-titlebar">
          <span>Ruochen's Virtual Lab</span>
          <div className="win7-window-buttons" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="win7-landscape" aria-hidden="true">
          <span className="cloud cloud-one" />
          <span className="cloud cloud-two" />
          <span className="cloud cloud-three" />
          <span className="tiny-house" />
        </div>
        <div className="win7-login-card">
          <img src={publicAssetUrl("/start-avatar.png")} alt="" />
          <p className="start-copy">Welcome to Ruochen's Virtual Lab</p>
          <div className="win7-password-row">
            <button type="button" className="win7-start-field" onClick={handleStart}>
              Start
            </button>
            <button type="button" className="start-button" onClick={handleStart} aria-label="Start">
              →
            </button>
          </div>
        </div>
        <div className="win7-logo" aria-hidden="true">
          <span />
          <strong>Windows 7</strong>
        </div>
      </div>
    </motion.section>
  );
}

export default StartScreen;
