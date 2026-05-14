import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { DESK_PLAYLIST, type DeskTrack } from "../data/deskPlaylist";

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "—:—";
  }
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type DeskMusicPanelProps = {
  open: boolean;
  onClose: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
};

function DeskMusicPanel({ open, onClose, audioRef }: DeskMusicPanelProps) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const n = DESK_PLAYLIST.length;
  const safeFocus = ((focusIndex % n) + n) % n;
  const current = DESK_PLAYLIST[safeFocus]!;

  const syncPlayingState = useCallback(() => {
    const el = audioRef.current;
    setPlaying(el ? !el.paused : false);
  }, [audioRef]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) {
      return;
    }

    const onMeta = () => setDurationSec(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    if (el.readyState >= 1) {
      onMeta();
    }

    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioRef]);

  const togglePlay = async (index?: number) => {
    const el = audioRef.current;
    if (!el) {
      return;
    }

    const idx = index !== undefined ? index : safeFocus;
    const track = DESK_PLAYLIST[idx];
    if (!track) {
      return;
    }

    if (idx !== safeFocus) {
      setFocusIndex(idx);
    }

    const targetHref = new URL(track.src, window.location.href).href;
    const srcChanged = el.src !== targetHref;

    if (srcChanged) {
      el.src = track.src;
      el.load();
      try {
        await el.play();
      } catch {
        setPlaying(false);
      }
      return;
    }

    if (el.paused) {
      try {
        await el.play();
      } catch {
        setPlaying(false);
      }
    } else {
      el.pause();
    }
    syncPlayingState();
  };

  const coverForOffset = (offset: -1 | 0 | 1): DeskTrack => {
    const idx = (safeFocus + offset + n) % n;
    return DESK_PLAYLIST[idx]!;
  };

  const coverCardClass = (offset: -1 | 0 | 1) => {
    if (offset === 0) {
      return "desk-music-cover-card is-center";
    }
    if (offset === -1) {
      return "desk-music-cover-card is-side-left";
    }
    return "desk-music-cover-card is-side-right";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="desk-music-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="desk-music-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Playlist"
            initial={{ y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="desk-music-panel-header">
              <div className="desk-music-panel-titleblock">
                <h2 className="desk-music-album-title">{current.title}</h2>
                <p className="desk-music-album-artist">{current.artist}</p>
              </div>
              <button type="button" className="desk-music-close" onClick={onClose} aria-label="Close player">
                ×
              </button>
            </header>

            <div className="desk-music-panel-body">
              <div className="desk-music-carousel" aria-hidden="true">
                {([-1, 0, 1] as const).map((offset) => {
                  const track = coverForOffset(offset);
                  return (
                    <div key={offset} className={coverCardClass(offset)}>
                      <img src={track.coverSrc} alt="" width={220} height={220} draggable={false} />
                    </div>
                  );
                })}
              </div>

              <div className="desk-music-now-nav">
                <button
                  type="button"
                  className="desk-music-arrow"
                  aria-label="Previous track"
                  onClick={() => setFocusIndex((i) => (i - 1 + n) % n)}
                >
                  ‹
                </button>
                <div className="desk-music-now-text">
                  <span className="desk-music-track-title">{current.title}</span>
                  <span className="desk-music-track-meta">{current.artist}</span>
                </div>
                <button
                  type="button"
                  className="desk-music-arrow"
                  aria-label="Next track"
                  onClick={() => setFocusIndex((i) => (i + 1) % n)}
                >
                  ›
                </button>
              </div>

              <ul className="desk-music-tracklist">
                {DESK_PLAYLIST.map((track, index) => {
                  const isActiveRow = index === safeFocus;
                  const isPlayingThis = isActiveRow && playing;
                  const displayDur =
                    isActiveRow && durationSec > 0 ? formatTime(durationSec) : "—:—";

                  return (
                    <li key={track.id}>
                      <button
                        type="button"
                        className={`desk-music-row ${isActiveRow ? "is-active" : ""}`}
                        onClick={() => void togglePlay(index)}
                      >
                        <span className="desk-music-row-play" aria-hidden="true">
                          {isPlayingThis ? "⏸" : "▶"}
                        </span>
                        <span className="desk-music-row-info">
                          <span className="desk-music-row-title">{track.title}</span>
                          <span className="desk-music-row-artist">{track.artist}</span>
                        </span>
                        <span className="desk-music-row-dur">{displayDur}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DeskMusicPanel;
