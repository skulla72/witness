import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, PHONE_H, PHONE_W, PHONE_SCALE } from "../theme";

/** Chrome layer sizes in CSS px, measured from the live app. */
const HEADER_H = 70;
const NAV_H = 93;
const NAV_TOP = 751;

export type PhoneProps = {
  /** file name inside public/shots, without extension */
  shot: string;
  /** CSS px of vertical scroll at scene start */
  scrollFrom?: number;
  /** CSS px of vertical scroll at scene end */
  scrollTo?: number;
  /** frame the scroll begins */
  scrollStart?: number;
  /** frames the scroll takes */
  scrollDuration?: number;
  /** gentle push-in over the scene */
  zoom?: number;
  /** the /record screen hides the app's header + tab bar */
  chrome?: boolean;
  /** total frames of the beat — motion is stretched across the whole line */
  dur?: number;
  x?: number;
  y?: number;
};

/**
 * A device-framed screenshot. The captured page is taller than the viewport,
 * so `scrollFrom`/`scrollTo` pan it like a real thumb-scroll, while the app's
 * sticky header and floating tab bar stay pinned on top — same as on device.
 */
export const Phone: React.FC<PhoneProps> = ({
  shot,
  scrollFrom = 0,
  scrollTo = 0,
  scrollStart = 22,
  scrollDuration,
  zoom = 1.03,
  chrome = true,
  dur = 200,
  x = 0,
  y = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Motion is stretched across the whole beat so the shot is never frozen.
  const span = scrollDuration ?? Math.max(40, dur - scrollStart - 26);

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.9 } });
  const scale =
    interpolate(enter, [0, 1], [0.9, 1]) *
    interpolate(frame, [0, dur], [1, zoom], { extrapolateRight: "clamp" });
  const lift = interpolate(enter, [0, 1], [46, 0]);
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  // a very slow float, so even a still screen breathes like handheld footage
  const float = Math.sin((frame / fps) * 0.55) * 5;
  const tilt = Math.sin((frame / fps) * 0.4 + 1) * 0.35;

  const scroll = interpolate(frame, [scrollStart, scrollStart + span], [scrollFrom, scrollTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t),
  });

  return (
    <div
      style={{
        width: PHONE_W,
        height: PHONE_H,
        transform: `translate(${x}px, ${y + lift + float}px) rotate(${tilt}deg) scale(${scale})`,
        opacity,
        borderRadius: 46,
        padding: 9,
        background: "linear-gradient(155deg, #33261a 0%, #14100c 55%, #2a1f15 100%)",
        boxShadow: `0 50px 120px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(217,164,95,0.28), 0 0 90px -20px ${C.brassGlow}`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 38,
          overflow: "hidden",
          backgroundColor: C.paper,
          position: "relative",
        }}
      >
        {/* scrolling page content */}
        <Img
          src={staticFile(`shots/${shot}.png`)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${-scroll * PHONE_SCALE}px)`,
          }}
        />

        {chrome && (
          <>
            {/* sticky header */}
            <Img
              src={staticFile("shots/chrome-header.png")}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: HEADER_H * PHONE_SCALE,
              }}
            />
            {/* floating tab bar */}
            <Img
              src={staticFile("shots/chrome-nav.png")}
              style={{
                position: "absolute",
                top: NAV_TOP * PHONE_SCALE,
                left: 0,
                width: "100%",
                height: NAV_H * PHONE_SCALE,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};
