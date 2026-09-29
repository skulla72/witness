import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareTourButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/tour` : "/tour";
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1 text-[11.5px] uppercase tracking-[0.2em] text-brass hover:text-brass-light transition-colors ${className}`}
      aria-label="Copy a link to the walkthrough tour"
    >
      {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      {copied ? "Link copied" : "Share the tour"}
    </button>
  );
}
