type StatusVariant = "success" | "error" | "info";

const variantStyles: Record<StatusVariant, string> = {
  success: "border border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border border-red-200 bg-red-50 text-red-900",
  info: "border border-sky-200 bg-sky-50 text-sky-900",
};

export function StatusMessage({
  variant,
  message,
  testId,
  className = "",
}: {
  variant: StatusVariant;
  message: string;
  testId?: string;
  className?: string;
}) {
  return (
    <p data-testid={testId} role="status" className={`rounded-lg px-3 py-2 text-sm ${variantStyles[variant]} ${className}`}>
      {message}
    </p>
  );
}
