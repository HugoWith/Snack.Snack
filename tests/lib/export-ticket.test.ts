import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportTicketPng } from "../../src/lib/export-ticket";

const toCanvas = vi.hoisted(() => vi.fn());
const toPng = vi.hoisted(() => vi.fn());
vi.mock("html-to-image", () => ({ toCanvas, toPng }));

const PNG = new Blob(["png"], { type: "image/png" });

const fakeCanvas = (blob: Blob | null = PNG) => ({
  toBlob: vi.fn((callback: (blob: Blob | null) => void, _type?: string) =>
    callback(blob),
  ),
  toDataURL: vi.fn(),
});

const setup = (canvases = [fakeCanvas(), fakeCanvas()]) => {
  for (const canvas of canvases) toCanvas.mockResolvedValueOnce(canvas);
  const link = { href: "", download: "", click: vi.fn() };
  vi.stubGlobal("document", {
    fonts: { ready: Promise.resolve() },
    createElement: vi.fn(() => link),
  });
  const createObjectURL = vi
    .spyOn(URL, "createObjectURL")
    .mockReturnValue("blob:ticket");
  const revokeObjectURL = vi
    .spyOn(URL, "revokeObjectURL")
    .mockImplementation(() => {});
  return { canvases, link, createObjectURL, revokeObjectURL };
};

const NODE = {} as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  toCanvas.mockReset();
});

describe("exportTicketPng", () => {
  it("captures twice and saves the second capture only", async () => {
    const { canvases } = setup();

    await exportTicketPng(NODE, "billet.png");

    expect(toCanvas).toHaveBeenCalledTimes(2);
    for (const call of toCanvas.mock.calls)
      expect(call).toEqual([
        NODE,
        { canvasWidth: 1080, canvasHeight: 1920, pixelRatio: 1 },
      ]);
    expect(canvases[0].toBlob).not.toHaveBeenCalled();
    expect(canvases[1].toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/png",
    );
  });

  it("downloads the PNG through a blob URL, never a data URL", async () => {
    const { canvases, link, createObjectURL, revokeObjectURL } = setup();

    await exportTicketPng(NODE, "snack-snack-billet-07.png");

    expect(createObjectURL).toHaveBeenCalledWith(PNG);
    expect(link).toMatchObject({
      href: "blob:ticket",
      download: "snack-snack-billet-07.png",
    });
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(toPng).not.toHaveBeenCalled();
    for (const canvas of canvases)
      expect(canvas.toDataURL).not.toHaveBeenCalled();

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:ticket");
  });

  it("still saves the ticket when the warm-up capture fails", async () => {
    const saved = fakeCanvas();
    toCanvas.mockRejectedValueOnce(new Error("font load failed"));
    const { link } = setup([saved]);

    await exportTicketPng(NODE, "billet.png");

    expect(toCanvas).toHaveBeenCalledTimes(2);
    expect(saved.toBlob).toHaveBeenCalledTimes(1);
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it("fails when the canvas gives no PNG", async () => {
    const { link } = setup([fakeCanvas(), fakeCanvas(null)]);

    await expect(exportTicketPng(NODE, "billet.png")).rejects.toThrow();
    expect(link.click).not.toHaveBeenCalled();
  });
});
