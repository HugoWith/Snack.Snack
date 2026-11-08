import { AnimatePresence, motion } from "motion/react";
import { AMOUNT_TICK_TRANSITION } from "./motion-presets";

interface AmountTickerProps {
  value: string;
}

// Hidden from screen readers so the copy leaving is never read: callers
// expose the value themselves.
export function AmountTicker({ value }: AmountTickerProps) {
  return (
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
  );
}
