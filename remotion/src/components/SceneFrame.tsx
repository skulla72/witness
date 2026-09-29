import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Phone, type PhoneProps } from "./Phone";
import { Spotlight, type SpotlightProps } from "./Spotlight";
import { Narration } from "./Narration";
import { PHONE_H, PHONE_W } from "../theme";

export const PHONE_X = 452;

/**
 * The repeating layout for every walkthrough beat: narration on the left,
 * the phone on the right, and an optional circled highlight on the phone.
 * A slow camera drift runs for the whole beat so nothing ever sits still.
 */
export const SceneFrame: React.FC<{
  eyebrow: string;
  line: string;
  sub?: string;
  phone: PhoneProps;
  spotlight?: Omit<SpotlightProps, "offsetX" | "offsetY">;
  narrationStart?: number;
}> = ({ eyebrow, line, sub, phone, spotlight, narrationStart = 10 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = phone.dur ?? 200;

  // whole-frame camera move: a slight lateral push plus a scale creep
  const camX = interpolate(frame, [0, dur], [18, -18], { extrapolateRight: "clamp" });
  const camScale = interpolate(frame, [0, dur], [1, 1.035], { extrapolateRight: "clamp" });
  const camY = Math.sin((frame / fps) * 0.32) * 6;

  return (
    <AbsoluteFill
      style={{ transform: `translate(${camX}px, ${camY}px) scale(${camScale})` }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: PHONE_W,
          height: PHONE_H,
          marginLeft: -PHONE_W / 2 + PHONE_X,
          marginTop: -PHONE_H / 2,
        }}
      >
        <Phone {...phone} />
      </div>

      {spotlight && <Spotlight {...spotlight} offsetX={PHONE_X} offsetY={0} />}

      <div
        style={{
          position: "absolute",
          left: 118,
          top: "50%",
          transform: `translateY(-50%) translateX(${-camX * 0.45}px)`,
        }}
      >
        <Narration eyebrow={eyebrow} line={line} sub={sub} start={narrationStart} />
      </div>
    </AbsoluteFill>
  );
};
