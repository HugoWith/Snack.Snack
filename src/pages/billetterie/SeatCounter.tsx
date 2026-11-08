import { motion, stagger, useReducedMotion, type Variants } from "motion/react";
import { seatsLeftCopy } from "../../lib/format";
import { SEAT_STAGGER, SEAT_TRANSITION } from "./motion-presets";

interface SeatCounterProps {
  left: number;
  capacity: number;
}

export function SeatCounter({ left, capacity }: SeatCounterProps) {
  const shouldReduceMotion = useReducedMotion();
  const taken = capacity - left;
  const copy = seatsLeftCopy(left, capacity);

  return (
    <div className="mb-8 flex flex-col items-center gap-2.5">
      <motion.div
        aria-hidden="true"
        className="flex flex-wrap justify-center gap-1"
        variants={GAUGE_VARIANTS}
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true }}
      >
        {Array.from({ length: capacity }, (_, index) => (
          <motion.i
            key={index}
            variants={SEAT_VARIANTS}
            className={`block size-[9px] ${index < taken ? "bg-seat-taken" : "bg-mustard"}`}
          />
        ))}
      </motion.div>
      {left > 0 && (
        <p className="text-xs font-black text-label uppercase">
          {copy.lead} <span className="text-mustard">{copy.count}</span>{" "}
          {copy.tail}
        </p>
      )}
    </div>
  );
}

const GAUGE_VARIANTS: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: stagger(SEAT_STAGGER) } },
};

const SEAT_VARIANTS: Variants = {
  hidden: { opacity: 0, scaleY: 0.4 },
  visible: { opacity: 1, scaleY: 1, transition: SEAT_TRANSITION },
};
