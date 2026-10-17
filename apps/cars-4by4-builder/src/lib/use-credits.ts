import { useCallback, useEffect, useState } from "react";
import { getCredits } from "@/lib/credits";
import type { CreditState } from "@/lib/credit-packs";

const CHANGED = "cars:credits-changed";

/** Tells every mounted useCredits() to refetch — after a purchase or a render attempt. */
export function notifyCreditsChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * Client-side credit state: undefined = loading or disabled, null = no session.
 * Fetched after mount only, so SSR and hydration render the same (nothing).
 * Refetches when `sessionKey` changes or notifyCreditsChanged() fires.
 */
export function useCredits(enabled: boolean, sessionKey?: string): CreditState | null | undefined {
  const [credits, setCredits] = useState<CreditState | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setCredits(await getCredits());
    } catch {
      setCredits(undefined);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCredits(undefined);
      return;
    }
    const onChange = () => void refresh();
    onChange();
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [enabled, sessionKey, refresh]);

  return credits;
}
