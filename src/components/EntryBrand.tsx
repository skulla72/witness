import { Link } from "@tanstack/react-router";

export function EntryBrand() {
  return (
    <Link
      to="/"
      aria-label="Witness home"
      className="inline-flex items-center gap-2.5 rounded-sm text-ink no-underline outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
    >
      <img
        src="/icon-192.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
      />
      <span className="font-serif text-[28px] leading-none tracking-[-0.035em]">
        Witness<span className="text-brass">·</span>
      </span>
    </Link>
  );
}
