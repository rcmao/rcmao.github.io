import { motion } from "framer-motion";
import type { ReactNode } from "react";

type WindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
};

function Window({ title, children, className = "", defaultPosition = { x: 0, y: 0 } }: WindowProps) {
  return (
    <motion.section
      className={`retro-window ${className}`}
      drag
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
