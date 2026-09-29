import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C } from "../theme";

/**
 * The spoken line, rendered as kinetic type on the left side of the frame.
 * Words rise in on a stagger so the eye reads at narration pace.
 */
export const Narration: React.FC<{
  eyebrow?: string;
  line: string;
  sub?: string;
  start?: number;
  align?: "left" | "center";
}> = ({ eyebrow, line, sub, start = 8, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - start;
  const words = line.split(" ");

  const eyebrowOpacity = interpolate(f, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ruleW = interpolate(f, [4, 30], [0, 58], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const subOpacity = interpolate(f, [words.length * 2.4 + 16, words.length * 2.4 + 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subShift = interpolate(f, [words.length * 2.4 + 16, words.length * 2.4 + 36], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        maxWidth: 740,
        textAlign: align,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      {eyebrow && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: eyebrowOpacity,
            marginBottom: 22,
          }}
        >
          <div style={{ width: ruleW, height: 2, background: C.brass }} />
          <span
            style={{
              fontFamily: "var(--body-font)",
              fontSize: 20,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: C.brassLight,
            }}
          >
            {eyebrow}
          </span>
        </div>
      )}

      <h2
        style={{
          margin: 0,
          fontFamily: "var(--display-font)",
          fontWeight: 400,
          fontSize: 66,
          lineHeight: 1.1,
          letterSpacing: "-0.015em",
          color: C.paper,
          display: "flex",
          flexWrap: "wrap",
          gap: "0 0.28em",
          justifyContent: align === "center" ? "center" : "flex-start",
        }}
      >
        {words.map((w, i) => {
          const s = spring({
            frame: f - i * 2.4,
            fps,
            config: { damping: 200, mass: 0.55 },
          });
          return (
            <span
              key={`${w}-${i}`}
              style={{
                display: "inline-block",
                opacity: s,
                transform: `translateY(${(1 - s) * 26}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </h2>

      {sub && (
        <p
          style={{
            margin: "26px 0 0",
            fontFamily: "var(--body-font)",
            fontSize: 27,
            lineHeight: 1.55,
            color: C.mute,
            maxWidth: 560,
            opacity: subOpacity,
            transform: `translateY(${subShift}px)`,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
};
