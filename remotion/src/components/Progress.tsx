import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "../theme";

/** Thin brass seam across the bottom — a quiet sense of "how far in are we". */
export const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(250,248,243,0.09)" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${p * 100}%`,
          background: `linear-gradient(90deg, ${C.brass}, ${C.brassLight})`,
          boxShadow: `0 0 14px ${C.brassGlow}`,
        }}
      />
    </div>
  );
};
