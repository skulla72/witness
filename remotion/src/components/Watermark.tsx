import React from "react";
import { Img, staticFile } from "remotion";
import { C } from "../theme";

export const Watermark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 74,
      top: 58,
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: "var(--display-font)",
      fontSize: 30,
      color: "rgba(250,248,243,0.72)",
      letterSpacing: "-0.01em",
    }}
  >
    <Img src={staticFile("brand/witness-mark.png")} style={{ width: 42, height: 42, borderRadius: 9 }} />
    Witness
  </div>
);
