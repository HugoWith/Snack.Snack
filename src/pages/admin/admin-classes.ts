export const PANEL_CLASSES = "flex flex-col gap-6 bg-steel-900 p-6 lg:p-8";

export const HEADING_CLASSES =
  "font-display text-2xl leading-none tracking-[-0.035em] text-text uppercase";

export const LABEL_CLASSES =
  "text-[11px] font-bold tracking-[0.06em] text-label uppercase";

export const INPUT_CLASSES =
  "min-h-11 w-full border border-steel-600 bg-ground px-3 text-base font-bold text-text caret-mustard outline-none placeholder:font-medium placeholder:text-steel-400 focus:border-mustard aria-invalid:border-alert autofill:shadow-[inset_0_0_0_100px_var(--ground)] autofill:[-webkit-text-fill-color:var(--text)]";

const BUTTON_BASE =
  "inline-flex min-h-11 cursor-pointer items-center justify-center px-5 text-sm font-black tracking-[0.02em] uppercase transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard disabled:cursor-wait";

export const PRIMARY_BUTTON_CLASSES = `${BUTTON_BASE} bg-mustard text-ink hover:bg-mustard-press active:bg-mustard-press disabled:bg-mustard-press`;

export const SECONDARY_BUTTON_CLASSES = `${BUTTON_BASE} border border-steel-600 text-text hover:border-text active:bg-steel-800`;

export const ROW_ACTION_CLASSES =
  "inline-flex min-h-11 cursor-pointer items-center px-3 text-xs font-black tracking-[0.02em] whitespace-nowrap text-label uppercase underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mustard disabled:cursor-wait disabled:text-steel-400";

export const NOTICE_CLASSES = "text-sm leading-snug font-bold empty:hidden";
