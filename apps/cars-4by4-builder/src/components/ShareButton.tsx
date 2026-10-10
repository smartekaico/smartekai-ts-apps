import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary">
      {copied ? "Link copied" : "Share this build"}
    </button>
  );
}
