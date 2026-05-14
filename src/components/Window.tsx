import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";

type WindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
};

const RETRO_DRAG_MIN_WIDTH_PX = 860;

/** No drag on touch / coarse pointers, and no drag when layout is stacked (narrow) —
 * avoids fighting vertical page scrolling. */
function usePointerFineDrag(): boolean {
  const compute = (): boolean => {
    if (typeof window === "undefined") {
      return false;
    }
    if (window.innerWidth <= RETRO_DRAG_MIN_WIDTH_PX) {
      return false;
    }
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  };

  const [enabled, setEnabled] = useState<boolean>(() => compute());

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = (): void => {
      setEnabled(compute());
    };
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return (): void => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return enabled;
}

function Window({ title, children, className = "", defaultPosition = { x: 0, y: 0 } }: WindowProps) {
  const dragEnabled = usePointerFineDrag();

  return (
    <motion.section
      className={`retro-window${dragEnabled ? "" : " retro-window--touch"} ${className}`.trim()}
      drag={dragEnabled}
      dragMomentum={false}
      initial={{ opacity: 0, x: defaultPosition.x, y: defaultPosition.y, scale: 0.96 }}
      animate={{ opacity: 1, x: defaultPosition.x, y: defaultPosition.y, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
    >
      <div className="window-titlebar">
        <span>{title}</span>
        <div className="window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="window-body">{children}</div>
    </motion.section>
  );
}

export default Window;
