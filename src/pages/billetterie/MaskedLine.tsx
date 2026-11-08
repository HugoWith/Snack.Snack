import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HERO_LINE_STAGGER, HERO_LINE_TRANSITION } from "./motion-presets";

interface MaskedLineProps {
  index: number;
  isReady: boolean;
  children: ReactNode;
}

// The inner padding widens the mask past the tight line box so accents and
// descenders are not clipped; the negative margin gives that space back.
export function MaskedLine({ index, isReady, children }: MaskedLineProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span className="-my-[0.2em] block overflow-hidden">
      <motion.span
        className="block py-[0.2em]"
        initial={shouldReduceMotion ? false : { y: "100%" }}
        animate={{ y: shouldReduceMotion || isReady ? 0 : "100%" }}
        transition={{
          ...HERO_LINE_TRANSITION,
          delay: index * HERO_LINE_STAGGER,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
