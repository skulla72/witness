import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, PHONE_H, PHONE_W, PHONE_SCALE } from "../theme";

/**
 * Dims the whole phone except a circular hole, then draws a hand-sketched
 * brass ring around the target — "this is the thing I'm talking about".
 * Coordinates are given in the app's CSS pixel space (390 x 844).
 */
export type SpotlightProps = {
  cx: number;
  cy: number;
  /** radius in CSS px */
  r: number;
  /** frame within the scene when the highlight begins */
  start?: number;
  /** optional label rendered next to the ring */
  label?: string;
  /** which side the label sits on */
  labelSide?: "top" | "bottom" | "left" | "right";
  /** how dark the surrounding UI gets */
  dim?: number;
  /** phone offset within the frame, matching <Phone x/y> */
  offsetX?: number;
  offsetY?: number;
};

export const Spotlight: React.FC<SpotlightProps> = ({
  cx,
  cy,
  r,
  start = 22,
  label,
  labelSide = "top",
  dim = 0.42,
  offsetX = 0,
  offsetY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - start;

  const px = cx * PHONE_SCALE;
  const py = cy * PHONE_SCALE;
  const pr = r * PHONE_SCALE;

  const reveal = spring({ frame: f, fps, config: { damping: 18, stiffness: 130 } });
  const dimAmt = interpolate(f, [0, 16], [0, dim], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // ring is drawn on, like a marker circling the screen
  const draw = interpolate(f, [4, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const breathe = 1 + Math.sin(f / 13) * 0.022;
  const ringR = pr * interpolate(reveal, [0, 1], [1.5, 1]) * breathe;
  const circumference = 2 * Math.PI * ringR;

  const pulse = interpolate(f % 46, [0, 46], [0, 1]);
  const pulseR = ringR * (1 + pulse * 0.55);
  const pulseOpacity = (1 - pulse) * 0.5 * Math.min(1, Math.max(0, f / 20));

  const labelOpacity = interpolate(f, [26, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelShift = interpolate(f, [26, 44], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelPos: React.CSSProperties =
    labelSide === "top"
      ? { left: px, top: py - ringR - 34, transform: `translate(-50%, -100%) translateY(${labelShift}px)` }
      : labelSide === "bottom"
        ? { left: px, top: py + ringR + 22, transform: `translate(-50%, 0) translateY(${labelShift}px)` }
        : labelSide === "left"
          ? { left: px - ringR - 26, top: py, transform: `translate(-100%, -50%) translateX(${-labelShift}px)` }
          : { left: px + ringR + 26, top: py, transform: `translate(0, -50%) translateX(${labelShift}px)` };

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: PHONE_W,
        height: PHONE_H,
        marginLeft: -PHONE_W / 2 + offsetX,
        marginTop: -PHONE_H / 2 + offsetY,
        pointerEvents: "none",
      }}
    >
      {/* dim everything but the target */}
      <svg
        width={PHONE_W}
        height={PHONE_H}
        style={{ position: "absolute", inset: 0, borderRadius: 38, overflow: "hidden" }}
      >
        <defs>
          <mask id={`hole-${cx}-${cy}`}>
            <rect x={0} y={0} width={PHONE_W} height={PHONE_H} fill="white" />
            <circle cx={px} cy={py} r={ringR * 0.98} fill="black" />
          </mask>
          <radialGradient id={`glow-${cx}-${cy}`}>
            <stop offset="68%" stopColor={C.brassLight} stopOpacity="0" />
            <stop offset="100%" stopColor={C.brassLight} stopOpacity="0.2" />
          </radialGradient>
        </defs>

        <rect
          x={0}
          y={0}
          width={PHONE_W}
          height={PHONE_H}
          fill="#07090d"
          opacity={dimAmt}
          mask={`url(#hole-${cx}-${cy})`}
        />

        {/* warm halo inside the hole */}
        <circle cx={px} cy={py} r={ringR} fill={`url(#glow-${cx}-${cy})`} opacity={dimAmt} />

        {/* expanding pulse */}
        <circle
          cx={px}
          cy={py}
          r={pulseR}
          fill="none"
          stroke={C.brassLight}
          strokeWidth={2}
          opacity={pulseOpacity}
        />

        {/* the drawn-on ring */}
        <circle
          cx={px}
          cy={py}
          r={ringR}
          fill="none"
          stroke={C.brassLight}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - draw)}
          transform={`rotate(-96 ${px} ${py})`}
        />
      </svg>

      {label && (
        <div
          style={{
            position: "absolute",
            ...labelPos,
            opacity: labelOpacity,
            whiteSpace: "nowrap",
            fontFamily: "var(--body-font)",
            fontSize: 21,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.brassLight,
            background: "rgba(9,12,17,0.82)",
            border: `1px solid rgba(217,164,95,0.4)`,
            borderRadius: 999,
            padding: "9px 18px",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
