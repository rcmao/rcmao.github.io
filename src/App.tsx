import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import BootSequence from "./components/BootSequence";
import DeskMusicPanel from "./components/DeskMusicPanel";
import DesktopScene from "./components/DesktopScene";
import Preloader from "./components/Preloader";
import StartScreen from "./components/StartScreen";
import { DESK_PLAYLIST } from "./data/deskPlaylist";
import { deskNotes, publications, type Publication } from "./data/site";

type Stage = "start" | "preload" | "boot" | "desktop" | "retro";

const RetroDesktop = lazy(() => import("./components/RetroDesktop"));

function App() {
  const [stage, setStage] = useState<Stage>("start");
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [deskMusicPlaying, setDeskMusicPlaying] = useState(false);
  const deskAudioRef = useRef<HTMLAudioElement | null>(null);

  const firstPublication = publications[0];
  const randomDeskNote = useMemo(
    () => deskNotes[Math.floor(Math.random() * deskNotes.length)],
    [],
  );

  useEffect(() => {
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (shouldReduceMotion) {
      setStage("start");
    }
  }, []);

  useEffect(() => {
    const el = deskAudioRef.current;
    if (!el) {
      return;
    }

    const sync = () => setDeskMusicPlaying(!el.paused);

    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    el.addEventListener("ended", sync);
    sync();

    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
      el.removeEventListener("ended", sync);
    };
  }, []);

  const toggleDeskMusic = useCallback(async () => {
    const el = deskAudioRef.current;
    if (!el) {
      return;
    }
    const track = DESK_PLAYLIST[0];
    if (!track) {
      return;
    }
    const expectedHref = new URL(track.src, window.location.href).href;
    if (!el.src || el.src !== expectedHref) {
      el.src = track.src;
      el.load();
    }
    if (el.paused) {
      try {
        await el.play();
      } catch {
        setDeskMusicPlaying(false);
      }
    } else {
      el.pause();
    }
  }, []);

  const showPublication = useCallback((publication: Publication) => {
    setModal({
      title: publication.title,
      body: `${publication.venue}\n\n${publication.abstract}`,
    });
  }, []);

  return (
    <main className="app-shell">
      <div className="dream-sky" aria-hidden="true" />
      <audio
        ref={deskAudioRef}
        className="visually-hidden-desk-audio"
        src={DESK_PLAYLIST[0]?.src}
        preload="metadata"
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        {stage === "start" && <StartScreen key="start" onStart={() => setStage("boot")} />}
        {stage === "preload" && <Preloader key="preload" onComplete={() => setStage("boot")} />}
        {stage === "boot" && (
          <BootSequence
            key="boot"
            onComplete={() => setStage("desktop")}
            onSkip={() => setStage("desktop")}
          />
        )}
        {stage === "desktop" && (
          <section
            key="desktop"
            className="stage stage-desktop"
          >
            <DesktopScene
              onEnterRetro={() => setStage("retro")}
              onOpenMusicPlayer={() => setMusicPanelOpen(true)}
              onOpenBook={() => showPublication(firstPublication)}
              onShowNote={() => setModal({ title: "QQ Pet Memo", body: randomDeskNote })}
            />
          </section>
        )}
        {stage === "retro" && (
          <motion.section
            key="retro"
            className="stage stage-retro"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
          >
            <Suspense fallback={<Preloader onComplete={() => undefined} />}>
              <RetroDesktop
                onBackToDesk={() => setStage("desktop")}
                onShowPublication={showPublication}
                deskMusicPlaying={deskMusicPlaying}
                onToggleDeskMusic={toggleDeskMusic}
              />
            </Suspense>
          </motion.section>
        )}
      </AnimatePresence>

      <DeskMusicPanel open={musicPanelOpen} onClose={() => setMusicPanelOpen(false)} audioRef={deskAudioRef} />

      <AnimatePresence>
        {modal && (
          <motion.div
            className="modal-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
          >
            <motion.article
              className="retro-modal"
              role="dialog"
              aria-modal="true"
              aria-label={modal.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="window-titlebar">
                <span>{modal.title}</span>
                <button type="button" onClick={() => setModal(null)} aria-label="Close dialog">
                  x
                </button>
              </div>
              <p>{modal.body}</p>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
