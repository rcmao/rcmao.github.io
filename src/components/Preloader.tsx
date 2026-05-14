import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type PreloaderProps = {
  onComplete: () => void;
};

function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((value) => {
        const next = Math.min(value + 7 + Math.round(Math.random() * 9), 100);
        if (next >= 100) {
          window.clearInterval(id);
          window.setTimeout(onComplete, 280);
        }
        return next;
      });
    }, 95);

    return () => window.clearInterval(id);
  }, [onComplete]);

  return (
    <motion.section
      className="preloader crt-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pixel-spinner" aria-hidden="true" />
      <p>Loading academic artifacts...</p>
      <div className="progress-track" aria-label={`Loading ${progress}%`}>
        <motion.div className="progress-fill" animate={{ width: `${progress}%` }} />
      </div>
      <span>{progress}%</span>
    </motion.section>
  );
}

export default Preloader;
