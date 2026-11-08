const TICKET_WIDTH = 1080;
const TICKET_HEIGHT = 1920;
// iOS Safari reads the blob after the click returns: keep its URL alive a bit.
const REVOKE_DELAY_MS = 60_000;

export const exportTicketPng = async (
  node: HTMLElement,
  fileName: string,
): Promise<void> => {
  const [{ toCanvas }] = await Promise.all([
    import("html-to-image"),
    document.fonts.ready,
  ]);
  const options = {
    canvasWidth: TICKET_WIDTH,
    canvasHeight: TICKET_HEIGHT,
    pixelRatio: 1,
  };
  // Safari paints the first capture before the embedded fonts are decoded,
  // so it comes out in the fallback font: throw it away, even if it failed.
  await toCanvas(node, options).catch(() => {});
  const blob = await canvasToPng(await toCanvas(node, options));

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The ticket canvas gave no PNG"));
    }, "image/png");
  });
