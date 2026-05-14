import { motion } from "framer-motion";
import { useEffect } from "react";

type BootSequenceProps = {
  onComplete: () => void;
  onSkip: () => void;
};

function BootSequence({ onComplete, onSkip }: BootSequenceProps) {
  useEffect(() => {
    const finishTimer = window.setTimeout(onComplete, 1000);

    return () => {
      window.clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <motion.section
      className="boot-screen win7-boot"
      initial={{ opacity: 0, filter: "brightness(0)" }}
      animate={{ opacity: 1, filter: "brightness(1)" }}
      exit={{ opacity: 0, filter: "brightness(1.8)" }}
      transition={{ duration: 0.16 }}
    >
      <button className="skip-button" type="button" onClick={onSkip}>
        Skip
      </button>
      <motion.div
        className="win7-boot-logo"
        initial={{ opacity: 0, scale: 0.86, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.34 }}
      >
        <div className="win7-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <p>Starting Windows</p>
        <div className="win7-boot-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </motion.div>
    </motion.section>
  );
}

export default BootSequence;
