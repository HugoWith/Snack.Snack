interface FieldErrorProps {
  id: string;
  message?: string;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}

export function FieldError({
  id,
  message,
  tone = "alert",
  className = "",
}: FieldErrorProps) {
  return (
    <p
      id={id}
      className={`text-sm leading-snug font-bold empty:hidden ${TONE_CLASSES[tone]} ${className}`}
    >
      {message}
    </p>
  );
}

const TONE_CLASSES = {
  alert: "text-alert",
  note: "text-ticket-ink",
  ink: "text-ink",
} as const;
