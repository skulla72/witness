import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C } from "../theme";

const rhythms = ["Asking", "Thanking", "Walking together"];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: 46, justifyContent: "center", marginBottom: 56 }}>
          {rhythms.map((r, i) => {
            const rs = spring({ frame: frame - i * 9, fps, config: { damping: 200, mass: 0.6 } });
            return (
              <span
                key={r}
                style={{
                  fontFamily: "var(--body-font)",
                  fontSize: 22,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: C.brassLight,
                  opacity: rs,
                  transform: `translateY(${(1 - rs) * 18}px)`,
                }}
              >
                {r}
              </span>
            );
          })}
        </div>

        <h2
          style={{
            margin: 0,
            fontFamily: "var(--display-font)",
            fontWeight: 400,
            fontSize: 86,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: C.paper,
            opacity: s,
            transform: `translateY(${(1 - s) * 22}px)`,
          }}
        >
          Faith, on display.
        </h2>

        <p
          style={{
            margin: "34px 0 0",
            fontFamily: "var(--body-font)",
            fontSize: 28,
            color: C.mute,
            opacity: interpolate(frame, [26, 50], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Record one prayer today. Come back and mark the answer.
        </p>

        <div
          style={{
            margin: "56px auto 0",
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "20px 42px",
            borderRadius: 999,
            border: `1px solid rgba(217,164,95,0.45)`,
            background: "rgba(183,129,63,0.14)",
            fontFamily: "var(--display-font)",
            fontSize: 34,
            color: C.paper,
            opacity: interpolate(frame, [40, 64], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Witness
          <span style={{ color: C.brass }}>·</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
