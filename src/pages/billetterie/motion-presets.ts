import type { Transition } from "motion/react";

const EASE_OUT: Transition["ease"] = [0.2, 0.9, 0.2, 1];

export const HERO_LINE_TRANSITION: Transition = {
  duration: 0.7,
  ease: EASE_OUT,
};
export const HERO_LINE_STAGGER = 0.15;
// Longest wait for the display font and hero photo before the lines rise.
export const HERO_READY_TIMEOUT_MS = 1000;

export const SEAT_TRANSITION: Transition = { duration: 0.25, ease: EASE_OUT };
export const SEAT_STAGGER = 0.04;

export const AMOUNT_TICK_TRANSITION: Transition = {
  duration: 0.25,
  ease: EASE_OUT,
};

// The resting shadow offset matches the button's `translate-1.5` plate (6px).
export const PRESS_SHADOW_OFFSET = 6;
export const PRESS_HOVER_LIFT = 2;
export const PRESS_TRANSITION: Transition = { duration: 0.12, ease: "easeOut" };
