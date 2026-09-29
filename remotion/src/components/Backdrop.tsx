import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "../theme";

/**
 * Persistent atmospheric layer: slow drifting brass light over deep ink.
 * Spans the whole video so scenes feel like one continuous piece.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;

  const driftX = Math.sin(p * Math.PI * 2) * 90;
  const driftY = Math.cos(p * Math.PI * 1.4) * 60;
  const driftX2 = Math.cos(p * Math.PI * 1.8) * 120;

  return (
    <AbsoluteFill style={{ backgroundColor: C.inkDeep, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${52 + driftX / 20}% ${38 + driftY / 30}%, rgba(183,129,63,0.22), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 620px at ${18 + driftX2 / 24}% 82%, rgba(217,164,95,0.13), transparent 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(160deg, rgba(20,27,38,0.55) 0%, rgba(12,17,24,0.1) 45%, rgba(12,17,24,0.8) 100%)",
        }}
      />
      {/* paper grain */}
      <AbsoluteFill
        style={{
          opacity: 0.035,
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, #fff 0 1px, transparent 1px 4px)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(1400px 900px at 50% 50%, transparent 40%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      {/* opening + closing dip so the piece breathes */}
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: interpolate(
            frame,
            [0, 14, durationInFrames - 26, durationInFrames],
            [1, 0, 0, 0.9],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          ),
        }}
      />
    </AbsoluteFill>
  );
};
