export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
      {message}
      <button type="button" onClick={onDismiss} className="ml-3 underline">
        Dismiss
      </button>
    </div>
  );
}