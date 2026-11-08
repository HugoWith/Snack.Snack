import { motion } from "motion/react";
import {
  PRESS_HOVER_LIFT,
  PRESS_SHADOW_OFFSET,
  PRESS_TRANSITION,
} from "./motion-presets";

interface PayButtonProps {
  isSubmitting: boolean;
}

// The hard shadow is a plate behind the button: hovering lifts the button off
// it, pressing lands the button on it, so only transforms animate.
export function PayButton({ isSubmitting }: PayButtonProps) {
  return (
    <div className="relative flex">
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-1.5 bg-sauce"
      />
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={isSubmitting ? undefined : HOVER}
        whileTap={isSubmitting ? undefined : TAP}
        transition={PRESS_TRANSITION}
        className="relative min-h-[60px] flex-1 cursor-pointer bg-ink font-display text-[22px] tracking-[-0.035em] text-mustard uppercase transition-colors hover:bg-steel-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:bg-steel-800 disabled:cursor-wait disabled:bg-ink"
      >
        {isSubmitting ? "Paiement…" : "Payer"}
      </motion.button>
    </div>
  );
}

const HOVER = { x: -PRESS_HOVER_LIFT, y: -PRESS_HOVER_LIFT };
const TAP = { x: PRESS_SHADOW_OFFSET, y: PRESS_SHADOW_OFFSET };
