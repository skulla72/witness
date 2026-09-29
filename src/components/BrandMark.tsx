import witnessMark from "@/assets/witness-mark.png";

type BrandMarkProps = {
  className?: string;
};

/**
 * The gold flame in its ring, on its own — no navy tile. The installed phone
 * icon keeps its padded square; on the page the mark sits directly on the
 * paper (or the dark landing), so nothing crops it and the flame reads clean.
 */
export function BrandMark({ className = "h-9 w-9" }: BrandMarkProps) {
  return (
    <img
      src={witnessMark}
      alt=""
      aria-hidden="true"
      width={678}
      height={678}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
