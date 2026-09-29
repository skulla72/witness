import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import { Backdrop } from "./components/Backdrop";
import { Progress } from "./components/Progress";
import { Watermark } from "./components/Watermark";
import { SceneFrame } from "./components/SceneFrame";
import { Title } from "./scenes/Title";
import { Outro } from "./scenes/Outro";
import { DISPLAY_FONT, BODY_FONT } from "./fonts";
import { beatFrames, totalFrames, TRANSITION, LEAD, FPS } from "./timing";

/** Tab bar centers, measured from the live app at 390px wide. */
const TAB = {
  prayer: { cx: 56, cy: 792 },
  gratitude: { cx: 125, cy: 796 },
  share: { cx: 195, cy: 795 },
  walk: { cx: 265, cy: 796 },
  you: { cx: 334, cy: 796 },
};

type Beat = {
  id: string;
  render: (dur: number) => React.ReactNode;
};

const beats: Beat[] = [
  { id: "title", render: () => <Title /> },

  {
    id: "prayer",
    render: (dur) => (
      <SceneFrame
        eyebrow="The Prayer tab"
        line="Start with the ask."
        sub="Home is a quiet feed of prayers from your circle — no ads, no algorithm, no endless scroll."
        phone={{ shot: "home", dur, scrollFrom: 0, scrollTo: 240, zoom: 1.07 }}
        spotlight={{ ...TAB.prayer, r: 50, label: "Prayer", start: 26 }}
      />
    ),
  },

  {
    id: "askanswer",
    render: (dur) => (
      <SceneFrame
        eyebrow="Ask → Answer"
        line="Every prayer has two halves."
        sub="The Ask, then the Answer — recorded later, linked forever. That pairing is the whole product."
        phone={{ shot: "home-feed", dur, scrollFrom: 60, scrollTo: 760, zoom: 1.04 }}
      />
    ),
  },

  {
    id: "answered",
    render: (dur) => (
      <SceneFrame
        eyebrow={'The "He Answered" Wall'}
        line="Only answers. Never asks."
        sub="A public wall of prayers that turned into praise — proof, for anyone still waiting."
        phone={{ shot: "answered", dur, scrollFrom: 0, scrollTo: 520, zoom: 1.05 }}
      />
    ),
  },

  {
    id: "record",
    render: (dur) => (
      <SceneFrame
        eyebrow="The Share button"
        line="Speak it. Don't perfect it."
        sub="Ninety seconds of video, a voice note, or a few typed words. You choose who sees it — you, your circle, your church, or everyone."
        phone={{ shot: "record", dur, zoom: 1.09, chrome: false }}
        spotlight={{ ...TAB.share, r: 52, label: "Share", start: 26 }}
      />
    ),
  },

  {
    id: "gratitude",
    render: (dur) => (
      <SceneFrame
        eyebrow="The Gratitude tab"
        line="Notice the small mercies."
        sub="A separate rhythm from asking. Lighter, warmer, one thank-you a day."
        phone={{ shot: "gratitude", dur, scrollFrom: 0, scrollTo: 600, zoom: 1.04 }}
        spotlight={{ ...TAB.gratitude, r: 50, label: "Gratitude", start: 24 }}
      />
    ),
  },

  {
    id: "walk",
    render: (dur) => (
      <SceneFrame
        eyebrow="The Walk With tab"
        line="Nobody carries it alone."
        sub="Small vetted circles for the hard seasons — grief, illness, addiction, waiting. Facilitated, not free-for-all."
        phone={{ shot: "walk", dur, scrollFrom: 0, scrollTo: 440, zoom: 1.04 }}
        spotlight={{ ...TAB.walk, r: 52, label: "Walk With", start: 24 }}
      />
    ),
  },

  {
    id: "sit",
    render: (dur) => (
      <SceneFrame
        eyebrow="Sit with someone"
        line="Presence, without words."
        sub="Open a candle next to a stranger's storm. No chat, no comments. Just being there counts."
        phone={{ shot: "sit", dur, zoom: 1.1 }}
      />
    ),
  },

  {
    id: "you",
    render: (dur) => (
      <SceneFrame
        eyebrow="The You tab"
        line="Your walk, kept quietly."
        sub="Your journal, your circle, your giving — all in one reflective place, private by default."
        phone={{ shot: "profile", dur, scrollFrom: 0, scrollTo: 520, zoom: 1.04 }}
        spotlight={{ ...TAB.you, r: 48, label: "You", start: 24 }}
      />
    ),
  },

  {
    id: "ledger",
    render: (dur) => (
      <SceneFrame
        eyebrow="The Faithfulness Ledger"
        line="Every prayer brought. Every answer marked."
        sub="A running record of what you asked and what came back. Yours to keep."
        phone={{ shot: "ledger", dur, scrollFrom: 0, scrollTo: 470, zoom: 1.04 }}
      />
    ),
  },

  { id: "outro", render: () => <Outro /> },
];

export const BEAT_IDS = beats.map((b) => b.id);
export const TOTAL_FRAMES = totalFrames(BEAT_IDS);

export const Walkthrough: React.FC = () => {
  return (
    <AbsoluteFill
      style={
        {
          "--display-font": DISPLAY_FONT,
          "--body-font": BODY_FONT,
          backgroundColor: "#0c1118",
        } as React.CSSProperties
      }
    >
      <Backdrop />

      <TransitionSeries>
        {beats.map((b, i) => {
          const d = beatFrames(b.id);
          return (
            <React.Fragment key={b.id}>
              <TransitionSeries.Sequence durationInFrames={d}>
                {b.render(d)}
                <Sequence from={Math.round(LEAD * FPS)}>
                  <Audio src={staticFile(`audio/${b.id}.mp3`)} />
                </Sequence>
              </TransitionSeries.Sequence>
              {i < beats.length - 1 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      <Watermark />
      <Progress />
    </AbsoluteFill>
  );
};
