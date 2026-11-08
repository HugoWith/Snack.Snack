interface ReceiptRuleProps {
  variant: keyof typeof VARIANT_CLASSES;
}

export function ReceiptRule({ variant }: ReceiptRuleProps) {
  return <div aria-hidden="true" className={VARIANT_CLASSES[variant]} />;
}

const VARIANT_CLASSES = {
  dashed: "border-t-[1.5px] border-dashed border-paper-shade",
  double: "h-[5px] border-y-[1.5px] border-ticket-ink",
} as const;
