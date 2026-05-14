import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";

type WindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
};

/** Draggable windows steal touch scrolling on phones; reserve drag for hover + precise pointer desktops. */
function usePointerFineDrag(): boolean {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = (): void => {
      setEnabled(mq.matches);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return (): void => {
      mq.removeEventListener("change", onChange);
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
