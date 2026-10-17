type ToastProps = {
  message: string;
  onDismiss: () => void;
  tone?: "error" | "success";
  /** A link (`href`) or, for an in-place retry, a button (`onClick`). */
  action?: ToastAction;
};

export type ToastAction = { label: string; href: string } | { label: string; onClick: () => void };

export function Toast({ message, onDismiss, tone = "error", action }: ToastProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-xl ${
        tone === "error" ? "border-destructive/50" : "border-emerald-500/40"
      }`}
    >
      <span>{message}</span>
      {action &&
        ("href" in action ? (
          <a href={action.href} className="shrink-0 font-bold text-primary underline-offset-4 hover:underline">
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="shrink-0 font-bold text-primary underline-offset-4 hover:underline"
          >
            {action.label}
          </button>
        ))}
      <button type="button" onClick={onDismiss} className="shrink-0 font-semibold text-primary">
        Dismiss
      </button>
    </div>
  );
}
