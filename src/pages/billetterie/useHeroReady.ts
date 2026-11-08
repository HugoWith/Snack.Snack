import { useEffect, useState } from "react";
import { whenReady } from "../../lib/when-ready";
import { HERO_READY_TIMEOUT_MS } from "./motion-presets";

// Same photo as the `bg-hero-photo` utility and the preload in index.html.
const HERO_PHOTO_URL = "/img/tablier-chaise.webp";
const HERO_FONT_FAMILY = "Nohemi";

export const useHeroReady = (): boolean => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    whenReady(
      [loadDisplayFont(), decodeImage(HERO_PHOTO_URL)],
      HERO_READY_TIMEOUT_MS,
    ).then(() => {
      if (isCurrent) setIsReady(true);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  return isReady;
};

// Nohemi is declared twice (tokens.css, then index.css with the preloaded
// public URL); CSS uses the last one, so load only that face.
// `document.fonts.load()` would also download the unused duplicate.
const loadDisplayFont = (): Promise<unknown> => {
  const faces = [...document.fonts].filter(
    (face) => face.family.replace(/"/g, "") === HERO_FONT_FAMILY,
  );
  return faces.at(-1)?.load() ?? Promise.resolve();
};

const decodeImage = (src: string): Promise<void> => {
  const image = new Image();
  image.src = src;
  return image.decode();
};
