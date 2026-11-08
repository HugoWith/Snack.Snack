import type { ReactNode } from "react";
import { ReceiptRule } from "./ReceiptRule";

interface ReceiptHeaderProps {
  children: ReactNode;
}

export function ReceiptHeader({ children }: ReceiptHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center uppercase">
        <p className="font-display text-[22px] leading-none tracking-[-0.05em] text-ticket-value">
          Snack Snack
        </p>
        {children}
      </div>
      <ReceiptRule variant="dashed" />
    </div>
  );
}
