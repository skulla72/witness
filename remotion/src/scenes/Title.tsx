import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C } from "../theme";

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 200, mass: 1.1 } });
  const scale = interpolate(s, [0, 1], [1.14, 1]);

  const ruleW = interpolate(frame, [18, 54], [0, 320], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const subOpacity = interpolate(frame, [34, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outOpacity = interpolate(frame, [96, 118], [1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: outOpacity }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--body-font)",
            fontSize: 21,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: C.brassLight,
            opacity: s,
          }}
        >
          A walkthrough
        </p>
        <h1
          style={{
            margin: "26px 0 0",
            fontFamily: "var(--display-font)",
            fontWeight: 400,
            fontSize: 148,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: C.paper,
          }}
        >
          Witness
          <span style={{ color: C.brass }}>.</span>
        </h1>
        <div
          style={{
            width: ruleW,
            height: 2,
            margin: "40px auto 0",
            background: `linear-gradient(90deg, transparent, ${C.brass}, transparent)`,
          }}
        />
        <p
          style={{
            margin: "38px 0 0",
            fontFamily: "var(--display-font)",
            fontSize: 42,
            fontStyle: "italic",
            fontWeight: 300,
            color: "rgba(250,248,243,0.8)",
            opacity: subOpacity,
          }}
        >
          Bring the ask. Witness the answer.
        </p>
      </div>
    </AbsoluteFill>
  );
};
