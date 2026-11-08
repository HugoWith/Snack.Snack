import type { ReactNode } from "react";

interface StatusMessageProps {
  title: string;
  tone?: "statement" | "text";
  children?: ReactNode;
}

export function StatusMessage({
  title,
  tone = "statement",
  children,
}: StatusMessageProps) {
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <h1 className={TITLE_CLASSES[tone]}>{title}</h1>
      {children}
    </div>
  );
}

const TITLE_CLASSES = {
  statement:
    "font-display text-[30px] leading-none tracking-[-0.035em] text-balance text-mustard uppercase lg:text-7xl",
  text: "max-w-[28ch] text-xl leading-snug font-bold text-balance text-text lg:text-3xl",
} as const;
