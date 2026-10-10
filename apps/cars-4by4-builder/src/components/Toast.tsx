export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/50 bg-card px-4 py-3 text-sm shadow-xl"
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 font-semibold text-primary">
        Dismiss
      </button>
    </div>
  );
}
