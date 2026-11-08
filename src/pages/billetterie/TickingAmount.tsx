import { AnimatePresence, motion } from "motion/react";
import { AMOUNT_TICK_TRANSITION } from "./motion-presets";

interface TickingAmountProps {
  value: string;
  className?: string;
}

// Screen readers get the sr-only copy; the animated copies are hidden so the
// one leaving is never announced.
export function TickingAmount({ value, className = "" }: TickingAmountProps) {
  return (
    <output aria-live="polite" className={className}>
      <span className="sr-only">{value}</span>
      <span
        aria-hidden="true"
        className="relative -my-[0.15em] block overflow-hidden"
      >
        <AnimatePresence mode="popLayout" initial={false} anchorX="right">
          <motion.span
            key={value}
            className="block py-[0.15em]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={AMOUNT_TICK_TRANSITION}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    </output>
  );
}
